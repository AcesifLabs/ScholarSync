package com.acesif.scholarsyncbackend.collections;

import com.acesif.scholarsyncbackend.papers.entities.Paper;
import com.acesif.scholarsyncbackend.papers.entities.PaperAuthor;
import com.acesif.scholarsyncbackend.papers.repositories.PaperRepository;
import com.acesif.scholarsyncbackend.support.E2ETestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import tools.jackson.databind.JsonNode;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.StreamSupport;

import static org.assertj.core.api.Assertions.assertThat;

class CollectionApiE2ETest extends E2ETestBase {

  private static final String COL = "/api/v1/collections";

  @Autowired
  private PaperRepository paperRepository;

  private String alice;
  private String bob;

  @BeforeEach
  void setUp() {
    alice = tokenFor(createUser("Alice"));
    bob = tokenFor(createUser("Bob"));
  }

  private String create(String token, String name) {
    ResponseEntity<String> res = apiPost(COL, token, Map.of("name", name));
    assertThat(status(res)).isEqualTo(201);
    return json(res).get("id").asString();
  }

  private String addPaper(String token, String collectionId, String title) {
    String paperId = paperKey("p");
    stubPaper(paperId, title);
    assertThat(status(apiPost(COL + "/" + collectionId + "/papers", token, Map.of("paperId", paperId)))).isEqualTo(200);
    return paperId;
  }

  private static List<String> entryIds(JsonNode entries) {
    return StreamSupport.stream(entries.spliterator(), false).map(e -> e.get("paper").get("id").asString()).toList();
  }

  @Test
  void everyPrivateEndpointRequiresLogin() {
    String id = UUID.randomUUID().toString();
    assertThat(status(apiGet(COL, null))).isEqualTo(401);
    assertThat(status(apiPost(COL, null, Map.of("name", "x")))).isEqualTo(401);
    assertThat(status(apiGet(COL + "/" + id, null))).isEqualTo(401);
    assertThat(status(apiPatch(COL + "/" + id, null, Map.of("name", "x")))).isEqualTo(401);
    assertThat(status(apiDelete(COL + "/" + id, null))).isEqualTo(401);
    assertThat(status(apiPost(COL + "/" + id + "/papers", null, Map.of("paperId", "p")))).isEqualTo(401);
    assertThat(status(apiPut(COL + "/" + id + "/order", null, Map.of("paperIds", List.of())))).isEqualTo(401);
    assertThat(status(apiGet(COL + "/" + id + "/export?format=bibtex", null))).isEqualTo(401);
  }

  @Test
  void createListGetAndDelete() {
    ResponseEntity<String> created = apiPost(COL, alice, Map.of("name", "  PhD Review  ", "description", "Chapter 2"));
    JsonNode body = json(created);
    assertThat(body.get("name").asString()).isEqualTo("PhD Review");
    assertThat(body.get("visibility").asString()).isEqualTo("PRIVATE");
    assertThat(body.get("shareToken").isNull()).isTrue();
    assertThat(body.get("paperCount").asInt()).isZero();

    String id = body.get("id").asString();
    assertThat(json(apiGet(COL, alice))).hasSize(1);
    assertThat(json(apiGet(COL + "/" + id, alice)).get("collection").get("description").asString()).isEqualTo("Chapter 2");

    assertThat(status(apiDelete(COL + "/" + id, alice))).isEqualTo(204);
    assertThat(status(apiGet(COL + "/" + id, alice))).isEqualTo(404);
    assertThat(json(apiGet(COL, alice))).isEmpty();
  }

  @ParameterizedTest
  @ValueSource(strings = {"{}", "{\"name\":\"\"}", "{\"name\":\"   \"}", "{\"name\":null}", "not-json"})
  void invalidCreateIs400(String body) {
    assertThat(status(apiPost(COL, alice, body))).as(body).isEqualTo(400);
  }

  @Test
  void nameAndDescriptionLengthLimits() {
    assertThat(status(apiPost(COL, alice, Map.of("name", "n".repeat(120))))).isEqualTo(201);
    assertThat(status(apiPost(COL, alice, Map.of("name", "n".repeat(121))))).isEqualTo(400);
    assertThat(status(apiPost(COL, alice, Map.of("name", "d", "description", "x".repeat(2001))))).isEqualTo(400);
  }

