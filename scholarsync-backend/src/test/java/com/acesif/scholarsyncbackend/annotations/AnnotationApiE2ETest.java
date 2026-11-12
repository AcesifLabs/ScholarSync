package com.acesif.scholarsyncbackend.annotations;

import com.acesif.scholarsyncbackend.groups.entities.GroupMember;
import com.acesif.scholarsyncbackend.groups.entities.GroupMemberId;
import com.acesif.scholarsyncbackend.groups.entities.ReadingGroup;
import com.acesif.scholarsyncbackend.groups.enums.GroupRole;
import com.acesif.scholarsyncbackend.groups.repositories.GroupMemberRepository;
import com.acesif.scholarsyncbackend.groups.repositories.ReadingGroupRepository;
import com.acesif.scholarsyncbackend.support.E2ETestBase;
import com.acesif.scholarsyncbackend.users.entities.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import tools.jackson.databind.JsonNode;

import java.time.Instant;
import java.util.*;
import java.util.stream.StreamSupport;

import static org.assertj.core.api.Assertions.assertThat;

class AnnotationApiE2ETest extends E2ETestBase {

  @Autowired
  private ReadingGroupRepository groupRepository;

  @Autowired
  private GroupMemberRepository memberRepository;

  private User owner, admin, member, viewer, outsider;
  private String ownerT, adminT, memberT, viewerT, outsiderT;
  private UUID groupId;
  private String paperId;
  private String base;

  @BeforeEach
  void setUp() {
    owner = createUser("Owner");
    admin = createUser("Admin");
    member = createUser("Member");
    viewer = createUser("Viewer");
    outsider = createUser("Outsider");
    ownerT = tokenFor(owner);
    adminT = tokenFor(admin);
    memberT = tokenFor(member);
    viewerT = tokenFor(viewer);
    outsiderT = tokenFor(outsider);

    groupId = groupRepository.save(ReadingGroup.builder().name("Journal club").ownerId(owner.getId()).createdAt(Instant.now()).build()).getId();
    Map<User, GroupRole> roles = Map.of(owner, GroupRole.OWNER, admin, GroupRole.ADMIN, member, GroupRole.MEMBER, viewer, GroupRole.VIEWER);
    roles.forEach((user, role) -> memberRepository.save(GroupMember.builder()
            .id(new GroupMemberId(groupId, user.getId())).user(user).role(role).joinedAt(Instant.now()).build()));

    paperId = paperKey("ann");
    stubPaper(paperId, "Annotated paper");
    base = "/api/v1/papers/" + paperId + "/annotations";
  }

  private static Map<String, Object> position(int page, double y) {
    return Map.of("pageNumber", page, "boundingRect", Map.of("x1", 10, "y1", y, "x2", 200, "y2", y + 12, "width", 600, "height", 800),
            "rects", List.of());
  }

  private Map<String, Object> body(String visibility, UUID group, String comment, int page, double y) {
    Map<String, Object> body = new HashMap<>(Map.of("visibility", visibility, "color", "YELLOW", "position", position(page, y),
            "quote", "quoted text p" + page));
    if (group != null) body.put("groupId", group.toString());
    if (comment != null) body.put("comment", comment);
    return body;
  }

  private String create(String token, String visibility, UUID group, String comment) {
    ResponseEntity<String> res = apiPost(base, token, body(visibility, group, comment, 1, 100));
    assertThat(status(res)).as(res.getBody()).isEqualTo(201);
    return json(res).get("id").asString();
  }

  private static List<String> ids(JsonNode list) {
    return StreamSupport.stream(list.spliterator(), false).map(a -> a.get("id").asString()).toList();
  }

  @Test
  void everyEndpointRequiresLogin() {
    String id = UUID.randomUUID().toString();
    assertThat(status(apiGet(base, null))).isEqualTo(401);
    assertThat(status(apiPost(base, null, body("PRIVATE", null, null, 1, 1)))).isEqualTo(401);
    assertThat(status(apiPatch(base + "/" + id, null, Map.of("comment", "x")))).isEqualTo(401);
    assertThat(status(apiDelete(base + "/" + id, null))).isEqualTo(401);
    assertThat(status(apiPost(base + "/" + id + "/replies", null, Map.of("body", "x")))).isEqualTo(401);
    assertThat(status(apiPost(base + "/" + id + "/resolve", null, null))).isEqualTo(401);
    assertThat(status(apiGet(base + "/export", null))).isEqualTo(401);
  }

