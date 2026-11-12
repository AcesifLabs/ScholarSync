package com.acesif.scholarsyncbackend.graph.services;

import com.acesif.scholarsyncbackend.graph.enums.GraphDirection;
import com.acesif.scholarsyncbackend.graph.dtos.*;
import com.acesif.scholarsyncbackend.integrations.sources.utils.PaperKeys;
import com.acesif.scholarsyncbackend.integrations.sources.dtos.SourceRecord;
import com.acesif.scholarsyncbackend.integrations.sources.openalex.OpenAlexClient;
import com.acesif.scholarsyncbackend.integrations.sources.opencitations.OpenCitationsClient;
import com.acesif.scholarsyncbackend.papers.entities.Paper;
import com.acesif.scholarsyncbackend.papers.entities.PaperAuthor;
import com.acesif.scholarsyncbackend.papers.services.PaperService;
import com.acesif.scholarsyncbackend.commons.exceptions.UpstreamException;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.*;

/**
 * Breadth-first citation graph around a seed paper, from OpenAlex; OpenCitations supplies the links when OpenAlex
 * does not have the paper. Each paper contributes at most {@link #FANOUT} neighbours per direction (the most cited)
 * and only the {@link #EXPANDED_PER_LEVEL} most-cited papers of a level are expanded, so depth 2 costs at most
 * 1 + 2 * (1 + 10) cached calls.
 */
@Service
@RequiredArgsConstructor
public class GraphService {

  public static final int MAX_DEPTH = 2;
  public static final int MAX_NODES = 150;
  static final int FANOUT = 20;
  static final int EXPANDED_PER_LEVEL = 10;

  private final PaperService paperService;
  private final OpenAlexClient openAlex;
  private final OpenCitationsClient openCitations;

  private record Hop(String id, SourceRecord record) {}

  /** A hop's neighbours, fetched in parallel with the rest of its level. */
  private record Neighbours(List<SourceRecord> citing, List<SourceRecord> cited) {}

  private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();

  @PreDestroy
  void shutdown() {
    executor.shutdownNow();
  }

  public CitationGraph build(String paperId, GraphDirection direction, int depth, int limit) {
    Paper seed = paperService.findOrFetch(paperId);
    SourceRecord root = rootRecord(seed);

    Builder graph = new Builder(limit);
    graph.addNode(seed.getId(), seed.getTitle(), seed.getYear(), seed.getCitationCount(), seed.getAuthors(), 0);
    List<Hop> frontier = List.of(new Hop(seed.getId(), root));

    for (int level = 1; level <= depth && !frontier.isEmpty(); level++) {
      // the source calls of one level are independent; adding to the graph stays in frontier order
      List<Neighbours> fetched = fetchAll(frontier, direction);
      List<SourceRecord> discovered = new ArrayList<>();
      for (int i = 0; i < frontier.size(); i++) discovered.addAll(expandOne(graph, frontier.get(i), fetched.get(i), level));
      // Only the most-cited new papers are expanded further; the rest stay as leaves.
      frontier = discovered.stream()
              .sorted(Comparator.comparing((SourceRecord r) -> Objects.requireNonNullElse(r.citationCount(), 0)).reversed())
              .map(r -> new Hop(PaperKeys.idFor(r), r))
              .filter(h -> h.id() != null)
              .distinct()
              .limit(EXPANDED_PER_LEVEL)
              .toList();
    }
    return graph.build(seed.getId());
  }

  /** One hop around a paper, used for click-to-expand in the UI. */
  public CitationGraph expand(String paperId, GraphDirection direction, int limit) {
    return build(paperId, direction, 1, limit);
  }

  /** The seed as OpenAlex knows it (with its reference list), else just its identifiers for the OpenCitations path. */
  private SourceRecord rootRecord(Paper seed) {
    PaperKeys.Key key = seed.getOpenalexId() != null ? new PaperKeys.Key(PaperKeys.Type.OPENALEX, seed.getOpenalexId())
            : seed.getDoi() != null ? new PaperKeys.Key(PaperKeys.Type.DOI, seed.getDoi())
            : seed.getArxivId() != null ? new PaperKeys.Key(PaperKeys.Type.ARXIV, seed.getArxivId())
            : seed.getPmid() != null ? new PaperKeys.Key(PaperKeys.Type.PMID, seed.getPmid()) : null;
    SourceRecord found = key == null ? null : openAlex.work(key);
    return found != null ? found : SourceRecord.builder().doi(seed.getDoi()).build();
  }

