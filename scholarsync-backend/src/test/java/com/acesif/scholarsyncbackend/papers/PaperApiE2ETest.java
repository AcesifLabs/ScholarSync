package com.acesif.scholarsyncbackend.papers;

import com.acesif.scholarsyncbackend.commons.config.properties.ExternalSourcesProperties;
import com.acesif.scholarsyncbackend.commons.config.properties.SearchProperties;
import com.acesif.scholarsyncbackend.papers.entities.Paper;
import com.acesif.scholarsyncbackend.papers.repositories.PaperRepository;
import com.acesif.scholarsyncbackend.papers.services.SearchCacheService;
import com.acesif.scholarsyncbackend.integrations.sources.utils.PaperKeys;
import com.acesif.scholarsyncbackend.support.E2ETestBase;
import com.github.tomakehurst.wiremock.stubbing.Scenario;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import tools.jackson.databind.JsonNode;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.stream.StreamSupport;

import static com.acesif.scholarsyncbackend.support.SourceFixtures.*;
import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.assertj.core.api.Assertions.assertThat;

class PaperApiE2ETest extends E2ETestBase {

  private static final String SEARCH = "/api/v1/papers/search";
  private static final String PAPERS = "/api/v1/papers/";

  @Autowired
  private PaperRepository paperRepository;

  @Autowired
  private SearchProperties searchProperties;

  @Autowired
  private ExternalSourcesProperties externalSources;

  @Autowired
  private SearchCacheService searchCacheService;

  /** Unique per call, so papers stored by earlier tests never merge into this one. */
  private static String doi(String name) {
    return TEST_DOI_PREFIX + name + "-" + UUID.randomUUID();
  }

  private static String wid() {
    return "W" + (UUID.randomUUID().getMostSignificantBits() & 0xffffffffffL);
  }

  private static String arxivId() {
    return "2401." + String.format("%05d", (int) (Math.random() * 99999));
  }

  private static String key(String doi) {
    return "doi:" + doi.replace('/', '~');
  }

  private static void openAlexSearch(String... works) {
    SOURCES.stubFor(get(urlPathEqualTo("/openalex/works")).willReturn(okJson(openAlexPage(works.length, works))));
  }

  private static void crossrefSearch(String... items) {
    SOURCES.stubFor(get(urlPathEqualTo("/crossref/works")).willReturn(okJson(crossrefPage(items))));
  }

  private static void europePmcSearch(String... results) {
    SOURCES.stubFor(get(urlPathEqualTo("/europepmc/search")).willReturn(okJson(europePmcPage(results))));
  }

  private static void arxivSearch(String... entries) {
    SOURCES.stubFor(get(urlPathEqualTo("/arxiv/query"))
            .willReturn(aResponse().withHeader("Content-Type", "application/atom+xml").withBody(arxivFeed(entries))));
  }

  /** One OpenAlex result so searches have something to cache. */
  private static void anyResult() {
    openAlexSearch(openAlexWork(wid(), doi("any"), "Any paper", 2020, 1, null, null, null));
  }

  private static int sourceCalls() {
    return SOURCES.findAll(anyRequestedFor(anyUrl())).size();
  }

  private static List<String> ids(JsonNode body) {
    return StreamSupport.stream(body.get("items").spliterator(), false).map(i -> i.get("id").asString()).toList();
  }

  private JsonNode search(String query) {
    ResponseEntity<String> res = apiGet(SEARCH + query, null);
    assertThat(status(res)).as(res.getBody()).isEqualTo(200);
    return json(res);
  }

  @Test
  void theSamePaperFromEverySourceBecomesOneRecordWithTheBestOfEachField() {
    String shared = doi("attention");
    String arxiv = arxivId();
    String longAbstract = "We propose the Transformer, a model architecture based solely on attention mechanisms, dispensing with recurrence.";
    openAlexSearch(openAlexWork(wid(), shared, "Attention Is All You Need", 2017, 900, "Short abstract.", null, "Computer Science"));
    crossrefSearch(crossrefItem(shared, "Attention is all you need", 2017, "NeurIPS", 950, "<jats:p>Crossref abstract</jats:p>"),
            crossrefItem(doi("other"), "Another paper", 2016, "ICML", 3, null));
    europePmcSearch(europePmcResult("31000001", shared, "Attention is all you need.", 2017, longAbstract, 40, null));
    arxivSearch(arxivEntry(arxiv, "Attention Is All You Need", 2017, "arXiv abstract", shared, "cs.CL"));

    JsonNode body = search("?q=attention");

    assertThat(body.get("total").asInt()).isEqualTo(2);
    JsonNode merged = body.get("items").get(0);
    assertThat(merged.get("id").asString()).isEqualTo(key(shared));
    assertThat(merged.get("venue").asString()).isEqualTo("NeurIPS");
    assertThat(merged.get("citationCount").asInt()).isEqualTo(950);
    assertThat(merged.get("abstractText").asString()).isEqualTo(longAbstract);
    assertThat(merged.get("openAccess").asBoolean()).isTrue();
    assertThat(merged.get("hasPdf").asBoolean()).isTrue();
    assertThat(merged.get("sources")).extracting(JsonNode::asString)
            .containsExactlyInAnyOrder("openalex", "crossref", "europepmc", "arxiv");
    assertThat(body.get("items").get(1).get("sources")).extracting(JsonNode::asString).containsExactly("crossref");
    assertThat(merged.get("authors").get(0).get("id").asString()).isEqualTo("A1");

    Paper stored = paperRepository.findById(key(shared)).orElseThrow();
    assertThat(stored.getSources()).containsExactlyInAnyOrder("openalex", "crossref", "europepmc", "arxiv");
    assertThat(stored.getPmid()).isEqualTo("31000001");
    assertThat(stored.getArxivId()).isEqualTo(arxiv);
    assertThat(stored.getOpenAccessPdfUrl()).isEqualTo("https://arxiv.org/pdf/" + arxiv + "v2");
    assertThat(stored.getFieldsOfStudy()).containsExactly("Computer Science");

    JsonNode detail = json(apiGet(PAPERS + key(shared), null));
    assertThat(detail.get("sources")).hasSize(4);
    assertThat(detail.get("externalIds").get("PubMed").asString()).isEqualTo("31000001");
    assertThat(detail.get("externalIds").get("ArXiv").asString()).isEqualTo(arxiv);
  }

