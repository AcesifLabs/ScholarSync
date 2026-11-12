package com.acesif.scholarsyncbackend.papers.services;

import com.acesif.scholarsyncbackend.commons.config.properties.SearchProperties;
import com.acesif.scholarsyncbackend.commons.exceptions.UpstreamException;
import com.acesif.scholarsyncbackend.integrations.sources.enums.PaperSort;
import com.acesif.scholarsyncbackend.integrations.sources.dtos.SearchFilters;
import com.acesif.scholarsyncbackend.integrations.sources.dtos.SourceRecord;
import com.acesif.scholarsyncbackend.integrations.sources.enums.Source;
import com.acesif.scholarsyncbackend.integrations.sources.openalex.OpenAlexClient;
import com.acesif.scholarsyncbackend.integrations.sources.unpaywall.UnpaywallClient;
import com.acesif.scholarsyncbackend.integrations.sources.utils.PaperKeys;
import com.acesif.scholarsyncbackend.papers.dtos.*;
import com.acesif.scholarsyncbackend.papers.entities.Paper;
import com.acesif.scholarsyncbackend.papers.entities.PaperAuthor;
import com.acesif.scholarsyncbackend.papers.repositories.PaperRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;
import java.util.function.Supplier;
import java.util.stream.Collectors;

/**
 * Papers merged from every source (ADR 0005). Search results come from the search cache or a federated search;
 * each merged record is stored in {@code papers}, which also serves saved items, and is refreshed once it is older
 * than search.paper-ttl. Source calls never run inside a transaction this class opens; writes use short
 * transactions of their own, so a slow source does not hold a database connection.
 */
@Slf4j
@Service
public class PaperService {

  /** Upper bound on offset + limit for paged lists (author search, author papers). */
  public static final int MAX_RESULT_WINDOW = 1000;
  /** Matches no identifier; stands in for an empty IN list. */
  private static final List<String> NONE = List.of("");

  private final FederatedSearchService federated;
  private final SearchCacheService searchCache;
  private final PaperRepository paperRepository;
  private final SearchProperties properties;
  private final UnpaywallClient unpaywall;
  private final OpenAlexClient openAlex;
  /** Its own transaction even inside a caller's, so a failed insert can be retried without poisoning the caller's. */
  private final TransactionTemplate writes;
  /** Concurrent first opens of the same paper share one source lookup. */
  private final Map<String, CompletableFuture<Paper>> inFlight = new ConcurrentHashMap<>();

  public PaperService(FederatedSearchService federated, SearchCacheService searchCache, PaperRepository paperRepository,
                      SearchProperties properties, UnpaywallClient unpaywall, OpenAlexClient openAlex,
                      PlatformTransactionManager transactionManager) {
    this.federated = federated;
    this.searchCache = searchCache;
    this.paperRepository = paperRepository;
    this.properties = properties;
    this.unpaywall = unpaywall;
    this.openAlex = openAlex;
    this.writes = new TransactionTemplate(transactionManager);
    this.writes.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
  }

  public PaperSearchResponse search(SearchFilters filters, PaperSort sort, int offset, int limit) {
    if (filters.yearFrom() != null && filters.yearTo() != null && filters.yearFrom() > filters.yearTo()) {
      throw new IllegalArgumentException("yearFrom must not be after yearTo");
    }
    List<String> ids = searchCache.find(filters.query(), paramsKey(filters, sort), () -> {
      FederatedSearchService.Result result = federated.search(filters, sort);
      List<String> paperIds = save(result.records()).stream().map(Paper::getId).distinct().toList();
      return new SearchCacheService.Loaded(paperIds, result.sourcesOk(), result.complete());
    });
    List<String> page = offset >= ids.size() ? List.of() : ids.subList(offset, Math.min(ids.size(), offset + limit));
    Map<String, Paper> rows = new HashMap<>();
    paperRepository.findAllById(page).forEach(p -> rows.put(p.getId(), p));
    return new PaperSearchResponse(ids.size(), offset, limit,
            page.stream().map(rows::get).filter(Objects::nonNull).map(PaperService::toSummary).toList());
  }

