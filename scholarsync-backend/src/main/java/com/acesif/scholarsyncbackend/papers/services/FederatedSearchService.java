package com.acesif.scholarsyncbackend.papers.services;

import com.acesif.scholarsyncbackend.papers.utils.PaperMerger;
import com.acesif.scholarsyncbackend.commons.config.properties.SearchProperties;
import com.acesif.scholarsyncbackend.commons.exceptions.UpstreamException;
import com.acesif.scholarsyncbackend.integrations.sources.utils.PaperKeys;
import com.acesif.scholarsyncbackend.integrations.sources.enums.Source;
import com.acesif.scholarsyncbackend.integrations.sources.dtos.SourceRecord;
import com.acesif.scholarsyncbackend.integrations.sources.arxiv.ArxivClient;
import com.acesif.scholarsyncbackend.integrations.sources.crossref.CrossrefClient;
import com.acesif.scholarsyncbackend.integrations.sources.europepmc.EuropePmcClient;
import com.acesif.scholarsyncbackend.integrations.sources.openalex.OpenAlexClient;
import com.acesif.scholarsyncbackend.integrations.sources.opencitations.OpenCitationsClient;
import com.acesif.scholarsyncbackend.integrations.sources.unpaywall.UnpaywallClient;
import com.acesif.scholarsyncbackend.integrations.sources.enums.PaperSort;
import com.acesif.scholarsyncbackend.integrations.sources.dtos.SearchFilters;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.*;
import java.util.function.Function;
import java.util.function.Supplier;