  @Test
  void duplicateNameIs409ButOtherUsersMayReuseIt() {
    String id = create(alice, "Same");
    create(alice, "Other");
    assertThat(status(apiPost(COL, alice, Map.of("name", "Same")))).isEqualTo(409);
    assertThat(status(apiPost(COL, bob, Map.of("name", "Same")))).isEqualTo(201);

    String other = json(apiGet(COL, alice)).get(0).get("id").asString().equals(id)
            ? json(apiGet(COL, alice)).get(1).get("id").asString() : json(apiGet(COL, alice)).get(0).get("id").asString();
    assertThat(status(apiPatch(COL + "/" + other, alice, Map.of("name", "Same")))).isEqualTo(409);
    assertThat(status(apiPatch(COL + "/" + id, alice, Map.of("name", "Same")))).isEqualTo(200);
  }

  @Test
  void otherUsersGet404ForEverything() {
    String id = create(alice, "Mine");
    String paperId = addPaper(alice, id, "Secret");

    assertThat(status(apiGet(COL + "/" + id, bob))).isEqualTo(404);
    assertThat(status(apiPatch(COL + "/" + id, bob, Map.of("name", "Hijack")))).isEqualTo(404);
    assertThat(status(apiDelete(COL + "/" + id, bob))).isEqualTo(404);
    assertThat(status(apiPost(COL + "/" + id + "/papers", bob, Map.of("paperId", paperId)))).isEqualTo(404);
    assertThat(status(apiDelete(COL + "/" + id + "/papers/" + paperId, bob))).isEqualTo(404);
    assertThat(status(apiPatch(COL + "/" + id + "/papers/" + paperId, bob, Map.of("note", "x")))).isEqualTo(404);
    assertThat(status(apiPut(COL + "/" + id + "/order", bob, Map.of("paperIds", List.of(paperId))))).isEqualTo(404);
    assertThat(status(apiGet(COL + "/" + id + "/export?format=markdown", bob))).isEqualTo(404);
    assertThat(json(apiGet(COL, bob))).isEmpty();
    assertThat(json(apiGet(COL + "/" + id, alice)).get("entries")).hasSize(1);
  }

  @Test
  void malformedOrUnknownIdIs4xx() {
    assertThat(status(apiGet(COL + "/not-a-uuid", alice))).isEqualTo(400);
    assertThat(status(apiGet(COL + "/" + UUID.randomUUID(), alice))).isEqualTo(404);
  }

  @Test
  void addingPapersAppendsInOrderAndSavesToLibrary() {
    String id = create(alice, "Ordered");
    String a = addPaper(alice, id, "A");
    String b = addPaper(alice, id, "B");

    JsonNode detail = json(apiGet(COL + "/" + id, alice));
    assertThat(entryIds(detail.get("entries"))).containsExactly(a, b);
    assertThat(detail.get("collection").get("paperCount").asInt()).isEqualTo(2);
    assertThat(json(apiGet(COL, alice)).get(0).get("paperCount").asInt()).isEqualTo(2);

    JsonNode states = json(apiGet("/api/v1/library/states", alice));
    assertThat(StreamSupport.stream(states.spliterator(), false).map(s -> s.get("paperId").asString())).contains(a, b);
  }

  @Test
  void addingTheSamePaperTwiceIsIdempotent() {
    String id = create(alice, "Twice");
    String a = addPaper(alice, id, "A");
    assertThat(status(apiPost(COL + "/" + id + "/papers", alice, Map.of("paperId", a)))).isEqualTo(200);
    assertThat(json(apiGet(COL + "/" + id, alice)).get("entries")).hasSize(1);
  }

  @Test
  void addingUnknownPaperIs404AndBlankIdIs400() {
    String id = create(alice, "Bad");
    assertThat(status(apiPost(COL + "/" + id + "/papers", alice, Map.of("paperId", "missing")))).isEqualTo(404);
    assertThat(status(apiPost(COL + "/" + id + "/papers", alice, Map.of("paperId", " ")))).isEqualTo(400);
    assertThat(status(apiPost(COL + "/" + id + "/papers", alice, "{}"))).isEqualTo(400);
  }