  @Test
  void preprintsMergeByArxivIdAndRecordsWithoutDoiMergeByTitleAndYear() {
    String arxiv = arxivId();
    String journalDoi = doi("journal");
    // OpenAlex names the preprint by arXiv's DataCite DOI; arXiv names it by its id
    openAlexSearch(openAlexWork(wid(), "10.48550/arxiv." + arxiv, "Graph Networks", 2023, 12, null, null, "Computer Science"));
    arxivSearch(arxivEntry(arxiv, "Graph networks", 2023, "Preprint abstract", null, "cs.LG"));
    // Europe PMC has no DOI for the journal version; Crossref has it a year later
    crossrefSearch(crossrefItem(journalDoi, "Protein folding at scale", 2021, "Nature", 30, null));
    europePmcSearch(europePmcResult("32000002", null, "Protein Folding at Scale!", 2020, "PMC abstract", 25, null));

    JsonNode body = search("?q=graph+networks");

    assertThat(body.get("total").asInt()).isEqualTo(2);
    assertThat(ids(body)).containsExactlyInAnyOrder("arxiv:" + arxiv, key(journalDoi));
    Paper journal = paperRepository.findById(key(journalDoi)).orElseThrow();
    assertThat(journal.getPmid()).isEqualTo("32000002");
    assertThat(journal.getAbstractText()).isEqualTo("PMC abstract");
  }

  @Test
  void differentDoisWithTheSameTitleStaySeparate() {
    crossrefSearch(crossrefItem(doi("a"), "Introduction", 2020, "J1", 1, null), crossrefItem(doi("b"), "Introduction", 2020, "J2", 2, null));
    assertThat(search("?q=introduction").get("total").asInt()).isEqualTo(2);
  }

  @Test
  void aSecondSearchMergesIntoTheStoredPaperInsteadOfDuplicatingIt() {
    String shared = doi("twice");
    String w = wid();
    openAlexSearch(openAlexWork(w, shared, "Twice", 2020, 5, null, null, null));
    search("?q=first+query");

    // later only Europe PMC finds it, by DOI, with a PMID and more citations
    openAlexSearch();
    europePmcSearch(europePmcResult("33000003", shared, "Twice", 2020, "Now with an abstract", 9, null));
    search("?q=second+query+entirely");

    Paper stored = paperRepository.findById(key(shared)).orElseThrow();
    assertThat(stored.getOpenalexId()).isEqualTo(w);
    assertThat(stored.getPmid()).isEqualTo("33000003");
    assertThat(stored.getCitationCount()).isEqualTo(9);
    assertThat(stored.getSources()).containsExactlyInAnyOrder("openalex", "europepmc");
  }

  @Test
  void searchIsPublicAndAcceptsATokenAndPagesThroughTheMergedList() {
    openAlexSearch(openAlexWork(wid(), doi("p1"), "One", 2020, 30, null, null, null),
            openAlexWork(wid(), doi("p2"), "Two", 2021, 20, null, null, null),
            openAlexWork(wid(), doi("p3"), "Three", 2022, 10, null, null, null));

    JsonNode page = json(apiGet(SEARCH + "?q=paging&offset=1&limit=1", tokenFor(createUser("Searcher"))));

    assertThat(page.get("total").asInt()).isEqualTo(3);
    assertThat(page.get("items")).hasSize(1);
    assertThat(page.get("items").get(0).get("title").asString()).isEqualTo("Two");
    assertThat(search("?q=paging&offset=5").get("items")).isEmpty();
  }

  @Test
  void citationSortOrdersByCitationsAndSkipsArxiv() {
    openAlexSearch(openAlexWork(wid(), doi("low"), "Low", 2020, 5, null, null, null));
    crossrefSearch(crossrefItem(doi("high"), "High", 2020, "J", 500, null), crossrefItem(doi("unknown"), "Unknown", 2020, "J", null, null));

    JsonNode body = search("?q=sorted&sort=citations");

    assertThat(StreamSupport.stream(body.get("items").spliterator(), false).map(i -> i.get("title").asString()))
            .containsExactly("High", "Low", "Unknown");
    SOURCES.verify(0, getRequestedFor(urlPathEqualTo("/arxiv/query")));
    SOURCES.verify(getRequestedFor(urlPathEqualTo("/openalex/works")).withQueryParam("sort", equalTo("cited_by_count:desc")));
    SOURCES.verify(getRequestedFor(urlPathEqualTo("/crossref/works")).withQueryParam("sort", equalTo("is-referenced-by-count")));
  }

  @Test
  void recentSortIsCaseInsensitiveAndOrdersByYear() {
    openAlexSearch(openAlexWork(wid(), doi("old"), "Old", 2001, 5, null, null, null),
            openAlexWork(wid(), doi("new"), "New", 2024, 5, null, null, null));

    JsonNode body = search("?q=recent&sort=RECENT");

    assertThat(body.get("items").get(0).get("title").asString()).isEqualTo("New");
    SOURCES.verify(getRequestedFor(urlPathEqualTo("/arxiv/query")).withQueryParam("sortBy", equalTo("submittedDate")));
  }

