package com.acesif.scholarsyncbackend.graph;

import com.acesif.scholarsyncbackend.support.E2ETestBase;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import tools.jackson.databind.JsonNode;

import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import java.util.stream.StreamSupport;

import static com.acesif.scholarsyncbackend.support.SourceFixtures.*;
import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.assertj.core.api.Assertions.assertThat;

class GraphApiE2ETest extends E2ETestBase {

  /** A seed paper: its id, its OpenAlex W-id and the OpenAlex body both lookups return. */
  private record Seed(String id, String w, String work) {}

  private static String wid() {
    return "W" + (UUID.randomUUID().getMostSignificantBits() & 0xffffffffffL);
  }

  /** A neighbour without a DOI, so its graph id is "openalex:W…". */
  private static String node(String w, int citations, String... refs) {
    return openAlexWork(w, null, "T " + w, 2020, citations, null, null, null, refs);
  }

  private static Seed seed(String name, String... refs) {
    String id = paperKey(name);
    String w = wid();
    String work = openAlexWork(w, doiOf(id), "Root " + name, 2019, 10, null, null, null, refs);
    SOURCES.stubFor(get(urlPathEqualTo(openAlexPath(id))).willReturn(okJson(work)));
    SOURCES.stubFor(get(urlPathEqualTo("/openalex/works/" + w)).willReturn(okJson(work)));
    return new Seed(id, w, work);
  }

  private static void stubCiting(String w, String... works) {
    SOURCES.stubFor(get(urlPathEqualTo("/openalex/works")).withQueryParam("filter", equalTo("cites:" + w))
            .willReturn(okJson(openAlexPage(works.length, works))));
  }

  private static void stubWorks(List<String> ws, String... works) {
    SOURCES.stubFor(get(urlPathEqualTo("/openalex/works")).withQueryParam("filter", equalTo("openalex:" + String.join("|", ws)))
            .willReturn(okJson(openAlexPage(works.length, works))));
  }

  private static Set<String> nodeIds(JsonNode graph) {
    return StreamSupport.stream(graph.get("nodes").spliterator(), false).map(n -> n.get("id").asString()).collect(Collectors.toSet());
  }

  private static List<String> links(JsonNode graph) {
    return StreamSupport.stream(graph.get("links").spliterator(), false)
            .map(l -> l.get("source").asString() + "->" + l.get("target").asString()).toList();
  }

  private JsonNode graph(String id, String query) {
    var res = apiGet("/api/v1/papers/" + id + "/graph" + query, null);
    assertThat(status(res)).as(res.getBody()).isEqualTo(200);
    return json(res);
  }

  private static String oa(String w) {
    return "openalex:" + w;
  }

  @Test
  void isolatedPaperHasOneNodeAndNoLinks() {
    Seed s = seed("solo");

    JsonNode g = graph(s.id(), "");

    assertThat(g.get("rootId").asString()).isEqualTo(s.id());
    assertThat(nodeIds(g)).containsExactly(s.id());
    assertThat(g.get("nodes").get(0).get("depth").asInt()).isZero();
    assertThat(g.get("links")).isEmpty();
  }

  @Test
  void citedByOnlyAsksForCitingWorks() {
    String c1 = wid(), c2 = wid(), r = wid();
    Seed s = seed("citedby", r);
    stubCiting(s.w(), node(c1, 5), node(c2, 3));

    JsonNode g = graph(s.id(), "?direction=cited_by");

    assertThat(nodeIds(g)).containsExactlyInAnyOrder(s.id(), oa(c1), oa(c2));
    assertThat(links(g)).containsExactlyInAnyOrder(oa(c1) + "->" + s.id(), oa(c2) + "->" + s.id());
    SOURCES.verify(0, getRequestedFor(urlPathEqualTo("/openalex/works")).withQueryParam("filter", matching("openalex:.*")));
  }

  @Test
  void citesOnlyResolvesTheReferenceList() {
    String r1 = wid();
    Seed s = seed("cites", r1);
    stubWorks(List.of(r1), node(r1, 50));

    JsonNode g = graph(s.id(), "?direction=CITES");

    assertThat(links(g)).containsExactly(s.id() + "->" + oa(r1));
    assertThat(g.get("nodes").get(1).get("depth").asInt()).isEqualTo(1);
    SOURCES.verify(0, getRequestedFor(urlPathEqualTo("/openalex/works")).withQueryParam("filter", matching("cites:.*")));
  }