  public AutoCompleteResponse autocomplete(String query) {
    return new AutoCompleteResponse(openAlex.autocomplete(query).stream()
            .map(s -> new AutoCompleteResponse.Matches(s.id(), s.title(), s.hint())).toList());
  }

  /** The paper, refreshed from the sources when stale. A stale copy is served when every source is failing. */
  public PaperDetail getDetail(String paperId, UUID viewerId) {
    Paper paper = findOrFetch(paperId);
    if (paper.getFetchedAt().isBefore(Instant.now().minus(properties.getPaperTtl()))) {
      try {
        SourceRecord fresh = federated.lookup(toRecord(paper));
        if (fresh != null) paper = refresh(paper.getId(), fresh);
      } catch (UpstreamException e) {
        log.warn("Serving stale paper {}: {}", paperId, e.getReason());
      }
    }
    return toDetail(withUnpaywallPdf(paper), viewerId);
  }

  /** Asks Unpaywall (when enabled) for a PDF the other sources did not have. Used by the detail page and the reader. */
  public Paper withUnpaywallPdf(Paper paper) {
    if (paper.getOpenAccessPdfUrl() != null || paper.getUploadedPdfKey() != null || paper.getDoi() == null || !unpaywall.enabled()) {
      return paper;
    }
    String pdf;
    try {
      pdf = unpaywall.pdfUrl(paper.getDoi());
    } catch (UpstreamException e) {
      return paper;
    }
    if (pdf == null) return paper;
    return retried(() -> {
      Paper stored = paperRepository.findById(paper.getId()).orElseThrow();
      if (stored.getOpenAccessPdfUrl() == null) stored.setOpenAccessPdfUrl(pdf);
      stored.setSources(withSource(stored.getSources(), Source.UNPAYWALL));
      return paperRepository.save(stored);
    });
  }

  /**
   * The stored paper with this id (or with the identifier the id names), fetched from the sources the first time.
   * Call it before opening a transaction: a miss calls the sources and then writes in a transaction of its own.
   */
  public Paper findOrFetch(String paperId) {
    Optional<Paper> stored = paperRepository.findById(paperId);
    if (stored.isPresent()) return stored.get();
    SourceRecord known = known(paperId);
    if (known == null) throw notFound(paperId);
    List<Paper> byIdentifier = findByIdentifiers(List.of(known));
    if (!byIdentifier.isEmpty()) return byIdentifier.getFirst();
    CompletableFuture<Paper> mine = new CompletableFuture<>();
    CompletableFuture<Paper> running = inFlight.putIfAbsent(paperId, mine);
    if (running != null) return await(running);
    try {
      SourceRecord fresh = federated.lookup(known);
      if (fresh == null) throw notFound(paperId);
      String id = save(List.of(fresh)).getFirst().getId();
      Paper paper = paperRepository.findById(id).orElseThrow(() -> notFound(paperId));
      mine.complete(paper);
      return paper;
    } catch (RuntimeException e) {
      mine.completeExceptionally(e);
      throw e;
    } finally {
      inFlight.remove(paperId, mine);
    }
  }

  private static <T> T await(CompletableFuture<T> future) {
    try {
      return future.join();
    } catch (CompletionException e) {
      if (e.getCause() instanceof RuntimeException cause) throw cause;
      throw e;
    }
  }

  /** Stored titles by paper id; one query. */
  public Map<String, String> titles(Collection<String> paperIds) {
    Map<String, String> titles = new HashMap<>();
    paperRepository.findAllById(paperIds).forEach(p -> titles.put(p.getId(), p.getTitle()));
    return titles;
  }

  /**
   * The stored id for {@code paperId} or for the identifier it names (an id handed out before the paper had a DOI,
   * an OpenAlex id from an author page); {@code paperId} itself when nothing is stored. Never calls a source.
   */
  public String canonicalId(String paperId) {
    if (paperRepository.existsById(paperId)) return paperId;
    SourceRecord known = known(paperId);
    if (known == null) return paperId;
    List<Paper> found = findByIdentifiers(List.of(known));
    return found.isEmpty() ? paperId : found.getFirst().getId();
  }

