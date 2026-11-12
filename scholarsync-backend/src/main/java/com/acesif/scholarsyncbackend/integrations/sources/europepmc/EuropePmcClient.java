package com.acesif.scholarsyncbackend.integrations.sources.europepmc;

import com.acesif.scholarsyncbackend.integrations.sources.utils.SourceHttpFactory;
import com.acesif.scholarsyncbackend.commons.config.properties.ExternalSourcesProperties;
import com.acesif.scholarsyncbackend.integrations.sources.dtos.*;
import com.acesif.scholarsyncbackend.integrations.sources.enums.*;
import com.acesif.scholarsyncbackend.integrations.sources.utils.*;
import com.acesif.scholarsyncbackend.integrations.sources.enums.PaperSort;
import com.acesif.scholarsyncbackend.integrations.sources.dtos.SearchFilters;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriBuilder;
import tools.jackson.databind.JsonNode;

import java.net.URI;
import java.util.EnumSet;
import java.util.Locale;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.regex.Pattern;

/** Europe PMC REST search (life sciences, includes PubMed and preprints): 10 requests per second per IP. */
@Service
public class EuropePmcClient {

  public static final String SERVICE = "Europe PMC";
  /** Lower bound for an open-ended year range; below SearchFilters.MIN_YEAR because Europe PMC indexes older journals. */
  private static final int FIRST_YEAR = 1000;
  private static final Pattern OPERATORS = Pattern.compile("\\b(AND|OR|NOT)\\b");

  private final SourceHttp http;

  public EuropePmcClient(ExternalSourcesProperties properties) {
    this.http = SourceHttpFactory.http(SERVICE, properties, properties.getEuropepmc(), SourceHttpFactory::json);
  }

  public List<SourceRecord> search(SearchFilters f, PaperSort sort, int limit) {
    StringBuilder query = new StringBuilder("(").append(escape(f.query())).append(")");
    if (f.yearFrom() != null || f.yearTo() != null) {
      query.append(" AND PUB_YEAR:[").append(f.yearFrom() == null ? FIRST_YEAR : f.yearFrom())
              .append(" TO ").append(f.yearTo() == null ? SearchFilters.MAX_YEAR : f.yearTo()).append("]");
    }
    if (f.openAccessOnly()) query.append(" AND OPEN_ACCESS:y");
    // a rejected query is a failure (partial result, short cache life), not an empty answer
    return parse(http.get(b -> searchUri(b, query.toString(), sort, limit), JsonNode.class));
  }

  /**
   * Makes user text plain search words for Europe PMC's Lucene syntax: special characters are escaped and the
   * operator words AND/OR/NOT lower-cased, so a pasted title like "BERT: Pre-training (2019)" cannot change the query.
   */
  static String escape(String text) {
    String escaped = text.replaceAll("([+\\-&|!(){}\\[\\]^\"~*?:\\\\/])", "\\\\$1");
    return OPERATORS.matcher(escaped).replaceAll(m -> m.group(1).toLowerCase(Locale.ROOT));
  }

  @Cacheable(cacheNames = "europepmc-pmid", unless = "#result == null")
  public SourceRecord byPmid(String pmid) {
    JsonNode body = http.getOrNull(b -> searchUri(b, "EXT_ID:" + pmid + " AND SRC:MED", PaperSort.RELEVANCE, 1), JsonNode.class);
    return parse(body).stream().findFirst().orElse(null);
  }

  private static URI searchUri(UriBuilder b, String query, PaperSort sort, int limit) {
    b.path("/search").queryParam("query", query).queryParam("format", "json")
            .queryParam("resultType", "core").queryParam("pageSize", limit);
    switch (sort) {
      case CITATIONS -> b.queryParam("sort", "CITED desc");
      case RECENT -> b.queryParam("sort", "P_PDATE_D desc");
      case RELEVANCE -> { }
    }
    return b.build();
  }

  private static List<SourceRecord> parse(JsonNode body) {
    return body == null ? List.of() : Json.list(body.path("resultList").path("result"), EuropePmcClient::toRecord);
  }

  static SourceRecord toRecord(JsonNode r) {
    String doi = PaperKeys.doi(Json.str(r.path("doi")));
    String arxivId = PaperKeys.arxivFromDoi(doi);
    String pmid = PaperKeys.pmid(Json.str(r.path("pmid")));
    if (doi == null && arxivId == null && pmid == null) return null;
    String pdf = Json.list(r.path("fullTextUrlList").path("fullTextUrl"), u ->
            "pdf".equals(Json.str(u.path("documentStyle"))) && "OA".equals(Json.str(u.path("availabilityCode")))
                    ? Json.str(u.path("url")) : null).stream().findFirst().orElse(null);
    String venue = Json.str(r.path("journalInfo").path("journal").path("title"));
    if (venue == null) venue = Json.str(r.path("bookOrReportDetails").path("publisher"));
    return SourceRecord.builder()
            .sources(EnumSet.of(Source.EUROPEPMC))
            .doi(arxivId == null ? doi : null)
            .arxivId(arxivId)
            .pmid(pmid)
            .title(PaperKeys.text(Json.str(r.path("title"))))
            .authors(Json.list(r.path("authorList").path("author"), a -> {
              String name = Json.str(a.path("fullName"));
              return name == null ? null : new SourceRecord.Author(null, name);
            }))
            .year(Json.integer(r.path("pubYear")))
            .venue(venue)
            .abstractText(PaperKeys.text(Json.str(r.path("abstractText"))))
            .citationCount(Json.integer(r.path("citedByCount")))
            .fieldsOfStudy(List.of())
            .publicationTypes(List.copyOf(new LinkedHashSet<>(Json.list(r.path("pubTypeList").path("pubType"),
                    t -> Vocabulary.typeFromEuropePmc(Json.str(t))).stream().filter(Objects::nonNull).toList())))
            .pdfUrl(pdf)
            .build();
  }
}