  private List<Neighbours> fetchAll(List<Hop> frontier, GraphDirection direction) {
    List<Future<Neighbours>> futures = frontier.stream().map(hop -> executor.submit(() -> new Neighbours(
            direction.includesCitations() ? citing(hop.record()) : List.of(),
            direction.includesReferences() ? references(hop.record()) : List.of()))).toList();
    List<Neighbours> out = new ArrayList<>();
    try {
      for (Future<Neighbours> future : futures) out.add(future.get());
    } catch (ExecutionException e) {
      futures.forEach(f -> f.cancel(true));
      if (e.getCause() instanceof RuntimeException cause) throw cause;
      throw new IllegalStateException(e.getCause());
    } catch (InterruptedException e) {
      futures.forEach(f -> f.cancel(true));
      Thread.currentThread().interrupt();
      throw UpstreamException.rateLimited(OpenAlexClient.SERVICE);
    }
    return out;
  }

  /** Adds the neighbours of {@code hop} and returns the ones that were new to the graph. */
  private List<SourceRecord> expandOne(Builder graph, Hop hop, Neighbours neighbours, int level) {
    List<SourceRecord> added = new ArrayList<>();
    if (!neighbours.citing().isEmpty()) {
      for (SourceRecord citing : neighbours.citing()) {
        String id = PaperKeys.idFor(citing);
        if (graph.addNode(citing, id, level)) added.add(citing);
        graph.addLink(id, hop.id());
      }
    }
    if (!neighbours.cited().isEmpty()) {
      for (SourceRecord cited : neighbours.cited()) {
        String id = PaperKeys.idFor(cited);
        if (graph.addNode(cited, id, level)) added.add(cited);
        graph.addLink(hop.id(), id);
      }
    }
    return added;
  }

  private List<SourceRecord> citing(SourceRecord paper) {
    if (paper.openalexId() != null) return openAlex.citing(paper.openalexId(), FANOUT);
    if (paper.doi() != null) return resolve(openCitations.citations(paper.doi(), OpenAlexClient.MAX_IDS_PER_CALL));
    return List.of();
  }

  private List<SourceRecord> references(SourceRecord paper) {
    if (paper.openalexId() != null) {
      List<String> refs = paper.referencedWorks() == null ? List.of() : paper.referencedWorks();
      return openAlex.byIds(refs.stream().limit(OpenAlexClient.MAX_IDS_PER_CALL).toList(), FANOUT);
    }
    if (paper.doi() != null) return resolve(openCitations.references(paper.doi(), OpenAlexClient.MAX_IDS_PER_CALL));
    return List.of();
  }

  /** OpenCitations only gives DOIs: OpenAlex fills in titles, and a DOI it does not know becomes a DOI-titled node. */
  private List<SourceRecord> resolve(List<String> dois) {
    List<String> batch = dois.stream().limit(OpenAlexClient.MAX_IDS_PER_CALL).toList();
    List<SourceRecord> found = new ArrayList<>(openAlex.byDois(batch, FANOUT));
    Set<String> known = new HashSet<>();
    found.forEach(r -> known.add(r.doi()));
    batch.stream().filter(d -> !known.contains(d)).limit(Math.max(0, FANOUT - found.size()))
            .forEach(d -> found.add(SourceRecord.builder().doi(d).title(d).build()));
    return found;
  }

  /** Insertion-ordered, de-duplicated nodes and links, capped at {@code limit} nodes. */
  private static final class Builder {
    private final int limit;
    private final Map<String, GraphNode> nodes = new LinkedHashMap<>();
    private final Set<GraphLink> links = new LinkedHashSet<>();

    Builder(int limit) {
      this.limit = limit;
    }

    boolean addNode(SourceRecord r, String id, int depth) {
      return id != null && addNode(id, r.title(), r.year(), r.citationCount(), PaperService.authors(r), depth);
    }

    boolean addNode(String id, String title, Integer year, Integer citations, List<PaperAuthor> authors, int depth) {
      if (nodes.containsKey(id) || nodes.size() >= limit) return false;
      nodes.put(id, new GraphNode(id, title, year, citations, authors == null ? List.of() : authors.stream().limit(3).toList(), depth));
      return true;
    }

    /** Links are kept only between nodes that made it under the cap, and never as self-loops. */
    void addLink(String source, String target) {
      if (source != null && target != null && !source.equals(target) && nodes.containsKey(source) && nodes.containsKey(target)) {
        links.add(new GraphLink(source, target));
      }
    }

    CitationGraph build(String rootId) {
      return new CitationGraph(rootId, List.copyOf(nodes.values()), List.copyOf(links));
    }
  }
}