  /** Stores {@code records} in one transaction, retried once if a concurrent request inserted the same paper first. */
  public List<Paper> save(List<SourceRecord> records) {
    return retried(() -> upsert(records));
  }

  /** Applies a refreshed record to the paper with this id, never to another row that shares an identifier. */
  private Paper refresh(String paperId, SourceRecord fresh) {
    return retried(() -> {
      Paper paper = paperRepository.findById(paperId).orElseThrow(() -> notFound(paperId));
      Map<String, Paper> owners = owners(List.of(fresh));
      identifierKeys(paper).forEach(k -> owners.put(k, paper));
      apply(paper, fresh, owners);
      paper.setFetchedAt(Instant.now());
      return paperRepository.save(paper);
    });
  }

  private <T> T retried(Supplier<T> work) {
    try {
      return writes.execute(status -> work.get());
    } catch (DataIntegrityViolationException e) {
      return writes.execute(status -> work.get());
    }
  }

  /**
   * One stored paper per record, in order. A record joins the existing row that shares any identifier with it, so
   * ids never change once assigned; identifiers already owned by another row are not copied over.
   */
  private List<Paper> upsert(List<SourceRecord> records) {
    Instant now = Instant.now();
    Instant staleBefore = now.minus(properties.getPaperTtl());
    Map<String, Paper> owners = owners(records);
    Map<String, Paper> byId = new HashMap<>();
    paperRepository.findAllById(records.stream().map(PaperKeys::idFor).filter(Objects::nonNull).toList())
            .forEach(p -> byId.put(p.getId(), p));
    List<Paper> out = new ArrayList<>();
    for (SourceRecord r : records) {
      String id = PaperKeys.idFor(r);
      if (id == null) continue;
      Paper paper = identifierKeys(r.doi(), r.arxivId(), r.pmid(), r.openalexId()).stream()
              .map(owners::get).filter(Objects::nonNull).findFirst()
              .orElseGet(() -> byId.computeIfAbsent(id, k -> Paper.builder().id(k).title("(untitled)").build()));
      // An unchanged row that is still fresh is left alone, so dirty checking issues no UPDATE for it
      if (apply(paper, r, owners) || paper.getFetchedAt() == null || paper.getFetchedAt().isBefore(staleBefore)) {
        paper.setFetchedAt(now);
      }
      identifierKeys(paper).forEach(k -> owners.put(k, paper));
      out.add(paper);
    }
    paperRepository.saveAll(new LinkedHashSet<>(out));
    paperRepository.flush();
    return out;
  }

  /** Stored papers indexed by every identifier they hold. */
  private Map<String, Paper> owners(List<SourceRecord> records) {
    Map<String, Paper> owners = new HashMap<>();
    for (Paper p : findByIdentifiers(records)) identifierKeys(p).forEach(k -> owners.put(k, p));
    return owners;
  }

  private List<Paper> findByIdentifiers(List<SourceRecord> records) {
    return paperRepository.findByAnyIdentifier(values(records, SourceRecord::doi), values(records, SourceRecord::arxivId),
            values(records, SourceRecord::pmid), values(records, SourceRecord::openalexId));
  }

  /** What a paper id names, as a record carrying that one identifier; null if it is not a paper id. */
  private static SourceRecord known(String paperId) {
    PaperKeys.Key key = PaperKeys.parse(paperId);
    if (key == null) return null;
    return switch (key.type()) {
      case DOI -> SourceRecord.builder().doi(key.value()).build();
      case ARXIV -> SourceRecord.builder().arxivId(key.value()).build();
      case PMID -> SourceRecord.builder().pmid(key.value()).build();
      case OPENALEX -> SourceRecord.builder().openalexId(key.value()).build();
    };
  }

  private static List<String> values(List<SourceRecord> records, Function<SourceRecord, String> field) {
    List<String> values = records.stream().map(field).filter(Objects::nonNull).distinct().toList();
    return values.isEmpty() ? NONE : values;
  }

