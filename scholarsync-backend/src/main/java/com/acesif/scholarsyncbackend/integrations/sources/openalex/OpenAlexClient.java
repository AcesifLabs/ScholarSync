package com.acesif.scholarsyncbackend.integrations.sources.openalex;

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

import java.util.*;

/**
 * OpenAlex works, authors and autocomplete (CC0 metadata). Lookups by id are cached for an hour; list calls cost
 * more of the daily budget than singletons, so graph and author views ask for exactly the rows they show.
 */
@Service
public class OpenAlexClient {

  public static final String SERVICE = "OpenAlex";
  /** Public pages for OpenAlex entities, e.g. https://openalex.org/A123. */
  public static final String WEB_BASE_URL = "https://openalex.org/";
  /** OR-filters accept at most 100 values; 50 keeps URLs short. */
  public static final int MAX_IDS_PER_CALL = 50;
  private static final String WORK_FIELDS = "id,doi,display_name,publication_year,primary_location,best_oa_location,"
          + "cited_by_count,referenced_works_count,authorships,abstract_inverted_index,topics,type,ids";
  private static final String GRAPH_FIELDS = WORK_FIELDS + ",referenced_works";
  private static final String AUTHOR_FIELDS = "id,display_name,last_known_institutions,works_count,cited_by_count,summary_stats,orcid";

  private final SourceHttp http;
  private final ExternalSourcesProperties properties;

  public OpenAlexClient(ExternalSourcesProperties properties) {
    this.properties = properties;
    this.http = SourceHttpFactory.http(SERVICE, properties, properties.getOpenalex(), SourceHttpFactory::json);
  }

  public List<SourceRecord> search(SearchFilters f, PaperSort sort, int limit) {
    List<String> filters = new ArrayList<>();
    if (f.yearFrom() != null || f.yearTo() != null) {
      filters.add("publication_year:" + (f.yearFrom() == null ? "" : f.yearFrom()) + "-" + (f.yearTo() == null ? "" : f.yearTo()));
    }
    if (f.minCitations() != null && f.minCitations() > 0) filters.add("cited_by_count:>" + (f.minCitations() - 1));
    if (f.openAccessOnly()) filters.add("is_oa:true");
    List<String> fieldIds = f.fieldsOfStudy().stream().map(Vocabulary.FIELDS::get).filter(Objects::nonNull).map(String::valueOf).toList();
    if (!fieldIds.isEmpty()) filters.add("topics.field.id:" + String.join("|", fieldIds));
    List<String> types = f.publicationTypes().stream().filter(Vocabulary.TYPES::contains).toList();
    if (!types.isEmpty()) filters.add("type:" + String.join("|", types));

    JsonNode body = http.get(b -> {
      b.path("/works").queryParam("search", f.query()).queryParam("per_page", limit).queryParam("select", WORK_FIELDS);
      if (!filters.isEmpty()) b.queryParam("filter", String.join(",", filters));
      switch (sort) {
        case CITATIONS -> b.queryParam("sort", "cited_by_count:desc");
        case RECENT -> b.queryParam("sort", "publication_date:desc");
        case RELEVANCE -> { }
      }
      return auth(b).build();
    }, JsonNode.class);
    return works(body);
  }

  /** One work by DOI, arXiv id (via its DataCite DOI), PMID or W-id; null if OpenAlex does not have it. */
  @Cacheable(cacheNames = "openalex-work", unless = "#result == null")
  public SourceRecord work(PaperKeys.Key key) {
    String id = switch (key.type()) {
      case DOI -> "doi:" + key.value();
      case ARXIV -> "doi:" + PaperKeys.arxivDoi(key.value());
      case PMID -> "pmid:" + key.value();
      case OPENALEX -> key.value();
    };
    JsonNode body = http.getOrNull(b -> auth(b.pathSegment("works").pathSegment(id.split("/")).queryParam("select", GRAPH_FIELDS)).build(), JsonNode.class);
    return body == null ? null : toRecord(body);
  }