  @Test
  void filtersArePushedToEachSource() {
    search("?q=graphs&yearFrom=2019&yearTo=2021&fields=27,17&minCitations=10&openAccess=true&types=review");

    SOURCES.verify(getRequestedFor(urlPathEqualTo("/openalex/works"))
            .withQueryParam("search", equalTo("graphs"))
            .withQueryParam("filter", equalTo("publication_year:2019-2021,cited_by_count:>9,is_oa:true,topics.field.id:17|27,type:review"))
            .withQueryParam("api_key", equalTo("test-openalex-key"))
            .withQueryParam("mailto", equalTo("tests@example.com")));
    SOURCES.verify(getRequestedFor(urlPathEqualTo("/crossref/works"))
            .withQueryParam("query.bibliographic", equalTo("graphs"))
            .withQueryParam("filter", equalTo("from-pub-date:2019,until-pub-date:2021-12-31"))
            .withQueryParam("mailto", equalTo("tests@example.com")));
    SOURCES.verify(getRequestedFor(urlPathEqualTo("/europepmc/search"))
            .withQueryParam("query", equalTo("(graphs) AND PUB_YEAR:[2019 TO 2021] AND OPEN_ACCESS:y")));
    SOURCES.verify(getRequestedFor(urlPathEqualTo("/arxiv/query"))
            .withQueryParam("search_query", equalTo("all:graphs AND submittedDate:[201901010000 TO 202112312359]")));
  }

  @Test
  void filtersAreStrictForPapersMissingTheField() {
    String arxiv = arxivId();
    openAlexSearch(openAlexWork(wid(), doi("cited"), "Cited", 2020, 50, null, "https://example.org/a.pdf", "Medicine"));
    arxivSearch(arxivEntry(arxiv, "Uncounted", 2020, "No citation count anywhere", null, "q-bio.BM"));
    crossrefSearch(crossrefItem(doi("nofield"), "No field", 2020, "Lancet", 80, null));

    assertThat(search("?q=strict&minCitations=10").get("items")).extracting(i -> i.get("title").asString())
            .containsExactlyInAnyOrder("Cited", "No field");
    assertThat(search("?q=strict&fields=27").get("items")).extracting(i -> i.get("title").asString())
            .containsExactly("Cited");
    assertThat(search("?q=strict&openAccess=true").get("items")).extracting(i -> i.get("title").asString())
            .containsExactlyInAnyOrder("Cited", "Uncounted");
    assertThat(search("?q=strict&venue=lanc").get("items")).extracting(i -> i.get("title").asString())
            .containsExactly("No field");
    assertThat(search("?q=strict&types=preprint").get("items")).extracting(i -> i.get("title").asString())
            .containsExactly("Uncounted");
  }

  @ParameterizedTest
  @ValueSource(strings = {
          "", "?q=", "?q=  ", "?q=x&limit=0", "?q=x&limit=51", "?q=x&offset=-1", "?q=x&limit=abc",
          "?q=x&yearFrom=2022&yearTo=2020", "?q=x&yearFrom=1700", "?q=x&yearTo=3000", "?q=x&sort=popular",
          "?q=x&minCitations=-5", "?q=x&fields=999", "?q=x&fields=abc", "?q=x&types=JournalArticle"
  })
  void invalidSearchInputIs400(String query) {
    ResponseEntity<String> res = apiGet(SEARCH + query, null);
    assertThat(status(res)).as(query).isEqualTo(400);
    assertThat(sourceCalls()).isZero();
  }

  @Test
  void queryLongerThan300CharactersIs400() {
    assertThat(status(apiGet(SEARCH + "?q=" + "a".repeat(301), null))).isEqualTo(400);
  }

  @Test
  void anIdenticalSearchIsServedFromTheCache() {
    anyResult();
    JsonNode first = search("?q=cache+me&fields=27,16");
    SOURCES.resetRequests();

    JsonNode second = search("?q=Cache,+ME!&fields=16,27");

    assertThat(sourceCalls()).isZero();
    assertThat(ids(second)).isEqualTo(ids(first));
    searchCacheService.flushHits();
    assertThat(jdbc.queryForObject("SELECT hit_count FROM search_cache", Integer.class)).isEqualTo(1);
  }

  @Test
  void wordOrderAndAccentsDoNotMatter() {
    anyResult();
    search("?q=neural+graph+networks");
    SOURCES.resetRequests();

    search("?q=Networks+GRAPH+néural");

    assertThat(sourceCalls()).isZero();
  }

  @Test
  void aTypoOrPluralIsServedThroughTrigramSimilarity() {
    anyResult();
    search("?q=convolutional+neural+networks+for+images");
    SOURCES.resetRequests();

    search("?q=convolutional+neural+network+for+image");

    assertThat(sourceCalls()).isZero();
  }

  @Test
  void aParaphraseIsServedThroughEmbeddingSimilarity() {
    double trigram = searchProperties.getCache().getTrigramThreshold();
    searchProperties.getCache().setTrigramThreshold(1.1); // only the vector layer can match
    try {
      anyResult();
      search("?q=how+do+vaccines+train+the+immune+system");
      SOURCES.resetRequests();

      search("?q=how+vaccines+train+our+immune+systems");

      assertThat(sourceCalls()).isZero();
    } finally {
      searchProperties.getCache().setTrigramThreshold(trigram);
    }
  }

  @Test
  void aDifferentYearInTheQueryIsNeverServedFromAnotherYear() {
    anyResult();
    search("?q=bert+language+models+2019");
    SOURCES.resetRequests();

    search("?q=bert+language+models+2020");

    assertThat(sourceCalls()).isPositive();
  }

  @Test
  void shortQueriesOnlyMatchExactly() {
    anyResult();
    search("?q=gan");
    SOURCES.resetRequests();

    search("?q=gnn");

    assertThat(sourceCalls()).isPositive();
  }