  private static List<String> identifierKeys(Paper p) {
    return identifierKeys(p.getDoi(), p.getArxivId(), p.getPmid(), p.getOpenalexId());
  }

  private static List<String> identifierKeys(String doi, String arxivId, String pmid, String openalexId) {
    List<String> keys = new ArrayList<>(4);
    if (doi != null) keys.add(PaperKeys.Type.DOI.key(doi));
    if (arxivId != null) keys.add(PaperKeys.Type.ARXIV.key(arxivId));
    if (pmid != null) keys.add(PaperKeys.Type.PMID.key(pmid));
    if (openalexId != null) keys.add(PaperKeys.Type.OPENALEX.key(openalexId));
    return keys;
  }

  /**
   * New values win; a value the record lacks keeps the stored one. Counts only grow; abstracts keep the longer text.
   * The PDF URL is set once and kept: annotations are positioned on that document, so a later answer from another
   * source must not swap it. Returns whether any stored value changed; fetchedAt is the caller's.
   */
  private static boolean apply(Paper p, SourceRecord r, Map<String, Paper> owners) {
    List<Object> before = snapshot(p);
    if (r.title() != null) p.setTitle(r.title());
    if (r.authors() != null && !r.authors().isEmpty()) {
      p.setAuthors(new ArrayList<>(r.authors().stream().map(a -> new PaperAuthor(a.id(), a.name())).toList()));
    }
    if (r.year() != null) p.setYear(r.year());
    if (r.venue() != null) p.setVenue(r.venue());
    if (r.abstractText() != null && (p.getAbstractText() == null || r.abstractText().length() > p.getAbstractText().length())) {
      p.setAbstractText(r.abstractText());
    }
    p.setCitationCount(max(p.getCitationCount(), r.citationCount()));
    p.setReferenceCount(max(p.getReferenceCount(), r.referenceCount()));
    p.setFieldsOfStudy(union(p.getFieldsOfStudy(), r.fieldsOfStudy()));
    p.setPublicationTypes(union(p.getPublicationTypes(), r.publicationTypes()));
    if (p.getOpenAccessPdfUrl() == null && r.pdfUrl() != null) p.setOpenAccessPdfUrl(r.pdfUrl());
    if (p.getDoi() == null && claimable(owners, PaperKeys.Type.DOI, r.doi(), p)) p.setDoi(r.doi());
    if (p.getArxivId() == null && claimable(owners, PaperKeys.Type.ARXIV, r.arxivId(), p)) p.setArxivId(r.arxivId());
    if (p.getPmid() == null && claimable(owners, PaperKeys.Type.PMID, r.pmid(), p)) p.setPmid(r.pmid());
    if (p.getOpenalexId() == null && claimable(owners, PaperKeys.Type.OPENALEX, r.openalexId(), p)) p.setOpenalexId(r.openalexId());
    List<String> sources = p.getSources();
    if (r.sources() != null) for (Source s : r.sources()) sources = withSource(sources, s);
    p.setSources(sources);
    return !before.equals(snapshot(p));
  }

  private static List<Object> snapshot(Paper p) {
    return Arrays.asList(p.getTitle(), p.getAuthors(), p.getYear(), p.getVenue(), p.getAbstractText(), p.getCitationCount(),
            p.getReferenceCount(), p.getFieldsOfStudy(), p.getPublicationTypes(), p.getOpenAccessPdfUrl(), p.getDoi(),
            p.getArxivId(), p.getPmid(), p.getOpenalexId(), p.getSources());
  }

  /** True when {@code p} may take this identifier: it has a value and no other stored paper holds it. */
  private static boolean claimable(Map<String, Paper> owners, PaperKeys.Type type, String value, Paper p) {
    if (value == null) return false;
    Paper owner = owners.get(type.key(value));
    return owner == null || owner == p;
  }

  private static List<String> withSource(List<String> sources, Source source) {
    TreeSet<String> all = new TreeSet<>(sources);
    all.add(source.key);
    return new ArrayList<>(all);
  }

  private static Integer max(Integer a, Integer b) {
    if (a == null) return b;
    if (b == null) return a;
    return Math.max(a, b);
  }