  /** Works citing {@code openalexId}, most cited first. */
  @Cacheable(cacheNames = "openalex-citing", sync = true)
  public List<SourceRecord> citing(String openalexId, int limit) {
    return list("cites:" + openalexId, limit);
  }

  /** The given works (W-ids), most cited first. */
  @Cacheable(cacheNames = "openalex-by-ids", sync = true)
  public List<SourceRecord> byIds(List<String> openalexIds, int limit) {
    if (openalexIds.isEmpty()) return List.of();
    return list("openalex:" + String.join("|", openalexIds.stream().limit(MAX_IDS_PER_CALL).toList()), limit);
  }

  /** The given works (DOIs), most cited first. */
  @Cacheable(cacheNames = "openalex-by-dois", sync = true)
  public List<SourceRecord> byDois(List<String> dois, int limit) {
    if (dois.isEmpty()) return List.of();
    return list("doi:" + String.join("|", dois.stream().limit(MAX_IDS_PER_CALL).toList()), limit);
  }

  @Cacheable(cacheNames = "openalex-autocomplete", sync = true)
  public List<Suggestion> autocomplete(String query) {
    JsonNode body = http.get(b -> auth(b.path("/autocomplete/works").queryParam("q", query)).build(), JsonNode.class);
    return Json.list(body.path("results"), r -> {
      String doi = PaperKeys.doi(Json.str(r.path("external_id")));
      String arxivId = PaperKeys.arxivFromDoi(doi);
      String id = PaperKeys.idFor(arxivId == null ? doi : null, arxivId, null, PaperKeys.openalex(Json.str(r.path("id"))));
      String title = Json.str(r.path("display_name"));
      return id == null || title == null ? null : new Suggestion(id, title, Json.str(r.path("hint")));
    });
  }

  @Cacheable(cacheNames = "openalex-author-search", sync = true)
  public ResultPage<SourceAuthorProfile> searchAuthors(String query, int page, int perPage) {
    JsonNode body = http.get(b -> auth(b.path("/authors").queryParam("search", query)
            .queryParam("page", page).queryParam("per_page", perPage).queryParam("select", AUTHOR_FIELDS)).build(), JsonNode.class);
    return new ResultPage<>(total(body), Json.list(body.path("results"), OpenAlexClient::toAuthor));
  }

  @Cacheable(cacheNames = "openalex-author", unless = "#result == null")
  public SourceAuthorProfile author(String authorId) {
    JsonNode body = http.getOrNull(b -> auth(b.path("/authors/{id}").queryParam("select", AUTHOR_FIELDS)).build(authorId), JsonNode.class);
    return body == null ? null : toAuthor(body);
  }

  /** Newest first. */
  @Cacheable(cacheNames = "openalex-author-works", sync = true)
  public ResultPage<SourceRecord> authorWorks(String authorId, int page, int perPage) {
    JsonNode body = http.get(b -> auth(b.path("/works").queryParam("filter", "author.id:" + authorId)
            .queryParam("sort", "publication_date:desc").queryParam("page", page).queryParam("per_page", perPage)
            .queryParam("select", WORK_FIELDS)).build(), JsonNode.class);
    return new ResultPage<>(total(body), works(body));
  }

  private List<SourceRecord> list(String filter, int limit) {
    JsonNode body = http.get(b -> auth(b.path("/works").queryParam("filter", filter).queryParam("sort", "cited_by_count:desc")
            .queryParam("per_page", limit).queryParam("select", GRAPH_FIELDS)).build(), JsonNode.class);
    return works(body);
  }

  /** Adds the API key and contact address to every request. */
  private UriBuilder auth(UriBuilder b) {
    if (StringUtils.hasText(properties.getOpenalex().getApiKey())) b.queryParam("api_key", properties.getOpenalex().getApiKey());
    if (StringUtils.hasText(properties.getContactEmail())) b.queryParam("mailto", properties.getContactEmail());
    return b;
  }

