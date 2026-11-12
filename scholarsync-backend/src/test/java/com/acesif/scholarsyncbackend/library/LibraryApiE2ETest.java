package com.acesif.scholarsyncbackend.library;

import com.acesif.scholarsyncbackend.support.E2ETestBase;
import com.acesif.scholarsyncbackend.users.entities.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import tools.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.stream.StreamSupport;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.assertj.core.api.Assertions.assertThat;

class LibraryApiE2ETest extends E2ETestBase {

  private static final String LIB = "/api/v1/library";

  private User alice;
  private String aliceToken;

  @BeforeEach
  void setUp() {
    alice = createUser("Alice");
    aliceToken = tokenFor(alice);
  }

  private String save(String token, String title) {
    String id = paperKey("paper");
    stubPaper(id, title);
    assertThat(status(apiPut(LIB + "/" + id, token, null))).isEqualTo(200);
    return id;
  }

  private static List<String> ids(JsonNode page) {
    return StreamSupport.stream(page.get("items").spliterator(), false).map(i -> i.get("paper").get("id").asString()).toList();
  }

  @Test
  void everyEndpointRequiresLogin() {
    assertThat(status(apiGet(LIB, null))).isEqualTo(401);
    assertThat(status(apiGet(LIB + "/states", null))).isEqualTo(401);
    assertThat(status(apiPut(LIB + "/p1", null, null))).isEqualTo(401);
    assertThat(status(apiPatch(LIB + "/p1", null, Map.of("status", "DONE")))).isEqualTo(401);
    assertThat(status(apiDelete(LIB + "/p1", null))).isEqualTo(401);
  }

  @Test
  void savingAddsPaperAsToRead() {
    String id = paperKey("paper");
    stubPaper(id, "Saved");

    JsonNode body = json(apiPut(LIB + "/" + id, aliceToken, null));

    assertThat(body.get("status").asString()).isEqualTo("TO_READ");
    assertThat(body.get("archived").asBoolean()).isFalse();
    assertThat(body.get("paper").get("title").asString()).isEqualTo("Saved");
    assertThat(ids(json(apiGet(LIB, aliceToken)))).containsExactly(id);
  }

  @Test
  void savingTwiceIsIdempotentAndKeepsStatus() {
    String id = save(aliceToken, "Twice");
    apiPatch(LIB + "/" + id, aliceToken, Map.of("status", "IN_PROGRESS"));

    JsonNode again = json(apiPut(LIB + "/" + id, aliceToken, null));

    assertThat(again.get("status").asString()).isEqualTo("IN_PROGRESS");
    assertThat(json(apiGet(LIB, aliceToken)).get("total").asInt()).isEqualTo(1);
    SOURCES.verify(1, getRequestedFor(urlPathEqualTo(openAlexPath(id))));
  }

  @Test
  void savingAnIdThatIsNotAPaperKeyIs404WithoutCallingSources() {
    assertThat(status(apiPut(LIB + "/legacy-s2-id", aliceToken, null))).isEqualTo(404);
    SOURCES.verify(0, getRequestedFor(anyUrl()));
  }

  @Test
  void savingAnUnknownPaperIs404() {
    // no source knows this DOI: every lookup answers 404
    assertThat(status(apiPut(LIB + "/" + paperKey("nope"), aliceToken, null))).isEqualTo(404);
    assertThat(json(apiGet(LIB, aliceToken)).get("total").asInt()).isZero();
  }

  @Test
  void savingWhileTheSourcesAreRateLimitedIs503() {
    String id = paperKey("busy");
    SOURCES.stubFor(get(urlPathEqualTo(openAlexPath(id))).willReturn(aResponse().withStatus(429)));
    assertThat(status(apiPut(LIB + "/" + id, aliceToken, null))).isEqualTo(503);
  }