  @Test
  void removePaper() {
    String id = create(alice, "Remove");
    String a = addPaper(alice, id, "A");
    String b = addPaper(alice, id, "B");

    assertThat(status(apiDelete(COL + "/" + id + "/papers/" + a, alice))).isEqualTo(204);
    assertThat(status(apiDelete(COL + "/" + id + "/papers/" + a, alice))).isEqualTo(204);
    assertThat(entryIds(json(apiGet(COL + "/" + id, alice)).get("entries"))).containsExactly(b);
  }

  @Test
  void reorderRewritesPositions() {
    String id = create(alice, "Reorder");
    String a = addPaper(alice, id, "A");
    String b = addPaper(alice, id, "B");
    String c = addPaper(alice, id, "C");

    JsonNode reordered = json(apiPut(COL + "/" + id + "/order", alice, Map.of("paperIds", List.of(c, a, b))));

    assertThat(entryIds(reordered.get("entries"))).containsExactly(c, a, b);
    assertThat(entryIds(json(apiGet(COL + "/" + id, alice)).get("entries"))).containsExactly(c, a, b);
    // new papers still go to the end after a reorder
    String d = addPaper(alice, id, "D");
    assertThat(entryIds(json(apiGet(COL + "/" + id, alice)).get("entries"))).containsExactly(c, a, b, d);
  }

  @Test
  void reorderMustMatchTheCurrentSet() {
    String id = create(alice, "Strict");
    String a = addPaper(alice, id, "A");
    String b = addPaper(alice, id, "B");

    List<List<String>> invalid = List.of(List.of(a), List.of(a, b, "extra"), List.of(a, a), List.of(a, "other"), List.of());
    for (List<String> ids : invalid) {
      assertThat(status(apiPut(COL + "/" + id + "/order", alice, Map.of("paperIds", ids)))).as(ids.toString()).isEqualTo(400);
    }
    assertThat(status(apiPut(COL + "/" + id + "/order", alice, "{}"))).isEqualTo(400);
    assertThat(entryIds(json(apiGet(COL + "/" + id, alice)).get("entries"))).containsExactly(a, b);
  }

  @Test
  void reorderOfAnEmptyCollectionAcceptsAnEmptyList() {
    String id = create(alice, "Empty");
    assertThat(status(apiPut(COL + "/" + id + "/order", alice, Map.of("paperIds", List.of())))).isEqualTo(200);
  }

  @Test
  void noteAndTags() {
    String id = create(alice, "Notes");
    String a = addPaper(alice, id, "A");
    String path = COL + "/" + id + "/papers/" + a;

    JsonNode entry = json(apiPatch(path, alice, Map.of("note", "Key claim on p.3", "tags", List.of(" foundational ", "ch2", "ch2"))));
    assertThat(entry.get("note").asString()).isEqualTo("Key claim on p.3");
    assertThat(entry.get("tags")).extracting(JsonNode::asString).containsExactly("foundational", "ch2");

    // omitted fields stay, empty note clears, empty tag list clears
    assertThat(json(apiPatch(path, alice, Map.of("tags", List.of("x")))).get("note").asString()).isEqualTo("Key claim on p.3");
    JsonNode cleared = json(apiPatch(path, alice, Map.of("note", "", "tags", List.of())));
    assertThat(cleared.get("note").isNull()).isTrue();
    assertThat(cleared.get("tags")).isEmpty();
  }

  @Test
  void invalidNoteAndTags() {
    String id = create(alice, "Limits");
    String a = addPaper(alice, id, "A");
    String path = COL + "/" + id + "/papers/" + a;

    assertThat(status(apiPatch(path, alice, Map.of("note", "x".repeat(5001))))).isEqualTo(400);
    assertThat(status(apiPatch(path, alice, Map.of("tags", List.of(" "))))).isEqualTo(400);
    assertThat(status(apiPatch(path, alice, Map.of("tags", List.of("t".repeat(41)))))).isEqualTo(400);
    List<String> tooMany = new ArrayList<>();
    for (int i = 0; i < 21; i++) tooMany.add("t" + i);
    assertThat(status(apiPatch(path, alice, Map.of("tags", tooMany)))).isEqualTo(400);
    assertThat(status(apiPatch(COL + "/" + id + "/papers/not-in-it", alice, Map.of("note", "x")))).isEqualTo(404);
  }