  private static int total(JsonNode body) {
    Integer count = Json.integer(body.path("meta").path("count"));
    return count == null ? 0 : count;
  }

  private static List<SourceRecord> works(JsonNode body) {
    return body == null ? List.of() : Json.list(body.path("results"), OpenAlexClient::toRecord);
  }

  static SourceRecord toRecord(JsonNode w) {
    String doi = PaperKeys.doi(Json.str(w.path("doi")));
    JsonNode primary = w.path("primary_location");
    JsonNode bestOa = w.path("best_oa_location");
    String arxivId = PaperKeys.arxivFromDoi(doi);
    if (arxivId != null) doi = null;
    if (arxivId == null) arxivId = PaperKeys.arxivFromUrl(Json.str(bestOa.path("landing_page_url")));
    if (arxivId == null) arxivId = PaperKeys.arxivFromUrl(Json.str(primary.path("landing_page_url")));
    String pdf = Json.str(bestOa.path("pdf_url"));
    List<String> fields = Json.list(w.path("topics"), t -> Json.str(t.path("field").path("display_name")));
    String type = Vocabulary.typeFromOpenAlex(Json.str(w.path("type")));
    return SourceRecord.builder()
            .sources(EnumSet.of(Source.OPENALEX))
            .doi(doi)
            .arxivId(arxivId)
            .pmid(PaperKeys.pmid(Json.str(w.path("ids").path("pmid"))))
            .openalexId(PaperKeys.openalex(Json.str(w.path("id"))))
            .title(PaperKeys.text(Json.str(w.path("display_name"))))
            .authors(Json.list(w.path("authorships"), a -> {
              String name = Json.str(a.path("author").path("display_name"));
              return name == null ? null : new SourceRecord.Author(PaperKeys.openalexAuthor(Json.str(a.path("author").path("id"))), name);
            }))
            .year(Json.integer(w.path("publication_year")))
            .venue(Json.str(primary.path("source").path("display_name")))
            .abstractText(abstractFromIndex(w.path("abstract_inverted_index")))
            .citationCount(Json.integer(w.path("cited_by_count")))
            .referenceCount(Json.integer(w.path("referenced_works_count")))
            .fieldsOfStudy(new ArrayList<>(new LinkedHashSet<>(fields)))
            .publicationTypes(type == null ? List.of() : List.of(type))
            .pdfUrl(pdf)
            .referencedWorks(Json.list(w.path("referenced_works"), r -> PaperKeys.openalex(Json.str(r))))
            .build();
  }

  /** OpenAlex ships abstracts as word to positions; rebuilds the text. */
  static String abstractFromIndex(JsonNode index) {
    if (index == null || !index.isObject() || index.isEmpty()) return null;
    TreeMap<Integer, String> words = new TreeMap<>();
    for (Map.Entry<String, JsonNode> entry : index.properties()) {
      for (JsonNode position : entry.getValue()) words.put(position.asInt(), entry.getKey());
    }
    return PaperKeys.text(String.join(" ", words.values()));
  }

  private static SourceAuthorProfile toAuthor(JsonNode a) {
    String id = PaperKeys.openalexAuthor(Json.str(a.path("id")));
    if (id == null) return null;
    return new SourceAuthorProfile(id, Json.str(a.path("display_name")),
            Json.list(a.path("last_known_institutions"), i -> Json.str(i.path("display_name"))),
            zero(Json.integer(a.path("works_count"))), zero(Json.integer(a.path("cited_by_count"))),
            zero(Json.integer(a.path("summary_stats").path("h_index"))),
            WEB_BASE_URL + id, Json.str(a.path("orcid")));
  }

  private static int zero(Integer value) {
    return value == null ? 0 : value;
  }
}