  @Test
  void changedFiltersOrSortAreNotServedFromTheCache() {
    anyResult();
    search("?q=filters+matter");
    SOURCES.resetRequests();

    search("?q=filters+matter&yearFrom=2020");
    search("?q=filters+matter&sort=recent");

    SOURCES.verify(2, getRequestedFor(urlPathEqualTo("/openalex/works")));
  }

  @Test
  void anExpiredEntryIsFetchedAgain() {
    anyResult();
    search("?q=expiring+entry");
    jdbc.update("UPDATE search_cache SET expires_at = now() - interval '1 second'");
    SOURCES.resetRequests();

    search("?q=expiring+entry");

    SOURCES.verify(1, getRequestedFor(urlPathEqualTo("/openalex/works")));
    assertThat(jdbc.queryForObject("SELECT count(*) FROM search_cache", Integer.class)).isEqualTo(1);
  }

  @Test
  void concurrentIdenticalSearchesShareOneCallPerSource() {
    SOURCES.stubFor(get(urlPathEqualTo("/openalex/works")).willReturn(okJson(openAlexPage(1,
            openAlexWork(wid(), doi("slow"), "Slow", 2020, 1, null, null, null))).withFixedDelay(700)));

    List<CompletableFuture<ResponseEntity<String>>> requests = List.of(
            CompletableFuture.supplyAsync(() -> apiGet(SEARCH + "?q=at+the+same+time", null)),
            CompletableFuture.supplyAsync(() -> apiGet(SEARCH + "?q=at+the+same+time", null)));

    requests.forEach(r -> assertThat(status(r.join())).isEqualTo(200));
    SOURCES.verify(1, getRequestedFor(urlPathEqualTo("/openalex/works")));
    SOURCES.verify(1, getRequestedFor(urlPathEqualTo("/crossref/works")));
  }

  @Test
  void aFailingSourceGivesAPartialResultThatExpiresWithinAnHour() {
    anyResult();
    SOURCES.stubFor(get(urlPathEqualTo("/crossref/works")).willReturn(aResponse().withStatus(500)));

    JsonNode body = search("?q=partial+result");

    assertThat(body.get("total").asInt()).isEqualTo(1);
    Map<String, Object> entry = jdbc.queryForMap("SELECT complete, expires_at, array_to_string(sources_ok, ',') AS ok FROM search_cache");
    assertThat(entry.get("complete")).isEqualTo(false);
    assertThat(entry.get("ok")).isEqualTo("arxiv,europepmc,openalex");
    assertThat(((Timestamp) entry.get("expires_at")).toInstant()).isBefore(Instant.now().plus(Duration.ofHours(1)).plusSeconds(5));
  }

  @Test
  void aSlowSourceIsLeftOut() {
    anyResult();
    SOURCES.stubFor(get(urlPathEqualTo("/europepmc/search")).willReturn(okJson(europePmcPage()).withFixedDelay(3000)));

    search("?q=slow+source");

    assertThat(jdbc.queryForObject("SELECT complete FROM search_cache", Boolean.class)).isFalse();
  }

  @Test
  void everySourceRateLimitingIs503() {
    for (String path : List.of("/openalex/works", "/crossref/works", "/europepmc/search", "/arxiv/query")) {
      SOURCES.stubFor(get(urlPathEqualTo(path)).willReturn(aResponse().withStatus(429)));
    }

    ResponseEntity<String> res = apiGet(SEARCH + "?q=busy", null);

    assertThat(status(res)).isEqualTo(503);
    assertThat(json(res).get("detail").asString()).contains("rate limiting");
    SOURCES.verify(3, getRequestedFor(urlPathEqualTo("/openalex/works")));
    assertThat(jdbc.queryForObject("SELECT count(*) FROM search_cache", Integer.class)).isZero();
  }

  @Test
  void everySourceFailingIs502() {
    for (String path : List.of("/openalex/works", "/crossref/works", "/europepmc/search", "/arxiv/query")) {
      SOURCES.stubFor(get(urlPathEqualTo(path)).willReturn(aResponse().withStatus(500)));
    }
    assertThat(status(apiGet(SEARCH + "?q=broken", null))).isEqualTo(502);
  }

  @Test
  void aSingleRateLimitIsRecoveredByRetry() {
    String d = doi("retried");
    SOURCES.stubFor(get(urlPathEqualTo("/openalex/works")).inScenario("retry").whenScenarioStateIs(Scenario.STARTED)
            .willReturn(aResponse().withStatus(429)).willSetStateTo("ok"));
    SOURCES.stubFor(get(urlPathEqualTo("/openalex/works")).inScenario("retry").whenScenarioStateIs("ok")
            .willReturn(okJson(openAlexPage(1, openAlexWork(wid(), d, "Retried", 2020, 1, null, null, null)))));

    JsonNode body = search("?q=retry");

    assertThat(ids(body)).containsExactly(key(d));
    assertThat(jdbc.queryForObject("SELECT complete FROM search_cache", Boolean.class)).isTrue();
  }