  @Test
  void bothDirectionsMergeAndDeduplicate() {
    String x = wid(), y = wid(), z = wid();
    Seed s = seed("both", x, z);
    stubCiting(s.w(), node(x, 1), node(y, 1));
    stubWorks(List.of(x, z), node(x, 1), node(z, 1));

    JsonNode g = graph(s.id(), "?direction=both");

    assertThat(nodeIds(g)).containsExactlyInAnyOrder(s.id(), oa(x), oa(y), oa(z));
    assertThat(links(g)).containsExactlyInAnyOrder(oa(x) + "->" + s.id(), oa(y) + "->" + s.id(), s.id() + "->" + oa(x), s.id() + "->" + oa(z));
  }

  @Test
  void nodeCapIsHonouredAndLinksOnlyJoinIncludedNodes() {
    Seed s = seed("big");
    stubCiting(s.w(), IntStream.range(0, 20).mapToObj(i -> node(wid(), i)).toArray(String[]::new));

    JsonNode g = graph(s.id(), "?direction=cited_by&limit=5");

    assertThat(g.get("nodes")).hasSize(5);
    assertThat(g.get("links")).hasSize(4);
    Set<String> ids = nodeIds(g);
    links(g).forEach(l -> assertThat(ids).contains(l.split("->")[0], l.split("->")[1]));
  }

  @Test
  void depthTwoExpandsNeighboursWithoutDuplicatingACycle() {
    String b = wid(), c = wid();
    Seed a = seed("cycle", b);
    // b cites a back and also cites c: a<->b is a cycle
    String bWork = node(b, 10, a.w(), c);
    stubWorks(List.of(b), bWork);
    stubCiting(b, a.work());
    stubWorks(List.of(a.w(), c), a.work(), node(c, 1));

    JsonNode g = graph(a.id(), "?depth=2");

    assertThat(nodeIds(g)).containsExactlyInAnyOrder(a.id(), oa(b), oa(c));
    assertThat(links(g)).containsExactlyInAnyOrder(a.id() + "->" + oa(b), oa(b) + "->" + a.id(), oa(b) + "->" + oa(c));
    assertThat(links(g)).doesNotHaveDuplicates();
    JsonNode cNode = StreamSupport.stream(g.get("nodes").spliterator(), false)
            .filter(n -> n.get("id").asString().equals(oa(c))).findFirst().orElseThrow();
    assertThat(cNode.get("depth").asInt()).isEqualTo(2);
  }

  @Test
  void depthOneDoesNotFetchTheSecondHop() {
    String n1 = wid();
    Seed s = seed("shallow", n1);
    stubWorks(List.of(n1), node(n1, 1, wid()));

    graph(s.id(), "?depth=1");

    SOURCES.verify(0, getRequestedFor(urlPathEqualTo("/openalex/works")).withQueryParam("filter", equalTo("cites:" + n1)));
  }

  @Test
  void depthTwoExpandsOnlyTheTenMostCitedNeighbours() {
    List<String> hubs = IntStream.range(0, 15).mapToObj(i -> wid()).toList();
    Seed s = seed("hub", hubs.toArray(String[]::new));
    // each neighbour h_i has i citations and cites one paper of its own, "Wx" + i
    stubWorks(hubs, IntStream.range(0, 15).mapToObj(i -> node(hubs.get(i), i, "W9000" + i)).toArray(String[]::new));
    SOURCES.stubFor(get(urlPathEqualTo("/openalex/works")).withQueryParam("filter", matching("openalex:W9000\\d+"))
            .willReturn(okJson(openAlexPage(0))));

    graph(s.id(), "?depth=2&direction=cites");

    SOURCES.verify(10, getRequestedFor(urlPathEqualTo("/openalex/works")).withQueryParam("filter", matching("openalex:W9000\\d+")));
    SOURCES.verify(1, getRequestedFor(urlPathEqualTo("/openalex/works")).withQueryParam("filter", equalTo("openalex:W900014")));
    SOURCES.verify(0, getRequestedFor(urlPathEqualTo("/openalex/works")).withQueryParam("filter", equalTo("openalex:W90000")));
  }