  @Test
  void privateAnnotationIsOnlyVisibleToItsAuthor() {
    String id = create(memberT, "PRIVATE", null, "my note");

    JsonNode mine = json(apiGet(base, memberT));
    assertThat(ids(mine)).containsExactly(id);
    assertThat(mine.get(0).get("author").get("name").asString()).isEqualTo("Member");
    assertThat(mine.get(0).get("quote").asString()).isEqualTo("quoted text p1");
    assertThat(mine.get(0).get("position").get("pageNumber").asInt()).isEqualTo(1);

    for (String other : List.of(ownerT, adminT, viewerT, outsiderT)) {
      assertThat(json(apiGet(base, other))).isEmpty();
      assertThat(status(apiPatch(base + "/" + id, other, Map.of("comment", "x")))).isEqualTo(404);
      assertThat(status(apiPost(base + "/" + id + "/replies", other, Map.of("body", "x")))).isEqualTo(404);
      assertThat(status(apiDelete(base + "/" + id, other))).isEqualTo(404);
    }
  }

  @Test
  void groupAnnotationIsVisibleToAllMembersButNotOutsiders() {
    String id = create(memberT, "GROUP", groupId, "for the club");

    for (String token : List.of(ownerT, adminT, memberT, viewerT)) {
      assertThat(ids(json(apiGet(base, token)))).containsExactly(id);
    }
    assertThat(json(apiGet(base, outsiderT))).isEmpty();
    assertThat(status(apiGet(base + "?groupId=" + groupId, outsiderT))).isEqualTo(403);
  }

  @Test
  void whoMayCreateGroupAnnotations() {
    assertThat(status(apiPost(base, ownerT, body("GROUP", groupId, null, 1, 1)))).isEqualTo(201);
    assertThat(status(apiPost(base, adminT, body("GROUP", groupId, null, 1, 1)))).isEqualTo(201);
    assertThat(status(apiPost(base, memberT, body("GROUP", groupId, null, 1, 1)))).isEqualTo(201);
    assertThat(status(apiPost(base, viewerT, body("GROUP", groupId, null, 1, 1)))).isEqualTo(403);
    assertThat(status(apiPost(base, outsiderT, body("GROUP", groupId, null, 1, 1)))).isEqualTo(403);
    assertThat(status(apiPost(base, memberT, body("GROUP", UUID.randomUUID(), null, 1, 1)))).isEqualTo(404);
  }

  @Test
  void visibilityAndGroupIdMustAgree() {
    assertThat(status(apiPost(base, memberT, body("GROUP", null, null, 1, 1)))).isEqualTo(400);
    assertThat(status(apiPost(base, memberT, body("PRIVATE", groupId, null, 1, 1)))).isEqualTo(400);
  }

  @ParameterizedTest
  @ValueSource(strings = {
          "{}",
          "{\"visibility\":\"PRIVATE\",\"color\":\"YELLOW\"}",
          "{\"visibility\":\"PUBLIC\",\"color\":\"YELLOW\",\"position\":{\"pageNumber\":1,\"boundingRect\":{\"y1\":1}}}",
          "{\"visibility\":\"PRIVATE\",\"color\":\"PINK\",\"position\":{\"pageNumber\":1,\"boundingRect\":{\"y1\":1}}}",
          "{\"visibility\":\"PRIVATE\",\"color\":\"YELLOW\",\"position\":{\"boundingRect\":{\"y1\":1}}}",
          "{\"visibility\":\"PRIVATE\",\"color\":\"YELLOW\",\"position\":{\"pageNumber\":0,\"boundingRect\":{\"y1\":1}}}",
          "{\"visibility\":\"PRIVATE\",\"color\":\"YELLOW\",\"position\":{\"pageNumber\":\"one\",\"boundingRect\":{\"y1\":1}}}",
          "{\"visibility\":\"PRIVATE\",\"color\":\"YELLOW\",\"position\":{\"pageNumber\":1}}",
          "{\"visibility\":\"PRIVATE\",\"color\":\"YELLOW\",\"position\":{\"pageNumber\":1,\"boundingRect\":{\"y1\":\"top\"}}}",
          "not json"
  })
  void invalidCreateBodyIs400(String body) {
    assertThat(status(apiPost(base, memberT, body))).as(body).isEqualTo(400);
  }

  @Test
  void commentLengthLimit() {
    assertThat(status(apiPost(base, memberT, body("PRIVATE", null, "c".repeat(10001), 1, 1)))).isEqualTo(400);
  }

  @Test
  void annotatingAnUnknownPaperIs404() {
    assertThat(status(apiPost("/api/v1/papers/no-such-paper/annotations", memberT, body("PRIVATE", null, null, 1, 1)))).isEqualTo(404);
  }

