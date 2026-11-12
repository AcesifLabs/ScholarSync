package com.acesif.scholarsyncbackend.integrations.sources.crossref;

import com.acesif.scholarsyncbackend.integrations.sources.utils.SourceHttpFactory;
import com.acesif.scholarsyncbackend.commons.config.properties.ExternalSourcesProperties;
import com.acesif.scholarsyncbackend.integrations.sources.dtos.*;
import com.acesif.scholarsyncbackend.integrations.sources.enums.*;
import com.acesif.scholarsyncbackend.integrations.sources.utils.*;
import com.acesif.scholarsyncbackend.integrations.sources.enums.PaperSort;
import com.acesif.scholarsyncbackend.integrations.sources.dtos.SearchFilters;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.util.UriBuilder;
import tools.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;

/** Crossref REST API, polite pool (mailto): list queries are limited to 3 per second with 3 in flight. */
@Service
public class CrossrefClient {

  public static final String SERVICE = "Crossref";
  private static final String FIELDS = "DOI,title,author,container-title,issued,is-referenced-by-count,references-count,abstract,type";

  private final SourceHttp http;
  private final ExternalSourcesProperties properties;

  public CrossrefClient(ExternalSourcesProperties properties) {
    this.properties = properties;
    this.http = SourceHttpFactory.http(SERVICE, properties, properties.getCrossref(), SourceHttpFactory::json);
  }

  public List<SourceRecord> search(SearchFilters f, PaperSort sort, int limit) {
    List<String> filters = new ArrayList<>();
    if (f.yearFrom() != null) filters.add("from-pub-date:" + f.yearFrom());
    if (f.yearTo() != null) filters.add("until-pub-date:" + f.yearTo() + "-12-31");
    JsonNode body = http.get(b -> {
      b.path("/works").queryParam("query.bibliographic", f.query()).queryParam("rows", limit).queryParam("select", FIELDS);
      if (!filters.isEmpty()) b.queryParam("filter", String.join(",", filters));
      switch (sort) {
        case CITATIONS -> b.queryParam("sort", "is-referenced-by-count").queryParam("order", "desc");
        case RECENT -> b.queryParam("sort", "published").queryParam("order", "desc");
        case RELEVANCE -> { }
      }
      return contact(b).build();
    }, JsonNode.class);
    return Json.list(body.path("message").path("items"), CrossrefClient::toRecord);
  }

  @Cacheable(cacheNames = "crossref-work", unless = "#result == null")
  public SourceRecord work(String doi) {
    JsonNode body = http.getOrNull(b -> contact(b.pathSegment("works").pathSegment(doi.split("/"))).build(), JsonNode.class);
    return body == null ? null : toRecord(body.path("message"));
  }

  private UriBuilder contact(UriBuilder b) {
    if (StringUtils.hasText(properties.getContactEmail())) b.queryParam("mailto", properties.getContactEmail());
    return b;
  }

  static SourceRecord toRecord(JsonNode w) {
    String doi = PaperKeys.doi(Json.str(w.path("DOI")));
    if (doi == null) return null;
    String arxivId = PaperKeys.arxivFromDoi(doi);
    String type = Vocabulary.typeFromCrossref(Json.str(w.path("type")));
    return SourceRecord.builder()
            .sources(EnumSet.of(Source.CROSSREF))
            .doi(arxivId == null ? doi : null)
            .arxivId(arxivId)
            .title(PaperKeys.text(Json.str(w.path("title").path(0))))
            .authors(Json.list(w.path("author"), a -> {
              String name = Json.str(a.path("name"));
              if (name == null) name = PaperKeys.text((nz(Json.str(a.path("given"))) + " " + nz(Json.str(a.path("family")))));
              return name == null ? null : new SourceRecord.Author(null, name);
            }))
            .year(Json.integer(w.path("issued").path("date-parts").path(0).path(0)))
            .venue(PaperKeys.text(Json.str(w.path("container-title").path(0))))
            .abstractText(abstractText(Json.str(w.path("abstract"))))
            .citationCount(Json.integer(w.path("is-referenced-by-count")))
            .referenceCount(Json.integer(w.path("references-count")))
            .fieldsOfStudy(List.of())
            .publicationTypes(type == null ? List.of() : List.of(type))
            .build();
  }

  /** JATS abstracts usually open with a "<jats:title>Abstract</jats:title>" heading. */
  private static String abstractText(String jats) {
    String text = PaperKeys.text(jats);
    return text == null ? null : PaperKeys.text(text.replaceFirst("^(?i)abstract\\s*", ""));
  }

  private static String nz(String s) {
    return s == null ? "" : s;
  }
}