  @Test
  void autocompleteReturnsPaperIds() {
    String d = doi("auto");
    SOURCES.stubFor(get(urlPathEqualTo("/openalex/autocomplete/works")).withQueryParam("q", equalTo("atten"))
            .willReturn(okJson("""
                    {"results":[{"id":"https://openalex.org/W9","display_name":"Attention","hint":"Vaswani, 2017","external_id":"https://doi.org/%s"},
                                {"id":"https://openalex.org/W8","display_name":"No DOI","hint":null,"external_id":null},
                                {"id":"https://openalex.org/W7","display_name":"Preprint","external_id":"https://doi.org/10.48550/arXiv.1706.03762"},
                                {"id":null,"display_name":null}]}
                    """.formatted(d))));

    JsonNode matches = json(apiGet("/api/v1/papers/autocomplete?q=atten", null)).get("matches");

    assertThat(matches).hasSize(3);
    assertThat(matches.get(0).get("id").asString()).isEqualTo(key(d));
    assertThat(matches.get(0).get("authorsYear").asString()).isEqualTo("Vaswani, 2017");
    assertThat(matches.get(1).get("id").asString()).isEqualTo("openalex:W8");
    assertThat(matches.get(2).get("id").asString()).isEqualTo("arxiv:1706.03762");
  }

  @ParameterizedTest
  @ValueSource(strings = {"", "?q=", "?q= "})
  void autocompleteWithoutQueryIs400(String query) {
    assertThat(status(apiGet("/api/v1/papers/autocomplete" + query, null))).isEqualTo(400);
  }

  @Test
  void autocompleteQueryOver100CharactersIs400() {
    assertThat(status(apiGet("/api/v1/papers/autocomplete?q=" + "a".repeat(101), null))).isEqualTo(400);
  }

  @Test
  void detailIsFetchedFromEverySourceThatKnowsTheDoiThenServedFromTheDatabase() {
    String id = paperKey("detail");
    String d = doiOf(id);
    SOURCES.stubFor(get(urlPathEqualTo(openAlexPath(id))).willReturn(okJson(
            openAlexWork(wid(), d, "Detail", 2019, 70, "Short", "https://example.org/d.pdf", "Physics and Astronomy"))));
    SOURCES.stubFor(get(urlPathEqualTo("/crossref/works/" + d)).willReturn(okJson(crossrefSingle(
            crossrefItem(d, "Detail: the full title", 2019, "Physical Review", 72, "<jats:title>Abstract</jats:title><jats:p>Longer abstract text</jats:p>")))));
    SOURCES.stubFor(get(urlPathEqualTo("/opencitations/citation-count/doi:" + d)).willReturn(okJson("[{\"count\":\"81\"}]")));

    ResponseEntity<String> res = apiGet(PAPERS + id, null);

    assertThat(status(res)).isEqualTo(200);
    JsonNode body = json(res);
    assertThat(body.get("id").asString()).isEqualTo(id);
    assertThat(body.get("title").asString()).isEqualTo("Detail: the full title");
    assertThat(body.get("abstractText").asString()).isEqualTo("Longer abstract text");
    assertThat(body.get("citationCount").asInt()).isEqualTo(81);
    assertThat(body.get("referenceCount").asInt()).isEqualTo(7);
    assertThat(body.get("hasPdf").asBoolean()).isTrue();
    assertThat(body.get("externalIds").get("DOI").asString()).isEqualTo(d);
    assertThat(body.get("sources")).extracting(JsonNode::asString).containsExactly("crossref", "openalex", "opencitations");

    SOURCES.resetRequests();
    clearCaches();
    assertThat(status(apiGet(PAPERS + id, null))).isEqualTo(200);
    assertThat(sourceCalls()).isZero();
  }

  @Test
  void aStalePaperIsRefreshed() {
    String id = paperKey("stale");
    stubPaper(id, "Old title");
    apiGet(PAPERS + id, null);
    jdbc.update("UPDATE papers SET fetched_at = now() - interval '31 days' WHERE id = ?", id);
    stubPaper(id, "New title");
    clearCaches();

    assertThat(json(apiGet(PAPERS + id, null)).get("title").asString()).isEqualTo("New title");
  }

  @Test
  void aStalePaperIsStillServedWhileTheSourcesFail() {
    String id = paperKey("fallback");
    stubPaper(id, "Fallback");
    apiGet(PAPERS + id, null);
    jdbc.update("UPDATE papers SET fetched_at = now() - interval '31 days' WHERE id = ?", id);
    SOURCES.stubFor(get(urlPathMatching("/(openalex|crossref|opencitations)/.*")).willReturn(aResponse().withStatus(429)));
    clearCaches();

    ResponseEntity<String> res = apiGet(PAPERS + id, null);

    assertThat(status(res)).isEqualTo(200);
    assertThat(json(res).get("title").asString()).isEqualTo("Fallback");
  }

  @Test
  void aPaperWithMissingOptionalFieldsStillMaps() {
    String id = paperKey("sparse");
    SOURCES.stubFor(get(urlPathEqualTo(openAlexPath(id))).willReturn(okJson(
            "{\"id\":\"https://openalex.org/" + wid() + "\",\"doi\":\"https://doi.org/" + doiOf(id) + "\",\"display_name\":\"Sparse\"}")));

    JsonNode body = json(apiGet(PAPERS + id, null));

    assertThat(body.get("title").asString()).isEqualTo("Sparse");
    assertThat(body.get("authors")).isEmpty();
    assertThat(body.get("year").isNull()).isTrue();
    assertThat(body.get("hasPdf").asBoolean()).isFalse();
  }

  @Test
  void anUnknownPaperIs404() {
    assertThat(status(apiGet(PAPERS + paperKey("missing"), null))).isEqualTo(404);
  }

  @ParameterizedTest
  @ValueSource(strings = {"legacy-s2-id", "doi:not-a-doi", "pmid:abc", "openalex:X1", "isbn:123", "doi:10.1~..~..~x",
          "doi:10.1~.~x", "doi64:!!!", "arxiv:..~x"})
  void anIdThatIsNotAPaperKeyIs404WithoutCallingSources(String id) {
    assertThat(status(apiGet(PAPERS + id, null))).as(id).isEqualTo(404);
    assertThat(sourceCalls()).isZero();
  }