  @Test
  void selfCitationsAndWorksWithoutIdsAreDropped() {
    Seed s = seed("self");
    stubCiting(s.w(), s.work(), "{\"id\":null,\"display_name\":\"ghost\"}");

    JsonNode g = graph(s.id(), "");

    assertThat(nodeIds(g)).containsExactly(s.id());
    assertThat(g.get("links")).isEmpty();
  }

  @Test
  void openCitationsSuppliesTheLinksWhenOpenAlexDoesNotKnowThePaper() {
    String id = paperKey("oc");
    String doi = doiOf(id);
    String known = TEST_DOI_PREFIX + "known-" + UUID.randomUUID();
    String unknown = TEST_DOI_PREFIX + "unknown-" + UUID.randomUUID();
    SOURCES.stubFor(get(urlPathEqualTo("/crossref/works/" + doi)).willReturn(okJson(crossrefSingle(
            crossrefItem(doi, "Only Crossref knows me", 2015, "J", 2, null)))));
    SOURCES.stubFor(get(urlPathEqualTo("/opencitations/citations/doi:" + doi)).willReturn(okJson(openCitationsLinks("citing", known, unknown))));
    SOURCES.stubFor(get(urlPathEqualTo("/opencitations/references/doi:" + doi)).willReturn(okJson("[]")));
    SOURCES.stubFor(get(urlPathEqualTo("/openalex/works")).withQueryParam("filter", equalTo("doi:" + known + "|" + unknown))
            .willReturn(okJson(openAlexPage(1, openAlexWork(wid(), known, "Resolved by OpenAlex", 2018, 4, null, null, null)))));

    JsonNode g = graph(id, "");

    String knownId = "doi:" + known.replace('/', '~');
    String unknownId = "doi:" + unknown.replace('/', '~');
    assertThat(nodeIds(g)).containsExactlyInAnyOrder(id, knownId, unknownId);
    assertThat(links(g)).containsExactlyInAnyOrder(knownId + "->" + id, unknownId + "->" + id);
    JsonNode unresolved = StreamSupport.stream(g.get("nodes").spliterator(), false)
            .filter(n -> n.get("id").asString().equals(unknownId)).findFirst().orElseThrow();
    assertThat(unresolved.get("title").asString()).isEqualTo(unknown);
  }

  @Test
  void unknownPaperIs404() {
    assertThat(status(apiGet("/api/v1/papers/" + paperKey("ghost") + "/graph", null))).isEqualTo(404);
  }

  @Test
  void rateLimitIs503() {
    Seed s = seed("busy");
    SOURCES.stubFor(get(urlPathEqualTo("/openalex/works")).withQueryParam("filter", equalTo("cites:" + s.w()))
            .willReturn(aResponse().withStatus(429)));
    assertThat(status(apiGet("/api/v1/papers/" + s.id() + "/graph", null))).isEqualTo(503);
  }

  @ParameterizedTest
  @ValueSource(strings = {"?depth=0", "?depth=3", "?limit=0", "?limit=151", "?direction=sideways", "?depth=x"})
  void invalidParamsAre400(String query) {
    assertThat(status(apiGet("/api/v1/papers/any/graph" + query, null))).as(query).isEqualTo(400);
    SOURCES.verify(0, getRequestedFor(anyUrl()));
  }

  @Test
  void expandReturnsOneHopAndAcceptsTokens() {
    String e2 = wid(), e3 = wid();
    Seed s = seed("expand", e3);
    stubCiting(s.w(), node(e2, 1));
    stubWorks(List.of(e3), node(e3, 1));

    var res = apiGet("/api/v1/papers/" + s.id() + "/graph/expand?direction=both&limit=10", tokenFor(createUser("Viewer")));

    assertThat(status(res)).isEqualTo(200);
    assertThat(nodeIds(json(res))).containsExactlyInAnyOrder(s.id(), oa(e2), oa(e3));
    assertThat(status(apiGet("/api/v1/papers/" + s.id() + "/graph/expand?limit=151", null))).isEqualTo(400);
  }
}