  @Test
  void shareLinkLifecycle() {
    String id = create(alice, "Shared");
    String paperId = addPaper(alice, id, "Public paper");
    apiPatch(COL + "/" + id + "/papers/" + paperId, alice, Map.of("note", "private-note-text", "tags", List.of("secret-tag")));

    JsonNode shared = json(apiPatch(COL + "/" + id, alice, Map.of("visibility", "PUBLIC_LINK")));
    String token = shared.get("shareToken").asString();
    assertThat(token).hasSizeGreaterThanOrEqualTo(32);

    ResponseEntity<String> anonymous = apiGet(COL + "/shared/" + token, null);
    assertThat(status(anonymous)).isEqualTo(200);
    assertThat(json(anonymous).get("name").asString()).isEqualTo("Shared");
    assertThat(json(anonymous).get("papers")).hasSize(1);
    assertThat(json(anonymous).get("papers").get(0).get("title").asString()).isEqualTo("Public paper");
    // nothing personal: no owner name, no private notes or tags
    assertThat(json(anonymous).has("ownerName")).isFalse();
    assertThat(anonymous.getBody()).doesNotContain(token).doesNotContain(id).doesNotContain("Alice")
            .doesNotContain("private-note-text").doesNotContain("secret-tag");

    // making it private revokes the old token; sharing again issues a new one
    apiPatch(COL + "/" + id, alice, Map.of("visibility", "PRIVATE"));
    assertThat(status(apiGet(COL + "/shared/" + token, null))).isEqualTo(404);
    String newToken = json(apiPatch(COL + "/" + id, alice, Map.of("visibility", "PUBLIC_LINK"))).get("shareToken").asString();
    assertThat(newToken).isNotEqualTo(token);
    assertThat(status(apiGet(COL + "/shared/" + newToken, null))).isEqualTo(200);
  }

  @Test
  void archivedSharedCollectionIsHiddenAndUnknownTokenIs404() {
    String id = create(alice, "Old share");
    String token = json(apiPatch(COL + "/" + id, alice, Map.of("visibility", "PUBLIC_LINK"))).get("shareToken").asString();
    apiPatch(COL + "/" + id, alice, Map.of("archived", true));

    assertThat(status(apiGet(COL + "/shared/" + token, null))).isEqualTo(404);
    assertThat(status(apiGet(COL + "/shared/nope", null))).isEqualTo(404);
  }

  @Test
  void archiveAndUnarchive() {
    String id = create(alice, "Archive me");
    create(alice, "Keep");

    assertThat(json(apiPatch(COL + "/" + id, alice, Map.of("archived", true))).get("archived").asBoolean()).isTrue();
    assertThat(json(apiGet(COL, alice))).hasSize(1);
    assertThat(json(apiGet(COL + "?archived=true", alice)).get(0).get("id").asString()).isEqualTo(id);

    apiPatch(COL + "/" + id, alice, Map.of("archived", false));
    assertThat(json(apiGet(COL, alice))).hasSize(2);
    assertThat(json(apiGet(COL + "?archived=true", alice))).isEmpty();
  }

  @ParameterizedTest
  @ValueSource(strings = {"{\"name\":\"\"}", "{\"name\":\"  \"}", "{\"visibility\":\"PUBLIC\"}", "{\"archived\":\"soon\"}"})
  void invalidUpdateIs400(String body) {
    String id = create(alice, "Valid");
    assertThat(status(apiPatch(COL + "/" + id, alice, body))).as(body).isEqualTo(400);
  }