  @Test
  void aRateLimitedLookupWithoutAStoredRowIs503() {
    String id = paperKey("nocache");
    SOURCES.stubFor(get(urlPathEqualTo(openAlexPath(id))).willReturn(aResponse().withStatus(429)));
    assertThat(status(apiGet(PAPERS + id, null))).isEqualTo(503);
  }

  @Test
  void otherIdKindsAreLookedUpByTheirOwnSource() {
    String w = wid();
    SOURCES.stubFor(get(urlPathEqualTo("/openalex/works/" + w)).willReturn(okJson(openAlexWork(w, null, "By OpenAlex id", 2020, 1, null, null, null))));
    SOURCES.stubFor(get(urlPathEqualTo("/europepmc/search")).withQueryParam("query", equalTo("EXT_ID:34000004 AND SRC:MED"))
            .willReturn(okJson(europePmcPage(europePmcResult("34000004", null, "By PMID", 2021, "abs", 2, null)))));
    // old-style arXiv ids contain a slash, which the id carries as '~'
    SOURCES.stubFor(get(urlPathEqualTo("/arxiv/query")).withQueryParam("id_list", equalTo("hep-th/9901001"))
            .willReturn(aResponse().withBody(arxivFeed(arxivEntry("hep-th/9901001", "By arXiv id", 1999, "abs", null, "hep-th")))));

    assertThat(json(apiGet(PAPERS + "openalex:" + w, null)).get("title").asString()).isEqualTo("By OpenAlex id");
    assertThat(json(apiGet(PAPERS + "pmid:34000004", null)).get("title").asString()).isEqualTo("By PMID");
    JsonNode arxiv = json(apiGet(PAPERS + "arxiv:hep-th~9901001", null));
    assertThat(arxiv.get("id").asString()).isEqualTo("arxiv:hep-th~9901001");
    assertThat(arxiv.get("venue").asString()).isEqualTo("arXiv");
    assertThat(arxiv.get("fieldsOfStudy").get(0).asString()).isEqualTo("Physics and Astronomy");
  }

  @Test
  void anArxivDataCiteDoiIdIsLookedUpAsTheArxivPaper() {
    SOURCES.stubFor(get(urlPathEqualTo("/arxiv/query")).withQueryParam("id_list", equalTo("2402.00002"))
            .willReturn(aResponse().withBody(arxivFeed(arxivEntry("2402.00002", "DataCite preprint", 2024, "abs", null, "cs.AI")))));

    JsonNode body = json(apiGet(PAPERS + "doi:10.48550~arXiv.2402.00002", null));

    assertThat(body.get("id").asString()).isEqualTo("arxiv:2402.00002");
  }

  @Test
  void anIdNamingAStoredPapersIdentifierFindsThatPaper() {
    String id = paperKey("alias");
    stubPaper(id, "Alias");
    apiGet(PAPERS + id, null);
    String w = paperRepository.findById(id).orElseThrow().getOpenalexId();
    SOURCES.resetRequests();

    JsonNode body = json(apiGet(PAPERS + "openalex:" + w, null));

    assertThat(body.get("id").asString()).isEqualTo(id);
    assertThat(sourceCalls()).isZero();
  }

  @Test
  void unpaywallIsNotCalledWhileDisabled() {
    String id = paperKey("nounpaywall");
    stubPaper(id, "No PDF");

    assertThat(json(apiGet(PAPERS + id, null)).get("hasPdf").asBoolean()).isFalse();
    SOURCES.verify(0, getRequestedFor(urlPathMatching("/unpaywall/.*")));
  }

  @Test
  void unpaywallSuppliesAMissingPdfWhenEnabled() {
    String id = paperKey("unpaywall");
    stubPaper(id, "Paywalled");
    SOURCES.stubFor(get(urlPathEqualTo("/unpaywall/v2/" + doiOf(id))).withQueryParam("email", equalTo("tests@example.com"))
            .willReturn(okJson("{\"best_oa_location\":{\"url_for_pdf\":\"https://repo.example.org/p.pdf\"}}")));
    externalSources.getUnpaywall().setEnabled(true);
    try {
      JsonNode body = json(apiGet(PAPERS + id, null));

      assertThat(body.get("hasPdf").asBoolean()).isTrue();
      assertThat(body.get("sources")).extracting(JsonNode::asString).contains("unpaywall");
      assertThat(paperRepository.findById(id).orElseThrow().getOpenAccessPdfUrl()).isEqualTo("https://repo.example.org/p.pdf");
    } finally {
      externalSources.getUnpaywall().setEnabled(false);
    }
  }

  @Test
  void fieldsTravelAsIdsSoNamesContainingCommasWork() {
    openAlexSearch(openAlexWork(wid(), doi("econ"), "Market design", 2020, 5, null, null, "Economics, Econometrics and Finance"));

    JsonNode body = search("?q=markets&fields=20");

    assertThat(body.get("items")).extracting(i -> i.get("title").asString()).containsExactly("Market design");
    SOURCES.verify(getRequestedFor(urlPathEqualTo("/openalex/works")).withQueryParam("filter", equalTo("topics.field.id:20")));
  }

  @Test
  void aFilterValueCannotStandInForADifferentFilterSet() {
    anyResult();
    search("?q=collision+check&venue=Nature|Science");
    SOURCES.resetRequests();

    search("?q=collision+check&venue=Nature&venue=Science");

    assertThat(sourceCalls()).isPositive();
  }

  @Test
  void symbolsThatNameATopicKeepQueriesApart() {
    anyResult();
    assertThat(status(apiGetEncoded(SEARCH + "?q=c%2B%2B+concurrency"))).isEqualTo(200);
    SOURCES.resetRequests();

    assertThat(status(apiGetEncoded(SEARCH + "?q=c+concurrency"))).isEqualTo(200);

    assertThat(sourceCalls()).isPositive();
  }