  private static List<String> union(List<String> stored, List<String> fresh) {
    LinkedHashSet<String> values = new LinkedHashSet<>(stored == null ? List.of() : stored);
    if (fresh != null) values.addAll(fresh);
    return new ArrayList<>(values);
  }

  /** The stored paper as a record, so a refresh can look it up by every identifier it has. */
  private static SourceRecord toRecord(Paper p) {
    return SourceRecord.builder().doi(p.getDoi()).arxivId(p.getArxivId()).pmid(p.getPmid()).openalexId(p.getOpenalexId()).build();
  }

  /**
   * Filters and sort as one stable string; the query text is matched separately. Each value is URL-encoded so no
   * value can contain a separator and collide with a different filter set.
   */
  static String paramsKey(SearchFilters f, PaperSort sort) {
    return "sort=" + sort.name().toLowerCase(Locale.ROOT)
            + ";year=" + Objects.toString(f.yearFrom(), "") + "-" + Objects.toString(f.yearTo(), "")
            + ";fields=" + encoded(f.fieldsOfStudy())
            + ";venues=" + encoded(f.venues())
            + ";types=" + encoded(f.publicationTypes())
            + ";minCitations=" + Objects.toString(f.minCitations(), "")
            + ";openAccess=" + f.openAccessOnly();
  }

  private static String encoded(List<String> values) {
    return values.stream().map(v -> URLEncoder.encode(v, StandardCharsets.UTF_8)).collect(Collectors.joining(","));
  }

  public static PaperSummary toSummary(Paper p) {
    return new PaperSummary(p.getId(), p.getTitle(), p.getAuthors(), p.getYear(), p.getVenue(), p.getAbstractText(),
            p.getCitationCount(), p.getOpenAccessPdfUrl() != null, p.getFieldsOfStudy(), p.getPublicationTypes(),
            p.getSources(), p.getOpenAccessPdfUrl() != null || p.getUploadedPdfKey() != null);
  }

  /** Summary of a source record that is not stored (author paper lists); its id still opens the paper. */
  public static PaperSummary toSummary(SourceRecord r) {
    return new PaperSummary(PaperKeys.idFor(r), r.title(), authors(r), r.year(), r.venue(),
            r.abstractText(), r.citationCount(), r.pdfUrl() != null,
            r.fieldsOfStudy() == null ? List.of() : r.fieldsOfStudy(), r.publicationTypes() == null ? List.of() : r.publicationTypes(),
            r.sources() == null ? List.of() : r.sources().stream().map(s -> s.key).toList(), r.pdfUrl() != null);
  }

  public static List<PaperAuthor> authors(SourceRecord r) {
    return r.authors() == null ? List.of() : r.authors().stream().map(a -> new PaperAuthor(a.id(), a.name())).toList();
  }

  public static PaperDetail toDetail(Paper p, UUID viewerId) {
    Map<String, Object> externalIds = new LinkedHashMap<>();
    if (p.getDoi() != null) externalIds.put(PaperDetail.ID_DOI, p.getDoi());
    if (p.getArxivId() != null) externalIds.put(PaperDetail.ID_ARXIV, p.getArxivId());
    if (p.getPmid() != null) externalIds.put(PaperDetail.ID_PUBMED, p.getPmid());
    if (p.getOpenalexId() != null) externalIds.put(PaperDetail.ID_OPENALEX, p.getOpenalexId());
    return new PaperDetail(p.getId(), p.getTitle(), p.getAuthors(), p.getYear(), p.getVenue(), p.getAbstractText(),
            p.getCitationCount(), p.getReferenceCount(), p.getFieldsOfStudy(), p.getPublicationTypes(), externalIds,
            p.getOpenAccessPdfUrl() != null, p.getOpenAccessPdfUrl() != null || p.getUploadedPdfKey() != null, p.getSources(),
            viewerId != null && p.getUploadedPdfKey() != null && viewerId.equals(p.getUploadedBy()));
  }

  public static ResponseStatusException notFound(String paperId) {
    return new ResponseStatusException(HttpStatus.NOT_FOUND, "Paper not found: " + paperId);
  }
}