  @Test
  void onlyTheAuthorCanEdit() {
    String id = create(memberT, "GROUP", groupId, "original");

    JsonNode edited = json(apiPatch(base + "/" + id, memberT, Map.of("comment", "edited", "color", "GREEN")));
    assertThat(edited.get("comment").asString()).isEqualTo("edited");
    assertThat(edited.get("color").asString()).isEqualTo("GREEN");

    assertThat(status(apiPatch(base + "/" + id, ownerT, Map.of("comment", "hijack")))).isEqualTo(403);
    assertThat(status(apiPatch(base + "/" + id, adminT, Map.of("comment", "hijack")))).isEqualTo(403);
    assertThat(status(apiPatch(base + "/" + id, outsiderT, Map.of("comment", "hijack")))).isEqualTo(404);
    assertThat(json(apiPatch(base + "/" + id, memberT, Map.of("comment", ""))).get("comment").isNull()).isTrue();
  }

  @Test
  void deleteByAuthorOrGroupAdmin() {
    String byAuthor = create(memberT, "GROUP", groupId, "a");
    String byAdmin = create(memberT, "GROUP", groupId, "b");
    String byOwner = create(memberT, "GROUP", groupId, "c");
    String protectedOne = create(adminT, "GROUP", groupId, "d");

    assertThat(status(apiDelete(base + "/" + protectedOne, memberT))).isEqualTo(403);
    assertThat(status(apiDelete(base + "/" + protectedOne, viewerT))).isEqualTo(403);
    assertThat(status(apiDelete(base + "/" + byAuthor, memberT))).isEqualTo(204);
    assertThat(status(apiDelete(base + "/" + byAdmin, adminT))).isEqualTo(204);
    assertThat(status(apiDelete(base + "/" + byOwner, ownerT))).isEqualTo(204);
    assertThat(ids(json(apiGet(base, memberT)))).containsExactly(protectedOne);
  }

  @Test
  void repliesAndTheirPermissions() {
    String id = create(memberT, "GROUP", groupId, "question?");

    ResponseEntity<String> reply = apiPost(base + "/" + id + "/replies", adminT, Map.of("body", "  answer  "));
    assertThat(status(reply)).isEqualTo(201);
    assertThat(json(reply).get("body").asString()).isEqualTo("answer");
    assertThat(status(apiPost(base + "/" + id + "/replies", viewerT, Map.of("body", "can I?")))).isEqualTo(403);
    assertThat(status(apiPost(base + "/" + id + "/replies", outsiderT, Map.of("body", "hi")))).isEqualTo(404);
    assertThat(status(apiPost(base + "/" + id + "/replies", memberT, Map.of("body", " ")))).isEqualTo(400);
    assertThat(status(apiPost(base + "/" + id + "/replies", memberT, Map.of("body", "r".repeat(10001))))).isEqualTo(400);

    JsonNode thread = json(apiGet(base, viewerT)).get(0).get("replies");
    assertThat(thread).hasSize(1);
    assertThat(thread.get(0).get("author").get("name").asString()).isEqualTo("Admin");

    String replyId = json(reply).get("id").asString();
    assertThat(status(apiDelete(base + "/" + id + "/replies/" + replyId, memberT))).isEqualTo(403);
    assertThat(status(apiDelete(base + "/" + id + "/replies/" + replyId, adminT))).isEqualTo(204);
    assertThat(status(apiDelete(base + "/" + id + "/replies/" + replyId, adminT))).isEqualTo(404);
  }

  @Test
  void replyingToADeletedAnnotationIs404() {
    String id = create(memberT, "PRIVATE", null, "temp");
    apiDelete(base + "/" + id, memberT);
    assertThat(status(apiPost(base + "/" + id + "/replies", memberT, Map.of("body", "late")))).isEqualTo(404);
  }

  @Test
  void annotationIdUnderTheWrongPaperIs404() {
    String id = create(memberT, "PRIVATE", null, "here");
    String other = paperKey("other");
    stubPaper(other, "Other");
    assertThat(status(apiPatch("/api/v1/papers/" + other + "/annotations/" + id, memberT, Map.of("comment", "x")))).isEqualTo(404);
  }