/**
 * Asks every source in parallel and merges the answers (ADR 0005). A source that fails or exceeds
 * search.source-timeout is left out and the result is marked partial; only when every source fails is it an error.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FederatedSearchService {

  public record Result(List<SourceRecord> records, Set<String> sourcesOk, boolean complete) {}

  private final OpenAlexClient openAlex;
  private final CrossrefClient crossref;
  private final EuropePmcClient europePmc;
  private final ArxivClient arxiv;
  private final OpenCitationsClient openCitations;
  private final UnpaywallClient unpaywall;
  private final SearchProperties properties;
  private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();

  @PreDestroy
  void shutdown() {
    executor.shutdownNow();
  }

  public Result search(SearchFilters filters, PaperSort sort) {
    int depth = properties.getDepth();
    Map<Source, Supplier<List<SourceRecord>>> calls = new EnumMap<>(Source.class);
    calls.put(Source.OPENALEX, () -> openAlex.search(filters, sort, depth));
    calls.put(Source.CROSSREF, () -> crossref.search(filters, sort, depth));
    calls.put(Source.EUROPEPMC, () -> europePmc.search(filters, sort, depth));
    // arXiv has no citation counts, so it cannot contribute to a citation-sorted list. While its single slot is taken
    // the call would queue past search.source-timeout and turn a full answer from the others into a short-lived
    // partial one, so it is skipped instead.
    if (sort != PaperSort.CITATIONS && !arxiv.busy()) calls.put(Source.ARXIV, () -> arxiv.search(filters, sort, depth));

    FanOut fanOut = fanOut(calls);
    Map<Source, List<SourceRecord>> answered = fanOut.answered();
    if (answered.isEmpty()) throw fanOut.error();
    List<SourceRecord> merged = PaperMerger.mergeRanked(answered).stream()
            .map(PaperMerger.Ranked::record)
            .filter(r -> matches(filters, r))
            .toList();
    List<SourceRecord> ordered = switch (sort) {
      case RELEVANCE -> merged;
      case CITATIONS -> sortedDesc(merged, SourceRecord::citationCount);
      case RECENT -> sortedDesc(merged, SourceRecord::year);
    };
    Set<String> ok = new TreeSet<>();
    answered.keySet().forEach(s -> ok.add(s.key));
    return new Result(ordered, ok, answered.size() == calls.size());
  }

  /**
   * Everything the sources know about one paper, merged; null if none of them has it. Only sources that can look the
   * paper up by the identifiers in {@code known} are asked.
   */
  public SourceRecord lookup(SourceRecord known) {
    Map<Source, Supplier<List<SourceRecord>>> calls = new EnumMap<>(Source.class);
    PaperKeys.Key key = known.doi() != null ? new PaperKeys.Key(PaperKeys.Type.DOI, known.doi())
            : known.openalexId() != null ? new PaperKeys.Key(PaperKeys.Type.OPENALEX, known.openalexId())
            : known.arxivId() != null ? new PaperKeys.Key(PaperKeys.Type.ARXIV, known.arxivId())
            : known.pmid() != null ? new PaperKeys.Key(PaperKeys.Type.PMID, known.pmid()) : null;
    if (key == null) return null;
    calls.put(Source.OPENALEX, () -> single(openAlex.work(key)));
    if (known.doi() != null) {
      calls.put(Source.CROSSREF, () -> single(crossref.work(known.doi())));
      calls.put(Source.OPENCITATIONS, () -> {
        Integer count = openCitations.citationCount(known.doi());
        return count == null ? List.of() : List.of(SourceRecord.builder().sources(EnumSet.of(Source.OPENCITATIONS))
                .doi(known.doi()).citationCount(count).build());
      });
      if (unpaywall.enabled()) calls.put(Source.UNPAYWALL, () -> {
        String pdf = unpaywall.pdfUrl(known.doi());
        return pdf == null ? List.of() : List.of(SourceRecord.builder().sources(EnumSet.of(Source.UNPAYWALL))
                .doi(known.doi()).pdfUrl(pdf).build());
      });
    }
    if (known.pmid() != null) calls.put(Source.EUROPEPMC, () -> single(europePmc.byPmid(known.pmid())));
    if (known.arxivId() != null) calls.put(Source.ARXIV, () -> single(arxiv.byId(known.arxivId())));

    FanOut fanOut = fanOut(calls);
    List<SourceRecord> found = new ArrayList<>();
    fanOut.answered().values().forEach(found::addAll);
    // Unpaywall's PDF outranks the others but its enum position is for bibliographic fields, so apply it last
    SourceRecord unpaywallPdf = found.stream().filter(r -> r.sources().contains(Source.UNPAYWALL)).findFirst().orElse(null);
    if (found.stream().noneMatch(r -> r.title() != null)) {
      // "not found" is only certain when no source failed
      if (!fanOut.failures().isEmpty()) throw fanOut.error();
      return null;
    }
    SourceRecord merged = PaperMerger.combine(found);
    return unpaywallPdf == null ? merged : merged.toBuilder().pdfUrl(unpaywallPdf.pdfUrl()).build();
  }

  private record FanOut(Map<Source, List<SourceRecord>> answered, List<Throwable> failures) {
    /** 503 when any source was rate limiting (the user can retry soon), else 502. */
    UpstreamException error() {
      boolean rateLimited = failures.stream().anyMatch(f -> f instanceof UpstreamException u && u.getStatusCode().value() == 503);
      return rateLimited ? UpstreamException.rateLimited("Every paper source")
              : new UpstreamException(HttpStatus.BAD_GATEWAY, "No paper source answered. Try again in a minute.",
                      failures.isEmpty() ? null : failures.getFirst());
    }
  }

  /**
   * Runs the calls in parallel and collects the sources that answered within search.source-timeout and the failures of
   * the rest. A call still running at the deadline is cancelled (its thread interrupted), so it gives back its
   * throttle slot instead of queueing behind later searches.
   */
  private FanOut fanOut(Map<Source, Supplier<List<SourceRecord>>> calls) {
    Map<Source, Future<List<SourceRecord>>> futures = new EnumMap<>(Source.class);
    calls.forEach((source, call) -> futures.put(source, executor.submit(call::get)));
    long deadline = System.nanoTime() + properties.getSourceTimeout().toNanos();
    Map<Source, List<SourceRecord>> answered = new EnumMap<>(Source.class);
    List<Throwable> failures = new ArrayList<>();
    futures.forEach((source, future) -> {
      try {
        answered.put(source, future.get(Math.max(0, deadline - System.nanoTime()), TimeUnit.NANOSECONDS));
      } catch (TimeoutException e) {
        future.cancel(true);
        failures.add(e);
        log.warn("{} left out of the result: timed out", source.key);
      } catch (ExecutionException e) {
        failures.add(e.getCause());
        log.warn("{} left out of the result: {}", source.key, e.getCause().getMessage());
      } catch (InterruptedException e) {
        futures.values().forEach(f -> f.cancel(true));
        Thread.currentThread().interrupt();
        throw UpstreamException.rateLimited("Every paper source");
      }
    });
    return new FanOut(answered, failures);
  }

  /** Strict: a filtered-on field the merged record lacks excludes it. */
  static boolean matches(SearchFilters f, SourceRecord r) {
    if (f.yearFrom() != null && (r.year() == null || r.year() < f.yearFrom())) return false;
    if (f.yearTo() != null && (r.year() == null || r.year() > f.yearTo())) return false;
    if (f.minCitations() != null && f.minCitations() > 0 && (r.citationCount() == null || r.citationCount() < f.minCitations())) return false;
    if (f.openAccessOnly() && r.pdfUrl() == null) return false;
    if (!f.fieldsOfStudy().isEmpty() && !anyEqualIgnoreCase(f.fieldsOfStudy(), r.fieldsOfStudy())) return false;
    if (!f.publicationTypes().isEmpty() && !anyEqualIgnoreCase(f.publicationTypes(), r.publicationTypes())) return false;
    if (!f.venues().isEmpty()) {
      if (r.venue() == null) return false;
      String venue = r.venue().toLowerCase(Locale.ROOT);
      return f.venues().stream().anyMatch(v -> venue.contains(v.toLowerCase(Locale.ROOT)));
    }
    return true;
  }

  private static boolean anyEqualIgnoreCase(List<String> wanted, List<String> values) {
    return values != null && values.stream().anyMatch(v -> wanted.stream().anyMatch(v::equalsIgnoreCase));
  }

  /** Stable, so ties keep relevance order; unknown values go last. */
  private static List<SourceRecord> sortedDesc(List<SourceRecord> records, Function<SourceRecord, Integer> key) {
    return records.stream().sorted(Comparator.comparing(key, Comparator.nullsLast(Comparator.reverseOrder()))).toList();
  }

  private static List<SourceRecord> single(SourceRecord record) {
    return record == null ? List.of() : List.of(record);
  }
}