  @Test
  void statusFilterAndStatusChange() {
    String a = save(aliceToken, "A");
    String b = save(aliceToken, "B");
    save(aliceToken, "C");

    apiPatch(LIB + "/" + a, aliceToken, Map.of("status", "IN_PROGRESS"));
    JsonNode doneB = json(apiPatch(LIB + "/" + b, aliceToken, Map.of("status", "DONE")));

    assertThat(doneB.get("status").asString()).isEqualTo("DONE");
    assertThat(ids(json(apiGet(LIB + "?status=IN_PROGRESS", aliceToken)))).containsExactly(a);
    assertThat(ids(json(apiGet(LIB + "?status=DONE", aliceToken)))).containsExactly(b);
    assertThat(json(apiGet(LIB + "?status=TO_READ", aliceToken)).get("total").asInt()).isEqualTo(1);
  }

  @Test
  void archiveHidesFromDefaultListAndUnarchiveRestores() {
    String id = save(aliceToken, "Old");

    JsonNode archived = json(apiPatch(LIB + "/" + id, aliceToken, Map.of("archived", true)));

    assertThat(archived.get("archived").asBoolean()).isTrue();
    assertThat(json(apiGet(LIB, aliceToken)).get("total").asInt()).isZero();
    assertThat(ids(json(apiGet(LIB + "?archived=true", aliceToken)))).containsExactly(id);

    apiPatch(LIB + "/" + id, aliceToken, Map.of("archived", false));
    assertThat(ids(json(apiGet(LIB, aliceToken)))).containsExactly(id);
    assertThat(json(apiGet(LIB + "?archived=true", aliceToken)).get("total").asInt()).isZero();
  }

  @Test
  void savingAnArchivedPaperRestoresIt() {
    String id = save(aliceToken, "Back");
    apiPatch(LIB + "/" + id, aliceToken, Map.of("archived", true));

    assertThat(json(apiPut(LIB + "/" + id, aliceToken, null)).get("archived").asBoolean()).isFalse();
  }

  @Test
  void otherUsersCannotSeeOrChangeMyItems() {
    String id = save(aliceToken, "Private");
    String bobToken = tokenFor(createUser("Bob"));

    assertThat(json(apiGet(LIB, bobToken)).get("total").asInt()).isZero();
    assertThat(json(apiGet(LIB + "/states", bobToken))).isEmpty();
    assertThat(status(apiPatch(LIB + "/" + id, bobToken, Map.of("status", "DONE")))).isEqualTo(404);
    assertThat(status(apiDelete(LIB + "/" + id, bobToken))).isEqualTo(204);
    assertThat(ids(json(apiGet(LIB, aliceToken)))).containsExactly(id);
  }

  @Test
  void removeIsIdempotent() {
    String id = save(aliceToken, "Gone");
    assertThat(status(apiDelete(LIB + "/" + id, aliceToken))).isEqualTo(204);
    assertThat(status(apiDelete(LIB + "/" + id, aliceToken))).isEqualTo(204);
    assertThat(json(apiGet(LIB, aliceToken)).get("total").asInt()).isZero();
  }

  @Test
  void lastPageIsSavedAndReturnedWithoutTouchingStatus() {
    String id = save(aliceToken, "Long read");
    assertThat(json(apiGet(LIB, aliceToken)).get("items").get(0).get("lastPage").isNull()).isTrue();

    JsonNode body = json(apiPatch(LIB + "/" + id, aliceToken, Map.of("lastPage", 12)));

    assertThat(body.get("lastPage").asInt()).isEqualTo(12);
    assertThat(body.get("status").asString()).isEqualTo("TO_READ");
    assertThat(json(apiGet(LIB, aliceToken)).get("items").get(0).get("lastPage").asInt()).isEqualTo(12);
    assertThat(json(apiGet(LIB + "/states", aliceToken)).get(0).get("lastPage").asInt()).isEqualTo(12);
    assertThat(status(apiPatch(LIB + "/" + id, tokenFor(createUser("Bob")), Map.of("lastPage", 3)))).isEqualTo(404);
  }

  @Test
  void patchUnknownItemIs404() {
    assertThat(status(apiPatch(LIB + "/not-saved", aliceToken, Map.of("status", "DONE")))).isEqualTo(404);
  }

  @ParameterizedTest
  @ValueSource(strings = {"{}", "{\"status\":\"READING\"}", "{\"status\":null,\"archived\":null}", "not json", "{\"archived\":\"maybe\"}", "{\"lastPage\":0}", "{\"lastPage\":-3}", "{\"lastPage\":\"x\"}"})
  void invalidPatchBodyIs400(String body) {
    String id = save(aliceToken, "Patchable");
    // a String body is sent verbatim, so malformed JSON reaches the server as-is
    assertThat(status(apiPatch(LIB + "/" + id, aliceToken, body))).as(body).isEqualTo(400);
  }

