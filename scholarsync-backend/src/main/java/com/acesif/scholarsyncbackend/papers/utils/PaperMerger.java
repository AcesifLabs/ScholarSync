package com.acesif.scholarsyncbackend.papers.utils;

import com.acesif.scholarsyncbackend.integrations.sources.utils.PaperKeys;
import com.acesif.scholarsyncbackend.integrations.sources.enums.Source;
import com.acesif.scholarsyncbackend.integrations.sources.dtos.SourceRecord;

import java.util.*;
import java.util.function.Function;

/**
 * Merges what several sources say about the same paper (ADR 0005). Records are grouped when they share a DOI, arXiv
 * id, PMID or OpenAlex id, or else a distinctive (4+ word) normalized title within a year, unless that would join two
 * different values of the same identifier.
 * Each field takes the first value in {@link Source} order, except abstracts (longest), counts (largest) and
 * fields/types/ids (union). Ranked input lists are fused with reciprocal rank fusion.
 */
public final class PaperMerger {

  /** The usual RRF constant; it damps the gap between rank 1 and rank 2. */
  static final int RRF_K = 60;
  /** Fewest words a title needs before a title match may join records. */
  static final int MIN_TITLE_WORDS = 4;

  public record Ranked(SourceRecord record, double score) {}

  private PaperMerger() {}

  /** {@code bySource} holds each source's results in its own rank order. */
  public static List<Ranked> mergeRanked(Map<Source, List<SourceRecord>> bySource) {
    List<SourceRecord> all = new ArrayList<>();
    List<Double> rrf = new ArrayList<>();
    bySource.values().forEach(records -> {
      for (int i = 0; i < records.size(); i++) {
        all.add(records.get(i));
        rrf.add(1.0 / (RRF_K + i + 1));
      }
    });
    List<Ranked> out = new ArrayList<>();
    for (List<Integer> group : group(all)) {
      double score = group.stream().mapToDouble(rrf::get).sum();
      out.add(new Ranked(combine(group.stream().map(all::get).toList()), score));
    }
    out.sort(Comparator.comparingDouble(Ranked::score).reversed()
            .thenComparing(r -> Objects.requireNonNullElse(r.record().citationCount(), -1), Comparator.reverseOrder()));
    return out;
  }

  /** Indexes of {@code records} that describe the same paper, in first-seen order. */
  static List<List<Integer>> group(List<SourceRecord> records) {
    int n = records.size();
    int[] parent = new int[n];
    for (int i = 0; i < n; i++) parent[i] = i;
    List<Map<PaperKeys.Type, String>> ids = new ArrayList<>();
    Map<String, Integer> owner = new HashMap<>();
    for (int i = 0; i < n; i++) {
      Map<PaperKeys.Type, String> own = identifiers(records.get(i));
      ids.add(own);
      for (Map.Entry<PaperKeys.Type, String> id : own.entrySet()) {
        Integer previous = owner.putIfAbsent(id.getKey().key(id.getValue()), i);
        if (previous != null) union(parent, ids, previous, i, true);
      }
    }
    Map<String, List<Integer>> byTitle = new HashMap<>();
    for (int i = 0; i < n; i++) {
      String title = PaperKeys.title(records.get(i).title());
      if (!distinctive(title)) continue;
      for (int j : byTitle.getOrDefault(title, List.of())) {
        if (yearsClose(records.get(i).year(), records.get(j).year())) union(parent, ids, j, i, false);
      }
      byTitle.computeIfAbsent(title, k -> new ArrayList<>()).add(i);
    }
    Map<Integer, List<Integer>> groups = new LinkedHashMap<>();
    for (int i = 0; i < n; i++) groups.computeIfAbsent(find(parent, i), k -> new ArrayList<>()).add(i);
    return new ArrayList<>(groups.values());
  }