  @Test
  void resolveAndFilters() {
    String open = create(memberT, "GROUP", groupId, "open");
    String done = create(adminT, "GROUP", groupId, "done");
    create(memberT, "PRIVATE", null, "private");

    assertThat(json(apiPost(base + "/" + done + "/resolve", memberT, null)).get("resolved").asBoolean()).isTrue();
    assertThat(status(apiPost(base + "/" + done + "/resolve", viewerT, null))).isEqualTo(403);

    assertThat(ids(json(apiGet(base + "?includeResolved=false&groupId=" + groupId, memberT)))).containsExactly(open);
    assertThat(ids(json(apiGet(base + "?groupId=" + groupId, memberT)))).containsExactlyInAnyOrder(open, done);
    assertThat(ids(json(apiGet(base + "?authorId=" + admin.getId(), memberT)))).containsExactly(done);
    assertThat(json(apiGet(base, memberT))).hasSize(3);

    assertThat(json(apiPost(base + "/" + done + "/unresolve", ownerT, null)).get("resolved").asBoolean()).isFalse();
  }

  @Test
  void viewerCanFilterByTheirGroupButBadIdsAre400() {
    assertThat(status(apiGet(base + "?groupId=" + groupId, viewerT))).isEqualTo(200);
    assertThat(status(apiGet(base + "?groupId=not-a-uuid", viewerT))).isEqualTo(400);
    assertThat(status(apiGet(base + "?groupId=" + UUID.randomUUID(), viewerT))).isEqualTo(404);
  }

  @Test
  void markdownExportIsOrderedByPageThenPosition() {
    apiPost(base, memberT, body("PRIVATE", null, "third", 2, 50));
    apiPost(base, memberT, body("PRIVATE", null, "second", 1, 400));
    ResponseEntity<String> first = apiPost(base, memberT, body("PRIVATE", null, "first", 1, 20));
    apiPost(base + "/" + json(first).get("id").asString() + "/replies", memberT, Map.of("body", "self reply"));
    apiPost(base, adminT, body("PRIVATE", null, "not mine", 1, 1));

    ResponseEntity<String> res = apiGet(base + "/export", memberT);

    assertThat(res.getHeaders().getContentType().toString()).startsWith("text/markdown");
    String md = res.getBody();
    assertThat(md).startsWith("# Annotations: Annotated paper\n").doesNotContain("not mine");
    assertThat(md.indexOf("## Page 1")).isLessThan(md.indexOf("first"));
    assertThat(md.indexOf("first")).isLessThan(md.indexOf("second"));
    assertThat(md.indexOf("second")).isLessThan(md.indexOf("## Page 2"));
    assertThat(md.indexOf("## Page 2")).isLessThan(md.indexOf("third"));
    assertThat(md).contains("- first — Member, yellow\n  - Member: self reply\n").contains("> quoted text p1\n");
  }

  @Test
  void anAuthorDemotedToViewerCanNoLongerEditTheirGroupAnnotation() {
    String id = create(memberT, "GROUP", groupId, "before");
    String own = create(memberT, "PRIVATE", null, "private");
    memberRepository.findById(new GroupMemberId(groupId, member.getId())).ifPresent(m -> {
      m.setRole(GroupRole.VIEWER);
      memberRepository.save(m);
    });

    assertThat(status(apiPatch(base + "/" + id, memberT, Map.of("comment", "after")))).isEqualTo(403);
    assertThat(json(apiGet(base + "?groupId=" + groupId, memberT)).get(0).get("comment").asString()).isEqualTo("before");
    // private annotations do not depend on a group role
    assertThat(status(apiPatch(base + "/" + own, memberT, Map.of("comment", "still mine")))).isEqualTo(200);
  }

  @Test
  void resolvingAgainKeepsWhoResolvedItAndWhen() {
    String id = create(memberT, "GROUP", groupId, "thread");
    apiPost(base + "/" + id + "/resolve", memberT, null);
    Map<String, Object> first = jdbc.queryForMap("SELECT resolved_at, resolved_by FROM annotations WHERE id = ?::uuid", id);

    assertThat(json(apiPost(base + "/" + id + "/resolve", adminT, null)).get("resolved").asBoolean()).isTrue();

    assertThat(jdbc.queryForMap("SELECT resolved_at, resolved_by FROM annotations WHERE id = ?::uuid", id)).isEqualTo(first);
    assertThat(first.get("resolved_by")).isEqualTo(member.getId());
    apiPost(base + "/" + id + "/unresolve", adminT, null);
    assertThat(jdbc.queryForMap("SELECT resolved_at, resolved_by FROM annotations WHERE id = ?::uuid", id).values()).containsOnlyNulls();
  }