  @ParameterizedTest
  @ValueSource(strings = {"?status=READING", "?sort=random", "?page=-1", "?size=0", "?size=101", "?archived=maybe"})
  void invalidListParamsAre400(String query) {
    assertThat(status(apiGet(LIB + query, aliceToken))).as(query).isEqualTo(400);
  }

  @Test
  void paginationAndSorting() {
    String first = save(aliceToken, "Zeta");
    String second = save(aliceToken, "Alpha");
    String third = save(aliceToken, "Mu");

    assertThat(ids(json(apiGet(LIB + "?sort=added&size=2", aliceToken)))).containsExactly(third, second);
    assertThat(ids(json(apiGet(LIB + "?sort=added&size=2&page=1", aliceToken)))).containsExactly(first);
    assertThat(ids(json(apiGet(LIB + "?sort=title", aliceToken)))).containsExactly(second, third, first);

    apiPatch(LIB + "/" + first, aliceToken, Map.of("status", "DONE"));
    assertThat(ids(json(apiGet(LIB + "?sort=updated", aliceToken))).getFirst()).isEqualTo(first);
    assertThat(json(apiGet(LIB + "?page=5", aliceToken)).get("items")).isEmpty();
  }

  @Test
  void statesListsSavedAndArchivedPapers() {
    String active = save(aliceToken, "Active");
    String old = save(aliceToken, "Old");
    apiPatch(LIB + "/" + old, aliceToken, Map.of("archived", true, "status", "DONE"));

    JsonNode states = json(apiGet(LIB + "/states", aliceToken));

    assertThat(states).hasSize(2);
    Map<String, JsonNode> byId = new java.util.HashMap<>();
    states.forEach(s -> byId.put(s.get("paperId").asString(), s));
    assertThat(byId.get(active).get("status").asString()).isEqualTo("TO_READ");
    assertThat(byId.get(old).get("archived").asBoolean()).isTrue();
    assertThat(byId.get(old).get("status").asString()).isEqualTo("DONE");
  }

  @Test
  void anAliasIdReachesTheSameLibraryEntry() {
    String id = save(aliceToken, "Aliased");
    apiPatch(LIB + "/" + id, aliceToken, Map.of("status", "DONE"));
    String alias = "openalex:" + jdbc.queryForObject("SELECT openalex_id FROM papers WHERE id = ?", String.class, id);

    JsonNode again = json(apiPut(LIB + "/" + alias, aliceToken, null));

    assertThat(again.get("status").asString()).isEqualTo("DONE");
    assertThat(again.get("paper").get("id").asString()).isEqualTo(id);
    assertThat(json(apiGet(LIB, aliceToken)).get("total").asInt()).isEqualTo(1);
    assertThat(status(apiDelete(LIB + "/" + alias, aliceToken))).isIn(200, 204);
    assertThat(json(apiGet(LIB, aliceToken)).get("total").asInt()).isZero();
  }

  @Test
  void aPaperIdLongerThan200CharactersIs400() {
    String longId = "doi:10.5555~" + "x".repeat(200);
    assertThat(status(apiPut(LIB + "/" + longId, aliceToken, null))).isEqualTo(400);
    SOURCES.verify(0, getRequestedFor(urlPathMatching("/openalex/works/.+")));
  }

  @Test
  void concurrentSavesOfTheSamePaperAreIdempotent() throws Exception {
    String id = paperKey("race");
    stubPaper(id, "Raced");
    ExecutorService pool = Executors.newFixedThreadPool(4);
    try {
      List<Future<Integer>> saves = new ArrayList<>();
      for (int i = 0; i < 4; i++) saves.add(pool.submit(() -> status(apiPut(LIB + "/" + id, aliceToken, null))));
      for (Future<Integer> save : saves) assertThat(save.get()).isEqualTo(200);
    } finally {
      pool.shutdown();
    }
    assertThat(ids(json(apiGet(LIB, aliceToken)))).containsExactly(id);
  }
}