  @Test
  void europePmcGetsPlainSearchWords() {
    search("?q=BERT: pre-training (deep) AND transformers");

    SOURCES.verify(getRequestedFor(urlPathEqualTo("/europepmc/search"))
            .withQueryParam("query", equalTo("(BERT\\: pre\\-training \\(deep\\) and transformers)")));
  }

  @Test
  void aRejectedEuropePmcQueryMakesThePartialResultExpireSoon() {
    anyResult();
    SOURCES.stubFor(get(urlPathEqualTo("/europepmc/search")).willReturn(aResponse().withStatus(400)));

    search("?q=rejected+by+europe+pmc");

    assertThat(jdbc.queryForObject("SELECT complete FROM search_cache", Boolean.class)).isFalse();
  }

  @Test
  void genericTitlesDoNotJoinRecordsWithDifferentIdentifiers() {
    crossrefSearch(crossrefItem(doi("editorial"), "Editorial", 2020, "J", 1, null));
    europePmcSearch(europePmcResult("35000005", null, "Editorial.", 2020, "Another journal's editorial", 0, null));

    assertThat(search("?q=editorial").get("total").asInt()).isEqualTo(2);
  }

  @Test
  void aStoredPdfIsNotSwappedByALaterSearch() {
    String shared = doi("pdfkeep");
    String arxiv = arxivId();
    openAlexSearch(openAlexWork(wid(), shared, "Keeps its PDF", 2021, 3, null, "https://publisher.example.org/a.pdf", null));
    search("?q=first+pdf+query");

    openAlexSearch();
    arxivSearch(arxivEntry(arxiv, "Keeps its PDF", 2021, "abs", shared, "cs.LG"));
    search("?q=second+pdf+query+later");

    assertThat(paperRepository.findById(key(shared)).orElseThrow().getOpenAccessPdfUrl()).isEqualTo("https://publisher.example.org/a.pdf");
  }

  @Test
  void aRecordWhoseIdentifiersBelongToTwoStoredPapersKeepsBothPapers() {
    String doiOfA = doi("owner-a");
    String arxivOfB = arxivId();
    openAlexSearch(openAlexWork(wid(), doiOfA, "Paper A", 2020, 1, null, null, null));
    search("?q=store+paper+a");
    openAlexSearch();
    arxivSearch(arxivEntry(arxivOfB, "Paper B", 2020, "abs", null, "cs.LG"));
    search("?q=store+paper+b");

    // OpenAlex now says one work has A's DOI and B's arXiv id
    arxivSearch();
    openAlexSearch(openAlexWork(wid(), doiOfA, "Paper A", 2020, 2, null, "https://arxiv.org/pdf/" + arxivOfB, null)
            .replace("https://example.org/oa", "https://arxiv.org/abs/" + arxivOfB));
    search("?q=links+both+papers");

    Paper a = paperRepository.findById(key(doiOfA)).orElseThrow();
    Paper b = paperRepository.findById("arxiv:" + arxivOfB).orElseThrow();
    assertThat(a.getArxivId()).isNull();
    assertThat(b.getArxivId()).isEqualTo(arxivOfB);
  }

  @Test
  void aStaleRefreshUpdatesTheRequestedPaperEvenWhenAnotherOwnsTheDoi() {
    String doiOfA = doi("refresh-a");
    String arxivOfB = arxivId();
    openAlexSearch(openAlexWork(wid(), doiOfA, "Journal version", 2020, 1, null, null, null));
    search("?q=journal+version+stored");
    openAlexSearch();
    arxivSearch(arxivEntry(arxivOfB, "Preprint version", 2019, "abs", null, "cs.LG"));
    search("?q=preprint+version+stored");
    jdbc.update("UPDATE papers SET fetched_at = now() - interval '31 days' WHERE id = ?", "arxiv:" + arxivOfB);
    SOURCES.stubFor(get(urlPathEqualTo("/openalex/works/doi:" + PaperKeys.arxivDoi(arxivOfB))).willReturn(okJson(
            openAlexWork(wid(), doiOfA, "Preprint version, refreshed", 2019, 9, null, null, null))));
    clearCaches();

    JsonNode body = json(apiGet(PAPERS + "arxiv:" + arxivOfB, null));

    assertThat(body.get("id").asString()).isEqualTo("arxiv:" + arxivOfB);
    assertThat(body.get("title").asString()).isEqualTo("Preprint version, refreshed");
    assertThat(paperRepository.findById(key(doiOfA)).orElseThrow().getTitle()).isEqualTo("Journal version");
  }

  @Test
  void concurrentFirstOpensOfOnePaperBothSucceed() {
    String id = paperKey("race");
    SOURCES.stubFor(get(urlPathEqualTo(openAlexPath(id))).willReturn(okJson(
            openAlexWork(wid(), doiOf(id), "Raced", 2020, 1, null, null, null)).withFixedDelay(400)));

    List<CompletableFuture<ResponseEntity<String>>> opens = List.of(
            CompletableFuture.supplyAsync(() -> apiGet(PAPERS + id, null)),
            CompletableFuture.supplyAsync(() -> apiGet(PAPERS + id, null)));

    opens.forEach(o -> assertThat(status(o.join())).isEqualTo(200));
    assertThat(paperRepository.findById(id)).isPresent();
  }

  @Test
  void doisWithCharactersTheFirewallRejectsGetAPathSafeId() {
    String sici = TEST_DOI_PREFIX + "(sici)1097-0258(19980430)17:8<857::aid-sim777>3.0.co;2-" + UUID.randomUUID();
    crossrefSearch(crossrefItem(sici, "Semicolon DOI", 1998, "Stat Med", 4, null));

    String id = search("?q=semicolon+doi").get("items").get(0).get("id").asString();

    assertThat(id).startsWith("doi64:");
    JsonNode detail = json(apiGet(PAPERS + id, null));
    assertThat(detail.get("id").asString()).isEqualTo(id);
    assertThat(detail.get("externalIds").get("DOI").asString()).isEqualTo(sici);
  }

