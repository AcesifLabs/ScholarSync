package com.acesif.scholarsyncbackend.integrations.sources.opencitations;

import com.acesif.scholarsyncbackend.integrations.sources.utils.SourceHttpFactory;
import com.acesif.scholarsyncbackend.commons.config.properties.ExternalSourcesProperties;
import com.acesif.scholarsyncbackend.integrations.sources.dtos.*;
import com.acesif.scholarsyncbackend.integrations.sources.enums.*;
import com.acesif.scholarsyncbackend.integrations.sources.utils.*;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import tools.jackson.databind.JsonNode;

import java.util.Arrays;
import java.util.List;
import java.util.Objects;

/** OpenCitations Index v2 (CC0): DOI-to-DOI citation links and counts. No published limit; we stay at 5 per second. */
@Service
public class OpenCitationsClient {

  public static final String SERVICE = "OpenCitations";
  private static final String DOI_SCHEME = "doi:";

  private final SourceHttp http;

  public OpenCitationsClient(ExternalSourcesProperties properties) {
    String token = properties.getOpencitations().getApiKey();
    this.http = SourceHttpFactory.http(SERVICE, properties, properties.getOpencitations(), b -> {
      SourceHttpFactory.json(b);
      if (StringUtils.hasText(token)) b.defaultHeader(HttpHeaders.AUTHORIZATION, token);
    });
  }

  /**
   * The first {@code limit} DOIs that {@code doi} cites; empty if unknown. The API has no paging, so the whole list is
   * downloaded, but only the kept part is cached.
   */
  @Cacheable(cacheNames = "opencitations-references", sync = true)
  public List<String> references(String doi, int limit) {
    return dois(http.getOrNull(b -> b.pathSegment("references").pathSegment(idPath(doi)).build(), JsonNode.class), "cited", limit);
  }

  /** The first {@code limit} DOIs citing {@code doi}; empty if unknown. Same paging caveat as {@link #references}. */
  @Cacheable(cacheNames = "opencitations-citations", sync = true)
  public List<String> citations(String doi, int limit) {
    return dois(http.getOrNull(b -> b.pathSegment("citations").pathSegment(idPath(doi)).build(), JsonNode.class), "citing", limit);
  }

  @Cacheable(cacheNames = "opencitations-count", unless = "#result == null")
  public Integer citationCount(String doi) {
    JsonNode body = http.getOrNull(b -> b.pathSegment("citation-count").pathSegment(idPath(doi)).build(), JsonNode.class);
    return body == null ? null : Json.integer(body.path(0).path("count"));
  }

  /** OpenCitations names a work as {@code doi:<doi>}; split so the DOI's own slashes stay path separators. */
  private static String[] idPath(String doi) {
    return (DOI_SCHEME + doi).split("/");
  }

  /** Each row names a paper as space-separated ids, e.g. "omid:br/06101 doi:10.1/x openalex:W1"; keeps the DOI. */
  private static List<String> dois(JsonNode rows, String side, int limit) {
    if (rows == null) return List.of();
    return Json.list(rows, row -> {
      String ids = Json.str(row.path(side));
      return ids == null ? null : Arrays.stream(ids.split("\\s+")).filter(id -> id.startsWith(DOI_SCHEME))
              .map(PaperKeys::doi).filter(Objects::nonNull).findFirst().orElse(null);
    }).stream().distinct().limit(limit).toList();
  }
}