  public static SourceRecord combine(List<SourceRecord> group) {
    List<SourceRecord> byPriority = group.stream().sorted(Comparator.comparing(PaperMerger::priority)).toList();
    Set<Source> sources = EnumSet.noneOf(Source.class);
    byPriority.forEach(r -> sources.addAll(r.sources()));
    List<SourceRecord.Author> authors = byPriority.stream()
            .filter(r -> r.sources().contains(Source.OPENALEX) && !nz(r.authors()).isEmpty()).map(SourceRecord::authors).findFirst()
            .orElseGet(() -> byPriority.stream().map(r -> nz(r.authors())).max(Comparator.comparingInt(List::size)).orElse(List.of()));
    return SourceRecord.builder()
            .sources(sources)
            .doi(first(byPriority, SourceRecord::doi))
            .arxivId(first(byPriority, SourceRecord::arxivId))
            .pmid(first(byPriority, SourceRecord::pmid))
            .openalexId(first(byPriority, SourceRecord::openalexId))
            .title(first(byPriority, SourceRecord::title))
            .authors(authors)
            .year(first(byPriority, SourceRecord::year))
            .venue(first(byPriority, SourceRecord::venue))
            .abstractText(byPriority.stream().map(SourceRecord::abstractText).filter(Objects::nonNull)
                    .max(Comparator.comparingInt(String::length)).orElse(null))
            .citationCount(max(byPriority, SourceRecord::citationCount))
            .referenceCount(max(byPriority, SourceRecord::referenceCount))
            .fieldsOfStudy(union(byPriority, SourceRecord::fieldsOfStudy))
            .publicationTypes(union(byPriority, SourceRecord::publicationTypes))
            .pdfUrl(first(byPriority, SourceRecord::pdfUrl))
            .referencedWorks(byPriority.stream().map(r -> nz(r.referencedWorks())).filter(l -> !l.isEmpty()).findFirst().orElse(List.of()))
            .build();
  }

  static Map<PaperKeys.Type, String> identifiers(SourceRecord r) {
    Map<PaperKeys.Type, String> ids = new EnumMap<>(PaperKeys.Type.class);
    if (r.doi() != null) ids.put(PaperKeys.Type.DOI, r.doi());
    if (r.arxivId() != null) ids.put(PaperKeys.Type.ARXIV, r.arxivId());
    if (r.pmid() != null) ids.put(PaperKeys.Type.PMID, r.pmid());
    if (r.openalexId() != null) ids.put(PaperKeys.Type.OPENALEX, r.openalexId());
    return ids;
  }

  /** Joins the groups of a and b. A title match never joins groups that hold different values of the same id type. */
  private static void union(int[] parent, List<Map<PaperKeys.Type, String>> ids, int a, int b, boolean sharedId) {
    int ra = find(parent, a), rb = find(parent, b);
    if (ra == rb) return;
    Map<PaperKeys.Type, String> idsA = ids.get(ra), idsB = ids.get(rb);
    if (!sharedId) {
      for (Map.Entry<PaperKeys.Type, String> id : idsB.entrySet()) {
        String other = idsA.get(id.getKey());
        if (other != null && !other.equals(id.getValue())) return;
      }
    }
    parent[rb] = ra;
    idsB.forEach(idsA::putIfAbsent);
  }

  private static int find(int[] parent, int i) {
    while (parent[i] != i) i = parent[i] = parent[parent[i]];
    return i;
  }

  /**
   * Short titles ("Editorial", "Reply", "Introduction to …") are shared by unrelated works, so they never join records;
   * the threshold keeps real titles such as "Protein folding at scale".
   */
  private static boolean distinctive(String normalizedTitle) {
    return normalizedTitle != null && normalizedTitle.split(" ").length >= MIN_TITLE_WORDS;
  }

  private static boolean yearsClose(Integer a, Integer b) {
    return a == null || b == null || Math.abs(a - b) <= 1;
  }

  private static int priority(SourceRecord r) {
    return r.sources().stream().mapToInt(Enum::ordinal).min().orElse(Integer.MAX_VALUE);
  }

  private static <T> T first(List<SourceRecord> records, Function<SourceRecord, T> field) {
    return records.stream().map(field).filter(Objects::nonNull).findFirst().orElse(null);
  }

  private static Integer max(List<SourceRecord> records, Function<SourceRecord, Integer> field) {
    return records.stream().map(field).filter(Objects::nonNull).max(Integer::compare).orElse(null);
  }

  private static List<String> union(List<SourceRecord> records, Function<SourceRecord, List<String>> field) {
    LinkedHashSet<String> values = new LinkedHashSet<>();
    records.forEach(r -> values.addAll(nz(field.apply(r))));
    return List.copyOf(values);
  }

  private static <T> List<T> nz(List<T> list) {
    return list == null ? List.of() : list;
  }
}