  @Test
  void expiredEntriesAreDeletedByTheCleanupJobAndLiveOnesKept() {
    anyResult();
    search("?q=stays+in+the+cache");
    search("?q=has+expired+already");
    jdbc.update("UPDATE search_cache SET expires_at = now() - interval '1 second' WHERE query_text = 'has expired already'");

    searchCacheService.deleteExpired();

    assertThat(jdbc.queryForList("SELECT query_text FROM search_cache", String.class)).containsExactly("stays in the cache");
  }

  @ParameterizedTest
  @ValueSource(ints = {500, 429, 404})
  void unpaywallFailingOrNotKnowingThePaperLeavesItWithoutAPdf(int unpaywallStatus) {
    String id = paperKey("unpaywall-" + unpaywallStatus);
    stubPaper(id, "Unpaywall says no");
    SOURCES.stubFor(get(urlPathEqualTo("/unpaywall/v2/" + doiOf(id))).willReturn(aResponse().withStatus(unpaywallStatus)));
    externalSources.getUnpaywall().setEnabled(true);
    try {
      JsonNode body = json(apiGet(PAPERS + id, null));

      assertThat(body.get("hasPdf").asBoolean()).isFalse();
      assertThat(body.get("sources")).extracting(JsonNode::asString).doesNotContain("unpaywall");
    } finally {
      externalSources.getUnpaywall().setEnabled(false);
    }
  }

  @Test
  void unpaywallWithoutAnOpenCopyLeavesThePaperWithoutAPdf() {
    String id = paperKey("unpaywall-closed");
    stubPaper(id, "Closed access");
    SOURCES.stubFor(get(urlPathEqualTo("/unpaywall/v2/" + doiOf(id))).willReturn(okJson("{\"best_oa_location\":null}")));
    externalSources.getUnpaywall().setEnabled(true);
    try {
      assertThat(json(apiGet(PAPERS + id, null)).get("hasPdf").asBoolean()).isFalse();
    } finally {
      externalSources.getUnpaywall().setEnabled(false);
    }
  }

  @Test
  void unpaywallsPdfWinsOverAnotherSourcesForANewPaper() {
    String id = paperKey("unpaywall-wins");
    SOURCES.stubFor(get(urlPathEqualTo(openAlexPath(id))).willReturn(okJson(
            openAlexWork(wid(), doiOf(id), "Two PDFs", 2020, 1, null, "https://example.org/openalex.pdf", null))));
    SOURCES.stubFor(get(urlPathEqualTo("/unpaywall/v2/" + doiOf(id)))
            .willReturn(okJson("{\"best_oa_location\":{\"url_for_pdf\":\"https://repo.example.org/best.pdf\"}}")));
    externalSources.getUnpaywall().setEnabled(true);
    try {
      apiGet(PAPERS + id, null);

      assertThat(paperRepository.findById(id).orElseThrow().getOpenAccessPdfUrl()).isEqualTo("https://repo.example.org/best.pdf");
    } finally {
      externalSources.getUnpaywall().setEnabled(false);
    }
  }

  @Test
  void aRepeatSearchDoesNotRewriteAFreshUnchangedPaper() {
    String d = doi("fresh");
    String w = wid();
    openAlexSearch(openAlexWork(w, d, "Fresh", 2020, 5, null, null, null));
    search("?q=fresh+first");
    Timestamp first = jdbc.queryForObject("SELECT fetched_at FROM papers WHERE id = ?", Timestamp.class, key(d));

    search("?q=fresh+second+wording");
    assertThat(jdbc.queryForObject("SELECT fetched_at FROM papers WHERE id = ?", Timestamp.class, key(d))).isEqualTo(first);

    // a change is written, and so is a stale row even when nothing changed
    openAlexSearch(openAlexWork(w, d, "Fresh", 2020, 6, null, null, null));
    search("?q=fresh+third+wording");
    Timestamp changed = jdbc.queryForObject("SELECT fetched_at FROM papers WHERE id = ?", Timestamp.class, key(d));
    assertThat(changed).isAfter(first);
    assertThat(paperRepository.findById(key(d)).orElseThrow().getCitationCount()).isEqualTo(6);
    jdbc.update("UPDATE papers SET fetched_at = now() - interval '31 days' WHERE id = ?", key(d));
    search("?q=fresh+fourth+wording");
    assertThat(jdbc.queryForObject("SELECT fetched_at FROM papers WHERE id = ?", Timestamp.class, key(d)).toInstant())
            .isAfter(Instant.now().minusSeconds(60));
  }

  @Test
  void concurrentFirstOpensOfAPaperShareOneLookup() {
    String id = paperKey("together");
    SOURCES.stubFor(get(urlPathEqualTo(openAlexPath(id))).willReturn(okJson(
            openAlexWork(wid(), doiOf(id), "Together", 2021, 1, null, null, null)).withFixedDelay(700)));

    List<CompletableFuture<ResponseEntity<String>>> requests = List.of(
            CompletableFuture.supplyAsync(() -> apiGet(PAPERS + id, null)),
            CompletableFuture.supplyAsync(() -> apiGet(PAPERS + id, null)),
            CompletableFuture.supplyAsync(() -> apiGet(PAPERS + id, null)));

    requests.forEach(r -> assertThat(json(r.join()).get("title").asString()).isEqualTo("Together"));
    SOURCES.verify(1, getRequestedFor(urlPathEqualTo(openAlexPath(id))));
  }
}
