package com.acesif.scholarsyncbackend.authors;

import com.acesif.scholarsyncbackend.support.E2ETestBase;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.ResponseEntity;
import tools.jackson.databind.JsonNode;

import static com.acesif.scholarsyncbackend.support.SourceFixtures.*;
import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.assertj.core.api.Assertions.assertThat;

class AuthorApiE2ETest extends E2ETestBase {

  private static final String AUTHORS = "/api/v1/authors";
  private static final String ADA = openAlexAuthor("A123", "Ada Lovelace", 12, 3400, 9);

  @Test
  void searchIsPublicAndMapsAuthors() {
    SOURCES.stubFor(get(urlPathEqualTo("/openalex/authors")).withQueryParam("search", equalTo("lovelace"))
            .willReturn(okJson("{\"meta\":{\"count\":1},\"results\":[" + ADA + ",{\"id\":null,\"display_name\":\"ghost\"}]}")));

    ResponseEntity<String> res = apiGet(AUTHORS + "/search?q= lovelace ", null);

    assertThat(status(res)).isEqualTo(200);
    JsonNode body = json(res);
    assertThat(body.get("total").asInt()).isEqualTo(1);
    assertThat(body.get("items")).hasSize(1);
    JsonNode ada = body.get("items").get(0);
    assertThat(ada.get("id").asString()).isEqualTo("A123");
    assertThat(ada.get("hIndex").asInt()).isEqualTo(9);
    assertThat(ada.get("paperCount").asInt()).isEqualTo(12);
    assertThat(ada.get("affiliations").get(0).asString()).isEqualTo("Analytical Engine Co");
    assertThat(ada.get("url").asString()).isEqualTo("https://openalex.org/A123");
    assertThat(ada.get("homepage").asString()).isEqualTo("https://orcid.org/0000-0001");
    SOURCES.verify(getRequestedFor(urlPathEqualTo("/openalex/authors"))
            .withQueryParam("page", equalTo("1")).withQueryParam("per_page", equalTo("20")));
  }

  @Test
  void searchPagesByPageNumber() {
    SOURCES.stubFor(get(urlPathEqualTo("/openalex/authors")).willReturn(okJson("{\"meta\":{\"count\":0},\"results\":[]}")));
    apiGet(AUTHORS + "/search?q=x&offset=40&limit=20", null);
    SOURCES.verify(getRequestedFor(urlPathEqualTo("/openalex/authors")).withQueryParam("page", equalTo("3")));
  }

  @Test
  void searchWithMissingCountsDefaultsToZero() {
    SOURCES.stubFor(get(urlPathEqualTo("/openalex/authors"))
            .willReturn(okJson("{\"results\":[{\"id\":\"https://openalex.org/A9\",\"display_name\":\"New Person\"}]}")));

    JsonNode body = json(apiGet(AUTHORS + "/search?q=new", null));

    assertThat(body.get("total").asInt()).isZero();
    JsonNode author = body.get("items").get(0);
    assertThat(author.get("paperCount").asInt()).isZero();
    assertThat(author.get("hIndex").asInt()).isZero();
    assertThat(author.get("affiliations")).isEmpty();
  }

  @ParameterizedTest
  @ValueSource(strings = {"", "?q=", "?q= ", "?q=x&limit=0", "?q=x&limit=51", "?q=x&offset=-1", "?q=x&offset=990&limit=20",
          "?q=x&offset=5&limit=20"})
  void invalidSearchIs400(String query) {
    assertThat(status(apiGet(AUTHORS + "/search" + query, null))).as(query).isEqualTo(400);
    SOURCES.verify(0, getRequestedFor(anyUrl()));
  }

  @Test
  void searchRateLimitedIs503() {
    SOURCES.stubFor(get(urlPathEqualTo("/openalex/authors")).willReturn(aResponse().withStatus(429)));
    assertThat(status(apiGet(AUTHORS + "/search?q=busy", null))).isEqualTo(503);
  }

  @Test
  void profileIsPublicAndIdsAreCaseInsensitive() {
    SOURCES.stubFor(get(urlPathEqualTo("/openalex/authors/A123")).willReturn(okJson(ADA)));

    ResponseEntity<String> res = apiGet(AUTHORS + "/a123", null);

    assertThat(status(res)).isEqualTo(200);
    assertThat(json(res).get("citationCount").asInt()).isEqualTo(3400);
  }

  @Test
  void unknownAuthorIs404() {
    assertThat(status(apiGet(AUTHORS + "/A999", null))).isEqualTo(404);
    assertThat(status(apiGet(AUTHORS + "/A999/papers", null))).isEqualTo(404);
  }

  @ParameterizedTest
  @ValueSource(strings = {"/abc", "/123", "/A12a", "/abc/papers", "/A123/papers?limit=0", "/A123/papers?limit=101",
          "/A123/papers?offset=-1", "/A123/papers?offset=10000", "/A123/papers?offset=3&limit=20"})
  void invalidAuthorRequestsAre400(String path) {
    assertThat(status(apiGet(AUTHORS + path, null))).as(path).isEqualTo(400);
  }

  @Test
  void papersArePagedNewestFirstAndMapped() {
    String doi = TEST_DOI_PREFIX + "notes";
    SOURCES.stubFor(get(urlPathEqualTo("/openalex/works")).withQueryParam("filter", equalTo("author.id:A123"))
            .withQueryParam("page", equalTo("2"))
            .willReturn(okJson(openAlexPage(45, openAlexWork("W1843", doi, "Notes", 1843, 500, null, "https://example.org/n.pdf", null)))));

    JsonNode body = json(apiGet(AUTHORS + "/A123/papers?offset=20&limit=20", null));

    assertThat(body.get("offset").asInt()).isEqualTo(20);
    assertThat(body.get("next").asInt()).isEqualTo(40);
    assertThat(body.get("items")).hasSize(1);
    JsonNode paper = body.get("items").get(0);
    assertThat(paper.get("id").asString()).isEqualTo("doi:10.5555~notes");
    assertThat(paper.get("title").asString()).isEqualTo("Notes");
    assertThat(paper.get("openAccess").asBoolean()).isTrue();
    SOURCES.verify(getRequestedFor(urlPathEqualTo("/openalex/works")).withQueryParam("sort", equalTo("publication_date:desc")));
  }

  @Test
  void lastPageHasNullNext() {
    SOURCES.stubFor(get(urlPathEqualTo("/openalex/works")).withQueryParam("filter", equalTo("author.id:A123"))
            .willReturn(okJson(openAlexPage(1, openAlexWork("W1", null, "Only", 2020, 0, null, null, null)))));

    JsonNode body = json(apiGet(AUTHORS + "/A123/papers", null));

    assertThat(body.get("next").isNull()).isTrue();
    assertThat(body.get("items").get(0).get("id").asString()).isEqualTo("openalex:W1");
  }

  @Test
  void profileIsCached() {
    SOURCES.stubFor(get(urlPathEqualTo("/openalex/authors/A123")).willReturn(okJson(ADA)));
    apiGet(AUTHORS + "/A123", null);
    apiGet(AUTHORS + "/A123", null);
    SOURCES.verify(1, getRequestedFor(urlPathEqualTo("/openalex/authors/A123")));
  }
}
