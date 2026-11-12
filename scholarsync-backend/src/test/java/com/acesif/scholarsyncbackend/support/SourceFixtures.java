package com.acesif.scholarsyncbackend.support;

import java.util.Arrays;
import java.util.stream.Collectors;

/** Response bodies shaped like each paper source's API. {@code null} arguments become JSON null / are left out. */
public final class SourceFixtures {

  private SourceFixtures() {}

  /** A work whose abstract is {@code abstractText} (stored as OpenAlex's inverted index). */
  public static String openAlexWork(String openalexId, String doi, String title, Integer year, Integer citations,
                                    String abstractText, String pdfUrl, String field, String... referencedWorks) {
    return """
            {"id":"https://openalex.org/%s","doi":%s,"display_name":%s,"publication_year":%s,"type":"article",
             "cited_by_count":%s,"referenced_works_count":%d,
             "ids":{"openalex":"https://openalex.org/%s"},
             "primary_location":{"landing_page_url":"https://example.org/%s","source":{"display_name":"OpenAlex Venue"}},
             "best_oa_location":%s,
             "authorships":[{"author":{"id":"https://openalex.org/A1","display_name":"Ada Lovelace"}},
                            {"author":{"id":null,"display_name":"Anon"}}],
             "abstract_inverted_index":%s,
             "topics":%s,
             "referenced_works":[%s]}
            """.formatted(openalexId, str(doi == null ? null : "https://doi.org/" + doi), str(title), year, citations,
            referencedWorks.length, openalexId, openalexId,
            pdfUrl == null ? "null" : "{\"pdf_url\":" + str(pdfUrl) + ",\"landing_page_url\":\"https://example.org/oa\"}",
            invertedIndex(abstractText),
            field == null ? "[]" : "[{\"field\":{\"display_name\":" + str(field) + "}}]",
            Arrays.stream(referencedWorks).map(w -> str("https://openalex.org/" + w)).collect(Collectors.joining(",")));
  }

  public static String openAlexPage(int total, String... works) {
    return "{\"meta\":{\"count\":%d},\"results\":[%s]}".formatted(total, String.join(",", works));
  }

  public static String openAlexAuthor(String id, String name, int works, int citations, int hIndex) {
    return """
            {"id":"https://openalex.org/%s","display_name":%s,"works_count":%d,"cited_by_count":%d,
             "summary_stats":{"h_index":%d},"last_known_institutions":[{"display_name":"Analytical Engine Co"}],
             "orcid":"https://orcid.org/0000-0001"}
            """.formatted(id, str(name), works, citations, hIndex);
  }

  public static String crossrefItem(String doi, String title, Integer year, String venue, Integer citations, String jatsAbstract) {
    return """
            {"DOI":%s,"title":[%s],"author":[{"given":"Ada","family":"Lovelace"}],"container-title":[%s],
             "issued":{"date-parts":[[%s]]},"is-referenced-by-count":%s,"references-count":7,"abstract":%s,
             "type":"journal-article"}
            """.formatted(str(doi), str(title), str(venue), year, citations, str(jatsAbstract));
  }

  public static String crossrefPage(String... items) {
    return "{\"status\":\"ok\",\"message\":{\"items\":[%s]}}".formatted(String.join(",", items));
  }

  public static String crossrefSingle(String item) {
    return "{\"status\":\"ok\",\"message\":%s}".formatted(item);
  }

  public static String europePmcResult(String pmid, String doi, String title, Integer year, String abstractText,
                                       Integer citations, String pdfUrl) {
    return """
            {"pmid":%s,"doi":%s,"title":%s,"pubYear":%s,"abstractText":%s,"citedByCount":%s,
             "authorList":{"author":[{"fullName":"Lovelace A"}]},"journalInfo":{"journal":{"title":"EPMC Journal"}},
             "pubTypeList":{"pubType":["research-article","Journal Article"]},
             "fullTextUrlList":{"fullTextUrl":[%s]}}
            """.formatted(str(pmid), str(doi), str(title), str(year == null ? null : year.toString()), str(abstractText), citations,
            pdfUrl == null ? "" : "{\"availabilityCode\":\"OA\",\"documentStyle\":\"pdf\",\"url\":" + str(pdfUrl) + "}");
  }

  public static String europePmcPage(String... results) {
    return "{\"hitCount\":%d,\"resultList\":{\"result\":[%s]}}".formatted(results.length, String.join(",", results));
  }

  public static String arxivEntry(String arxivId, String title, int year, String summary, String doi, String category) {
    return """
            <entry>
              <id>http://arxiv.org/abs/%sv2</id>
              <published>%d-03-01T00:00:00Z</published>
              <title>%s</title>
              <summary>%s</summary>
              <author><name>Ada Lovelace</name></author>
              %s
              <category term="%s" scheme="http://arxiv.org/schemas/atom"/>
              <link title="pdf" href="http://arxiv.org/pdf/%sv2" rel="related" type="application/pdf"/>
            </entry>
            """.formatted(arxivId, year, title, summary, doi == null ? "" : "<arxiv:doi>" + doi + "</arxiv:doi>", category, arxivId);
  }

  public static String arxivFeed(String... entries) {
    return """
            <?xml version="1.0" encoding="UTF-8"?>
            <feed xmlns="http://www.w3.org/2005/Atom" xmlns:arxiv="http://arxiv.org/schemas/atom">
            %s
            </feed>
            """.formatted(String.join("\n", entries));
  }

  /** Rows of /citations (side "citing") or /references (side "cited"). */
  public static String openCitationsLinks(String side, String... dois) {
    return "[" + Arrays.stream(dois).map(d -> "{\"%s\":\"omid:br/0601 doi:%s\"}".formatted(side, d)).collect(Collectors.joining(",")) + "]";
  }

  private static String invertedIndex(String text) {
    if (text == null) return "null";
    String[] words = text.split(" ");
    var positions = new java.util.LinkedHashMap<String, java.util.List<Integer>>();
    for (int i = 0; i < words.length; i++) positions.computeIfAbsent(words[i], k -> new java.util.ArrayList<>()).add(i);
    return positions.entrySet().stream().map(e -> str(e.getKey()) + ":" + e.getValue()).collect(Collectors.joining(",", "{", "}"));
  }

  public static String str(String value) {
    if (value == null) return "null";
    return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
  }
}