  @Test
  void anAliasPaperIdReachesTheSameAnnotations() {
    String id = create(memberT, "GROUP", groupId, "by key");
    String alias = "/api/v1/papers/openalex:" + jdbc.queryForObject("SELECT openalex_id FROM papers WHERE id = ?", String.class, paperId)
            + "/annotations";

    assertThat(ids(json(apiGet(alias, viewerT)))).containsExactly(id);
    ResponseEntity<String> viaAlias = apiPost(alias, memberT, body("PRIVATE", null, "by alias", 1, 1));
    assertThat(status(viaAlias)).isEqualTo(201);
    assertThat(json(viaAlias).get("paperId").asString()).isEqualTo(paperId);
    assertThat(status(apiPatch(alias + "/" + id, memberT, Map.of("comment", "edited via alias")))).isEqualTo(200);
    assertThat(status(apiPost(alias + "/" + id + "/replies", adminT, Map.of("body", "reply via alias")))).isEqualTo(201);
    assertThat(apiGet(alias + "/export", memberT).getBody()).contains("edited via alias").contains("by alias").contains("reply via alias");
    assertThat(json(apiGet(base, memberT))).hasSize(2);
  }

  @Test
  void exportCanBeLimitedToOneGroupAndChecksAccess() {
    create(memberT, "GROUP", groupId, "group note");
    create(memberT, "PRIVATE", null, "private note");

    String all = apiGet(base + "/export", memberT).getBody();
    assertThat(all).contains("group note").contains("private note");
    ResponseEntity<String> groupOnly = apiGet(base + "/export?groupId=" + groupId, viewerT);
    assertThat(status(groupOnly)).isEqualTo(200);
    assertThat(groupOnly.getBody()).contains("group note").doesNotContain("private note");

    assertThat(status(apiGet(base + "/export?groupId=" + groupId, outsiderT))).isEqualTo(403);
    assertThat(status(apiGet(base + "/export?groupId=" + UUID.randomUUID(), memberT))).isEqualTo(404);
    assertThat(status(apiGet(base + "/export?groupId=not-a-uuid", memberT))).isEqualTo(400);
    assertThat(status(apiGet("/api/v1/papers/no-such-paper/annotations/export", memberT))).isEqualTo(404);
    // a well-formed id that no source knows (WireMock answers 404 to unstubbed lookups)
    assertThat(status(apiGet("/api/v1/papers/" + paperKey("unknown") + "/annotations/export", memberT))).isEqualTo(404);
  }

  @Test
  void groupAnnotationsListEveryMembersSharedAnnotationsNewestFirstWithThePaperTitle() {
    String first = create(memberT, "GROUP", groupId, "first");
    String second = create(adminT, "GROUP", groupId, "second");
    create(memberT, "PRIVATE", null, "mine only");
    String groupBase = "/api/v1/groups/" + groupId + "/annotations";

    for (String token : List.of(ownerT, memberT, viewerT)) {
      JsonNode page = json(apiGet(groupBase, token));
      assertThat(page.get("total").asInt()).isEqualTo(2);
      assertThat(StreamSupport.stream(page.get("items").spliterator(), false).map(i -> i.get("annotation").get("id").asString()))
              .containsExactly(second, first);
      assertThat(page.get("items").get(0).get("paperTitle").asString()).isEqualTo("Annotated paper");
    }
  }

  @Test
  void groupAnnotationsArePagedAndCanHideResolved() {
    String a = create(memberT, "GROUP", groupId, "a");
    String b = create(memberT, "GROUP", groupId, "b");
    String c = create(memberT, "GROUP", groupId, "c");
    assertThat(status(apiPost(base + "/" + a + "/resolve", memberT, null))).isEqualTo(200);
    String groupBase = "/api/v1/groups/" + groupId + "/annotations";

    JsonNode page = json(apiGet(groupBase + "?page=1&size=2", memberT));
    assertThat(page.get("total").asInt()).isEqualTo(3);
    assertThat(page.get("items").get(0).get("annotation").get("id").asString()).isEqualTo(a);
    assertThat(ids(withoutWrapper(json(apiGet(groupBase + "?includeResolved=false", memberT))))).containsExactly(c, b);
  }

  @Test
  void groupAnnotationsNeedLoginAndMembership() {
    String groupBase = "/api/v1/groups/" + groupId + "/annotations";
    assertThat(status(apiGet(groupBase, null))).isEqualTo(401);
    assertThat(status(apiGet(groupBase, outsiderT))).isEqualTo(403);
    assertThat(status(apiGet(groupBase + "?size=0", memberT))).isEqualTo(400);
    assertThat(status(apiGet(groupBase + "?size=101", memberT))).isEqualTo(400);
  }

  private static JsonNode withoutWrapper(JsonNode page) {
    tools.jackson.databind.node.ArrayNode out = tools.jackson.databind.node.JsonNodeFactory.instance.arrayNode();
    page.get("items").forEach(i -> out.add(i.get("annotation")));
    return out;
  }
}