  @Test
  void bibtexExportEscapesAndHandlesMissingData() {
    String id = create(alice, "My Thesis Refs");
    Paper tricky = paperRepository.save(Paper.builder()
            .id(uniqueId("tricky")).title("Profit & Loss: 50% of {Braces} cost $5 #1 a_b ~x ^y \\z")
            .authors(new ArrayList<>(List.of(new PaperAuthor("a", "José Müller"), new PaperAuthor("b", "Ann Lee"))))
            .year(2021).venue("J. Econ & Stats").doi("10.1/x_y-" + UUID.randomUUID()).fetchedAt(Instant.now()).build());
    Paper bare = paperRepository.save(Paper.builder()
            .id(uniqueId("bare")).title("Untitled work").fetchedAt(Instant.now()).build());
    Paper twin = paperRepository.save(Paper.builder()
            .id(uniqueId("twin")).title("Profit again").authors(new ArrayList<>(List.of(new PaperAuthor("a", "José Müller"))))
            .year(2021).fetchedAt(Instant.now()).build());
    for (Paper p : List.of(tricky, bare, twin)) {
      assertThat(status(apiPost(COL + "/" + id + "/papers", alice, Map.of("paperId", p.getId())))).isEqualTo(200);
    }

    ResponseEntity<String> res = apiGet(COL + "/" + id + "/export?format=BibTeX", alice);

    assertThat(status(res)).isEqualTo(200);
    assertThat(res.getHeaders().getContentType().toString()).startsWith("application/x-bibtex");
    assertThat(res.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION)).contains("attachment").contains("mythesisrefs.bib");
    String bib = res.getBody();
    assertThat(bib).contains("@article{muller2021profit,")
            .contains("title = {Profit \\& Loss: 50\\% of \\{Braces\\} cost \\$5 \\#1 a\\_b \\textasciitilde{}x \\textasciicircum{}y \\textbackslash{}z}")
            .contains("author = {José Müller and Ann Lee}")
            .contains("journal = {J. Econ \\& Stats}")
            .contains("doi = {10.1/x\\_y-")
            .contains("@misc{anonuntitled,")
            .contains("@misc{muller2021profita,");
    assertThat(bib.substring(bib.indexOf("@misc{anonuntitled"))).doesNotStartWith("author");
    assertThat(bib.split("anonuntitled")[1].split("}\n")[0]).doesNotContain("author =").doesNotContain("year =");
  }

  @Test
  void markdownExportIncludesNotesAndTags() {
    String id = create(alice, "Reading");
    apiPatch(COL + "/" + id, alice, Map.of("description", "For the seminar"));
    String a = addPaper(alice, id, "Graph Methods");
    apiPatch(COL + "/" + id + "/papers/" + a, alice, Map.of("note", "line one\nline two", "tags", List.of("core")));

    ResponseEntity<String> res = apiGet(COL + "/" + id + "/export?format=markdown", alice);

    assertThat(res.getHeaders().getContentType().toString()).startsWith("text/markdown");
    assertThat(res.getBody()).startsWith("# Reading\n\nFor the seminar\n\n1. **Graph Methods**. Ada Lovelace, Anon (2020). *OpenAlex Venue*. [doi:" + doiOf(a) + "](https://doi.org/" + doiOf(a) + ")")
            .contains("   Tags: core\n")
            .contains("   > line one\n   > line two\n");
  }

  @Test
  void exportOfEmptyCollectionAndBadFormat() {
    String id = create(alice, "Nothing");
    assertThat(apiGet(COL + "/" + id + "/export?format=bibtex", alice).getBody()).isNullOrEmpty();
    assertThat(status(apiGet(COL + "/" + id + "/export?format=ris", alice))).isEqualTo(400);
    assertThat(status(apiGet(COL + "/" + id + "/export", alice))).isEqualTo(400);
  }

  @Test
  void concurrentAddsGetDistinctPositionsAndTheSamePaperOnce() {
    String id = create(alice, "Busy");
    List<String> papers = new ArrayList<>();
    for (int i = 0; i < 5; i++) {
      String paperId = paperKey("busy");
      stubPaper(paperId, "Busy " + i);
      papers.add(paperId);
    }
    List<String> requests = new ArrayList<>(papers);
    requests.add(papers.getFirst());
    requests.add(papers.getFirst());

    List<CompletableFuture<ResponseEntity<String>>> adds = requests.stream()
            .map(p -> CompletableFuture.supplyAsync(() -> apiPost(COL + "/" + id + "/papers", alice, Map.of("paperId", p)))).toList();
    adds.forEach(a -> assertThat(status(a.join())).as(a.join().getBody()).isEqualTo(200));

    JsonNode entries = json(apiGet(COL + "/" + id, alice)).get("entries");
    assertThat(entryIds(entries)).containsExactlyInAnyOrderElementsOf(papers);
    assertThat(StreamSupport.stream(entries.spliterator(), false).map(e -> e.get("position").asInt()).toList())
            .containsExactly(0, 1, 2, 3, 4);
  }
}
