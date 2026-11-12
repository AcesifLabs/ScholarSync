package com.acesif.scholarsyncbackend.groups;

import com.acesif.scholarsyncbackend.groups.entities.GroupInvite;
import com.acesif.scholarsyncbackend.groups.repositories.GroupInviteRepository;
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
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.stream.StreamSupport;

import static org.assertj.core.api.Assertions.assertThat;

class GroupApiE2ETest extends E2ETestBase {

  private static final String GROUPS = "/api/v1/groups";

  @Autowired
  private GroupInviteRepository inviteRepository;

  private User owner, admin, member, viewer, outsider;
  private String ownerT, adminT, memberT, viewerT, outsiderT;
  private String groupId;
  private String g;

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

    ResponseEntity<String> created = apiPost(GROUPS, ownerT, Map.of("name", "Journal club", "description", "Weekly", "tags", List.of("ml", " nlp ")));
    assertThat(status(created)).isEqualTo(201);
    groupId = json(created).get("id").asString();
    g = GROUPS + "/" + groupId;
    assertThat(status(apiPost(g + "/members", ownerT, Map.of("email", admin.getEmail(), "role", "ADMIN")))).isEqualTo(202);
    assertThat(status(apiPost(g + "/members", ownerT, Map.of("email", member.getEmail(), "role", "MEMBER")))).isEqualTo(202);
    assertThat(status(apiPost(g + "/members", ownerT, Map.of("email", viewer.getEmail(), "role", "VIEWER")))).isEqualTo(202);
  }

  private String sharePaper(String title) {
    String paperId = paperKey("gp");
    stubPaper(paperId, title);
    assertThat(status(apiPost(g + "/papers", memberT, Map.of("paperId", paperId)))).isEqualTo(200);
    return paperId;
  }

  private static List<String> field(JsonNode list, String... path) {
    return StreamSupport.stream(list.spliterator(), false).map(n -> {
      JsonNode cur = n;
      for (String p : path) cur = cur.get(p);
      return cur.asString();
    }).toList();
  }

  /** Asserts the status each role gets for the same request. Order: owner, admin, member, viewer, outsider. */
  private void matrix(java.util.function.Function<String, ResponseEntity<String>> request, int... expected) {
    List<String> tokens = List.of(ownerT, adminT, memberT, viewerT, outsiderT);
    List<String> names = List.of("owner", "admin", "member", "viewer", "outsider");
    for (int i = 0; i < tokens.size(); i++) {
      if (expected[i] < 0) continue;
      ResponseEntity<String> res = request.apply(tokens.get(i));
      assertThat(status(res)).as(names.get(i) + ": " + res.getBody()).isEqualTo(expected[i]);
    }
  }

  @Test
  void everyEndpointRequiresLogin() {
    assertThat(status(apiGet(GROUPS, null))).isEqualTo(401);
    assertThat(status(apiPost(GROUPS, null, Map.of("name", "x")))).isEqualTo(401);
    assertThat(status(apiGet(g, null))).isEqualTo(401);
    assertThat(status(apiPost(GROUPS + "/join/abc", null, null))).isEqualTo(401);
    assertThat(status(apiGet(g + "/activity", null))).isEqualTo(401);
  }

  @Test
  void createAndListMyGroups() {
    JsonNode mine = json(apiGet(GROUPS, ownerT));
    assertThat(mine).hasSize(1);
    assertThat(mine.get(0).get("myRole").asString()).isEqualTo("OWNER");
    assertThat(mine.get(0).get("memberCount").asInt()).isEqualTo(4);
    assertThat(mine.get(0).get("tags")).extracting(JsonNode::asString).containsExactly("ml", "nlp");
    assertThat(json(apiGet(GROUPS, viewerT)).get(0).get("myRole").asString()).isEqualTo("VIEWER");
    assertThat(json(apiGet(GROUPS, outsiderT))).isEmpty();
  }

  @ParameterizedTest
  @ValueSource(strings = {"{}", "{\"name\":\" \"}", "{\"name\":\"x\",\"tags\":[\"\"]}", "{\"name\":\"x\",\"tags\":[\"1\",\"2\",\"3\",\"4\",\"5\",\"6\",\"7\",\"8\",\"9\",\"10\",\"11\"]}"})
  void invalidCreateIs400(String body) {
    assertThat(status(apiPost(GROUPS, ownerT, body))).as(body).isEqualTo(400);
  }

  @Test
  void readAccessMatrix() {
    matrix(t -> apiGet(g, t), 200, 200, 200, 200, 403);
    matrix(t -> apiGet(g + "/members", t), 200, 200, 200, 200, 403);
    matrix(t -> apiGet(g + "/papers", t), 200, 200, 200, 200, 403);
    matrix(t -> apiGet(g + "/activity", t), 200, 200, 200, 200, 403);
    matrix(t -> apiGet(g + "/invites", t), 200, 200, 403, 403, 403);
    assertThat(status(apiGet(GROUPS + "/" + UUID.randomUUID(), ownerT))).isEqualTo(404);
    assertThat(status(apiGet(GROUPS + "/not-a-uuid", ownerT))).isEqualTo(400);
  }

  @Test
  void updateAndDeleteMatrix() {
    matrix(t -> apiPatch(g, t, Map.of("description", "changed")), 200, 200, 403, 403, 403);
    assertThat(json(apiGet(g, memberT)).get("description").asString()).isEqualTo("changed");
    assertThat(status(apiPatch(g, ownerT, Map.of("name", " ")))).isEqualTo(400);

    matrix(t -> apiDelete(g, t), -1, 403, 403, 403, 403);
    assertThat(status(apiDelete(g, ownerT))).isEqualTo(204);
    assertThat(status(apiGet(g, ownerT))).isEqualTo(404);
  }

  @Test
  void addMemberByEmail() {
    User newcomer = createUser("Newcomer");
    matrix(t -> apiPost(g + "/members", t, Map.of("email", newcomer.getEmail(), "role", "MEMBER")), -1, -1, 403, 403, 403);
    ResponseEntity<String> added = apiPost(g + "/members", adminT, Map.of("email", newcomer.getEmail(), "role", "MEMBER"));
    ResponseEntity<String> again = apiPost(g + "/members", adminT, Map.of("email", newcomer.getEmail(), "role", "MEMBER"));
    ResponseEntity<String> unknown = apiPost(g + "/members", adminT, Map.of("email", "nobody-" + UUID.randomUUID() + "@example.com", "role", "MEMBER"));
    // the same answer whether the address has an account, is already a member or is unknown: no account probing
    for (ResponseEntity<String> res : List.of(added, again, unknown)) {
      assertThat(status(res)).isEqualTo(202);
      assertThat(res.getBody()).isEmpty();
    }
    assertThat(status(apiPost(g + "/members", adminT, Map.of("email", "not-an-email", "role", "MEMBER")))).isEqualTo(400);
    assertThat(status(apiPost(g + "/members", adminT, Map.of("email", createUser("X").getEmail(), "role", "OWNER")))).isEqualTo(400);
    assertThat(status(apiPost(g + "/members", adminT, Map.of("email", createUser("Y").getEmail(), "role", "BOSS")))).isEqualTo(400);
    assertThat(field(json(apiGet(g + "/members", viewerT)), "user", "name")).contains("Newcomer");
  }

  @Test
  void changeRoles() {
    String path = g + "/members/" + member.getId();
    matrix(t -> apiPatch(path, t, Map.of("role", "VIEWER")), -1, -1, 403, 403, 403);
    assertThat(json(apiPatch(path, adminT, Map.of("role", "VIEWER"))).get("role").asString()).isEqualTo("VIEWER");
    assertThat(status(apiPost(g + "/papers", memberT, Map.of("paperId", "x")))).isEqualTo(403);

    assertThat(status(apiPatch(g + "/members/" + owner.getId(), adminT, Map.of("role", "MEMBER")))).isEqualTo(400);
    assertThat(status(apiPatch(path, adminT, Map.of("role", "OWNER")))).isEqualTo(400);
    assertThat(status(apiPatch(g + "/members/" + outsider.getId(), adminT, Map.of("role", "MEMBER")))).isEqualTo(404);
    assertThat(status(apiPatch(path, adminT, "{}"))).isEqualTo(400);
  }

  @Test
  void removeMembersAndLeave() {
    assertThat(status(apiDelete(g + "/members/" + viewer.getId(), memberT))).isEqualTo(403);
    assertThat(status(apiDelete(g + "/members/" + owner.getId(), adminT))).isEqualTo(400);
    assertThat(status(apiDelete(g + "/members/" + viewer.getId(), adminT))).isEqualTo(204);
    assertThat(status(apiGet(g, viewerT))).isEqualTo(403);

    assertThat(status(apiPost(g + "/leave", memberT, null))).isEqualTo(204);
    assertThat(status(apiGet(g, memberT))).isEqualTo(403);
    assertThat(status(apiPost(g + "/leave", ownerT, null))).isEqualTo(400);
    assertThat(status(apiPost(g + "/leave", outsiderT, null))).isEqualTo(403);
  }

  @Test
  void inviteLinkLifecycle() {
    matrix(t -> apiPost(g + "/invites", t, Map.of("role", "MEMBER", "expiresInHours", 24)), 201, 201, 403, 403, 403);
    JsonNode invite = json(apiPost(g + "/invites", adminT, Map.of("role", "VIEWER", "expiresInHours", 1)));
    String token = invite.get("token").asString();
    assertThat(token).hasSizeGreaterThanOrEqualTo(32);
    assertThat(json(apiGet(g + "/invites", adminT))).hasSize(3);

    JsonNode joined = json(apiPost(GROUPS + "/join/" + token, outsiderT, null));
    assertThat(joined.get("myRole").asString()).isEqualTo("VIEWER");
    assertThat(status(apiGet(g, outsiderT))).isEqualTo(200);
    // joining again is idempotent and keeps the role
    assertThat(json(apiPost(GROUPS + "/join/" + token, outsiderT, null)).get("myRole").asString()).isEqualTo("VIEWER");
    assertThat(json(apiPost(GROUPS + "/join/" + token, memberT, null)).get("myRole").asString()).isEqualTo("MEMBER");

    assertThat(status(apiDelete(g + "/invites/" + invite.get("id").asString(), memberT))).isEqualTo(403);
    assertThat(status(apiDelete(g + "/invites/" + invite.get("id").asString(), adminT))).isEqualTo(204);
    assertThat(status(apiPost(GROUPS + "/join/" + token, tokenFor(createUser("Late")), null))).isEqualTo(410);
    assertThat(status(apiDelete(g + "/invites/" + UUID.randomUUID(), adminT))).isEqualTo(404);
  }

  @Test
  void expiredAndUnknownInvites() {
    GroupInvite expired = inviteRepository.save(GroupInvite.builder().groupId(UUID.fromString(groupId)).token("expired-token-" + UUID.randomUUID())
            .role(com.acesif.scholarsyncbackend.groups.enums.GroupRole.MEMBER).expiresAt(Instant.now().minusSeconds(60))
            .createdAt(Instant.now().minusSeconds(3600)).build());
    assertThat(status(apiPost(GROUPS + "/join/" + expired.getToken(), outsiderT, null))).isEqualTo(410);
    assertThat(status(apiPost(GROUPS + "/join/no-such-token", outsiderT, null))).isEqualTo(404);
    assertThat(field(json(apiGet(g + "/invites", ownerT)), "token")).doesNotContain(expired.getToken());
  }

  @ParameterizedTest
  @ValueSource(strings = {"{\"role\":\"OWNER\",\"expiresInHours\":1}", "{\"role\":\"MEMBER\",\"expiresInHours\":0}",
          "{\"role\":\"MEMBER\",\"expiresInHours\":721}", "{\"expiresInHours\":5}"})
  void invalidInviteIs400(String body) {
    assertThat(status(apiPost(g + "/invites", ownerT, body))).as(body).isEqualTo(400);
  }

  @Test
  void sharedPapers() {
    String paperId = paperKey("gp");
    stubPaper(paperId, "Shared");
    matrix(t -> apiPost(g + "/papers", t, Map.of("paperId", paperId)), 200, 200, 200, 403, 403);

    JsonNode papers = json(apiGet(g + "/papers", viewerT));
    assertThat(papers).hasSize(1);
    assertThat(papers.get(0).get("paper").get("title").asString()).isEqualTo("Shared");
    assertThat(papers.get(0).get("addedBy").get("name").asString()).isEqualTo("Owner");

    assertThat(status(apiPost(g + "/papers", memberT, Map.of("paperId", "missing-paper")))).isEqualTo(404);
    matrix(t -> apiDelete(g + "/papers/" + paperId, t), -1, -1, 403, 403, 403);
    assertThat(status(apiDelete(g + "/papers/" + paperId, adminT))).isEqualTo(204);
    assertThat(json(apiGet(g + "/papers", viewerT))).isEmpty();
  }

  @Test
  void threadedDiscussion() {
    String paperId = sharePaper("Discussed");
    String thread = g + "/papers/" + paperId + "/comments";

    ResponseEntity<String> root = apiPost(thread, memberT, Map.of("bodyMd", "**Bold** claim"));
    assertThat(status(root)).isEqualTo(201);
    String rootId = json(root).get("id").asString();
    assertThat(status(apiPost(thread, adminT, Map.of("bodyMd", "reply", "parentId", rootId)))).isEqualTo(201);
    matrix(t -> apiPost(thread, t, Map.of("bodyMd", "hi")), -1, -1, -1, 403, 403);

    JsonNode comments = json(apiGet(thread, viewerT));
    assertThat(field(comments, "bodyMd")).containsExactly("**Bold** claim", "reply");
    assertThat(comments.get(1).get("parentId").asString()).isEqualTo(rootId);
    assertThat(status(apiGet(thread, outsiderT))).isEqualTo(403);

    assertThat(status(apiPost(thread, memberT, Map.of("bodyMd", " ")))).isEqualTo(400);
    assertThat(status(apiPost(thread, memberT, Map.of("bodyMd", "x".repeat(20001))))).isEqualTo(400);
    assertThat(status(apiPost(thread, memberT, Map.of("bodyMd", "orphan", "parentId", UUID.randomUUID().toString())))).isEqualTo(400);
    assertThat(status(apiPost(g + "/papers/not-shared/comments", memberT, Map.of("bodyMd", "x")))).isEqualTo(404);

    String otherPaper = sharePaper("Other");
    assertThat(status(apiPost(g + "/papers/" + otherPaper + "/comments", memberT, Map.of("bodyMd", "x", "parentId", rootId)))).isEqualTo(400);
  }

  @Test
  void editAndDeleteComments() {
    String paperId = sharePaper("Edits");
    String thread = g + "/papers/" + paperId + "/comments";
    String id = json(apiPost(thread, memberT, Map.of("bodyMd", "first draft"))).get("id").asString();
    String path = g + "/comments/" + id;

    JsonNode edited = json(apiPatch(path, memberT, Map.of("bodyMd", "second draft")));
    assertThat(edited.get("bodyMd").asString()).isEqualTo("second draft");
    assertThat(edited.get("editedAt").isNull()).isFalse();
    assertThat(status(apiPatch(path, adminT, Map.of("bodyMd", "hijack")))).isEqualTo(403);

    assertThat(status(apiDelete(path, viewerT))).isEqualTo(403);
    assertThat(status(apiDelete(path, adminT))).isEqualTo(204);
    JsonNode deleted = json(apiGet(thread, memberT)).get(0);
    assertThat(deleted.get("deleted").asBoolean()).isTrue();
    assertThat(deleted.get("bodyMd").isNull()).isTrue();
    assertThat(status(apiPatch(path, memberT, Map.of("bodyMd", "revive")))).isEqualTo(404);
    assertThat(status(apiDelete(g + "/comments/" + UUID.randomUUID(), adminT))).isEqualTo(404);
  }

  @Test
  void activityFeedRecordsEventsAndFilters() {
    String a = sharePaper("Paper A");
    String b = sharePaper("Paper B");
    apiPost(g + "/papers/" + a + "/comments", adminT, Map.of("bodyMd", "on A"));
    Map<String, Object> annotation = Map.of("visibility", "GROUP", "groupId", groupId, "color", "GREEN",
            "position", Map.of("pageNumber", 1, "boundingRect", Map.of("y1", 5), "rects", List.of()));
    assertThat(status(apiPost("/api/v1/papers/" + b + "/annotations", memberT, annotation))).isEqualTo(201);

    JsonNode feed = json(apiGet(g + "/activity", viewerT));
    assertThat(field(feed, "type")).containsExactly("ANNOTATION_ADDED", "COMMENT_POSTED", "PAPER_ADDED", "PAPER_ADDED",
            "MEMBER_JOINED", "MEMBER_JOINED", "MEMBER_JOINED");
    assertThat(feed.get(1).get("paperTitle").asString()).isEqualTo("Paper A");

    assertThat(field(json(apiGet(g + "/activity?actorId=" + admin.getId(), viewerT)), "type")).containsExactly("COMMENT_POSTED", "MEMBER_JOINED");
    assertThat(field(json(apiGet(g + "/activity?paperId=" + b, viewerT)), "type")).containsExactly("ANNOTATION_ADDED", "PAPER_ADDED");

    JsonNode page1 = json(apiGet(g + "/activity?limit=2", viewerT));
    assertThat(page1).hasSize(2);
    long cursor = page1.get(1).get("id").asLong();
    JsonNode page2 = json(apiGet(g + "/activity?limit=2&before=" + cursor, viewerT));
    assertThat(page2.get(0).get("id").asLong()).isLessThan(cursor);

    assertThat(status(apiGet(g + "/activity?limit=0", viewerT))).isEqualTo(400);
    assertThat(status(apiGet(g + "/activity?limit=101", viewerT))).isEqualTo(400);
    assertThat(status(apiGet(g + "/activity?before=0", viewerT))).isEqualTo(400);
  }

  @Test
  void myActivitySpansMyGroupsOnly() {
    sharePaper("Mine");
    String otherGroup = json(apiPost(GROUPS, outsiderT, Map.of("name", "Elsewhere"))).get("id").asString();
    String hidden = paperKey("hidden");
    stubPaper(hidden, "Hidden");
    apiPost(GROUPS + "/" + otherGroup + "/papers", outsiderT, Map.of("paperId", hidden));

    JsonNode mine = json(apiGet(GROUPS + "/activity/mine?limit=50", memberT));
    assertThat(field(mine, "groupId")).containsOnly(groupId);
    assertThat(field(mine, "type")).contains("PAPER_ADDED");
    assertThat(json(apiGet(GROUPS + "/activity/mine", tokenFor(createUser("Loner"))))).isEmpty();
  }

  @Test
  void aMemberCanDeleteTheirOwnCommentButNotOthers() {
    String thread = g + "/papers/" + sharePaper("Own comment") + "/comments";
    String mine = json(apiPost(thread, memberT, Map.of("bodyMd", "mine"))).get("id").asString();
    String admins = json(apiPost(thread, adminT, Map.of("bodyMd", "admin's"))).get("id").asString();

    assertThat(status(apiDelete(g + "/comments/" + admins, memberT))).isEqualTo(403);
    assertThat(status(apiDelete(g + "/comments/" + mine, memberT))).isEqualTo(204);
    assertThat(field(json(apiGet(thread, memberT)), "deleted")).containsExactly("true", "false");
  }

  @Test
  void anAliasPaperIdReachesTheSameGroupPaperAndThread() {
    String paperId = sharePaper("Aliased");
    String alias = "openalex:" + jdbc.queryForObject("SELECT openalex_id FROM papers WHERE id = ?", String.class, paperId);

    assertThat(json(apiPost(g + "/papers", memberT, Map.of("paperId", alias))).get("paper").get("id").asString()).isEqualTo(paperId);
    assertThat(json(apiGet(g + "/papers", memberT))).hasSize(1);
    assertThat(status(apiPost(g + "/papers/" + alias + "/comments", memberT, Map.of("bodyMd", "via alias")))).isEqualTo(201);
    assertThat(field(json(apiGet(g + "/papers/" + paperId + "/comments", viewerT)), "bodyMd")).containsExactly("via alias");
    assertThat(field(json(apiGet(g + "/papers/" + alias + "/comments", viewerT)), "bodyMd")).containsExactly("via alias");
    assertThat(field(json(apiGet(g + "/activity?paperId=" + alias, viewerT)), "type")).containsExactly("COMMENT_POSTED", "PAPER_ADDED");

    assertThat(status(apiDelete(g + "/papers/" + alias, adminT))).isEqualTo(204);
    assertThat(json(apiGet(g + "/papers", memberT))).isEmpty();
  }

  @Test
  void patchRenamesReplacesTagsAndClearsTheDescription() {
    JsonNode updated = json(apiPatch(g, adminT, Map.of("name", "  Renamed club ", "tags", List.of(" a ", "b", "a"))));
    assertThat(updated.get("name").asString()).isEqualTo("Renamed club");
    assertThat(updated.get("tags")).extracting(JsonNode::asString).containsExactly("a", "b");
    assertThat(updated.get("description").asString()).isEqualTo("Weekly");

    JsonNode cleared = json(apiPatch(g, adminT, Map.of("description", "", "tags", List.of())));
    assertThat(cleared.get("description").isNull()).isTrue();
    assertThat(cleared.get("tags")).isEmpty();
    assertThat(cleared.get("name").asString()).isEqualTo("Renamed club");

    assertThat(status(apiPatch(g, adminT, Map.of("tags", List.of(""))))).isEqualTo(400);
    assertThat(status(apiPatch(g, adminT, Map.of("tags", List.of("x".repeat(41)))))).isEqualTo(400);
    assertThat(status(apiPatch(g, adminT, Map.of("name", "x".repeat(121))))).isEqualTo(400);
  }

  @Test
  void joiningByInviteLinkRecordsMemberJoined() {
    String token = json(apiPost(g + "/invites", adminT, Map.of("role", "MEMBER", "expiresInHours", 1))).get("token").asString();
    apiPost(GROUPS + "/join/" + token, outsiderT, null);

    JsonNode latest = json(apiGet(g + "/activity?limit=1", viewerT)).get(0);
    assertThat(latest.get("type").asString()).isEqualTo("MEMBER_JOINED");
    assertThat(latest.get("actor").get("id").asString()).isEqualTo(outsider.getId().toString());
  }

  @Test
  void concurrentJoinsByOneUserAreIdempotent() throws Exception {
    String token = json(apiPost(g + "/invites", adminT, Map.of("role", "VIEWER", "expiresInHours", 1))).get("token").asString();
    ExecutorService pool = Executors.newFixedThreadPool(4);
    try {
      List<Future<ResponseEntity<String>>> joins = new ArrayList<>();
      for (int i = 0; i < 4; i++) joins.add(pool.submit(() -> apiPost(GROUPS + "/join/" + token, outsiderT, null)));
      for (Future<ResponseEntity<String>> join : joins) {
        assertThat(status(join.get())).as(join.get().getBody()).isEqualTo(200);
        assertThat(json(join.get()).get("myRole").asString()).isEqualTo("VIEWER");
      }
    } finally {
      pool.shutdown();
    }
    assertThat(json(apiGet(g, ownerT)).get("memberCount").asInt()).isEqualTo(5);
  }

  @ParameterizedTest
  @ValueSource(strings = {"0", "51", "abc"})
  void myActivityLimitIsValidated(String limit) {
    assertThat(status(apiGet(GROUPS + "/activity/mine?limit=" + limit, memberT))).isEqualTo(400);
  }

  @Test
  void myActivityMergesSeveralGroupsNewestFirst() {
    sharePaper("In first group");
    String second = json(apiPost(GROUPS, memberT, Map.of("name", "Second"))).get("id").asString();
    String paper = paperKey("second");
    stubPaper(paper, "In second group");
    apiPost(GROUPS + "/" + second + "/papers", memberT, Map.of("paperId", paper));

    JsonNode mine = json(apiGet(GROUPS + "/activity/mine?limit=3", memberT));
    assertThat(mine).hasSize(3);
    assertThat(mine.get(0).get("groupId").asString()).isEqualTo(second);
    assertThat(mine.get(0).get("paperTitle").asString()).isEqualTo("In second group");
    assertThat(mine.get(1).get("groupId").asString()).isEqualTo(groupId);
    List<Long> ids = StreamSupport.stream(mine.spliterator(), false).map(a -> a.get("id").asLong()).toList();
    assertThat(ids).isSortedAccordingTo(Comparator.reverseOrder());
  }

  @Test
  void onlyTheOwnerCanDemoteOrRemoveAnAdmin() {
    User second = createUser("SecondAdmin");
    apiPost(g + "/members", ownerT, Map.of("email", second.getEmail(), "role", "ADMIN"));

    assertThat(status(apiPatch(g + "/members/" + second.getId(), adminT, Map.of("role", "VIEWER")))).isEqualTo(403);
    assertThat(status(apiDelete(g + "/members/" + second.getId(), adminT))).isEqualTo(403);
    // admins still manage members and viewers
    assertThat(status(apiPatch(g + "/members/" + viewer.getId(), adminT, Map.of("role", "MEMBER")))).isEqualTo(200);

    assertThat(json(apiPatch(g + "/members/" + second.getId(), ownerT, Map.of("role", "MEMBER"))).get("role").asString()).isEqualTo("MEMBER");
    assertThat(status(apiPatch(g + "/members/" + admin.getId(), ownerT, Map.of("role", "ADMIN")))).isEqualTo(200);
    assertThat(status(apiDelete(g + "/members/" + admin.getId(), ownerT))).isEqualTo(204);
  }

  @Test
  void invitesAreRevokedWhenTheirCreatorLeavesIsRemovedOrLosesAdmin() {
    User a2 = createUser("A2");
    User a3 = createUser("A3");
    apiPost(g + "/members", ownerT, Map.of("email", a2.getEmail(), "role", "ADMIN"));
    apiPost(g + "/members", ownerT, Map.of("email", a3.getEmail(), "role", "ADMIN"));
    String byAdmin = invite(adminT);
    String byA2 = invite(tokenFor(a2));
    String byA3 = invite(tokenFor(a3));
    String byOwner = invite(ownerT);

    assertThat(status(apiDelete(g + "/members/" + admin.getId(), ownerT))).isEqualTo(204);
    assertThat(status(apiPost(g + "/leave", tokenFor(a2), null))).isEqualTo(204);
    assertThat(status(apiPatch(g + "/members/" + a3.getId(), ownerT, Map.of("role", "MEMBER")))).isEqualTo(200);

    for (String revoked : List.of(byAdmin, byA2, byA3)) {
      assertThat(status(apiPost(GROUPS + "/join/" + revoked, tokenFor(createUser("Late")), null))).isEqualTo(410);
    }
    assertThat(field(json(apiGet(g + "/invites", ownerT)), "token")).containsExactly(byOwner);
    // a removed admin cannot come back through their own link
    assertThat(status(apiPost(GROUPS + "/join/" + byAdmin, adminT, null))).isEqualTo(410);
    assertThat(status(apiPost(GROUPS + "/join/" + byOwner, outsiderT, null))).isEqualTo(200);
  }

  private String invite(String token) {
    ResponseEntity<String> res = apiPost(g + "/invites", token, Map.of("role", "MEMBER", "expiresInHours", 24));
    assertThat(status(res)).isEqualTo(201);
    return json(res).get("token").asString();
  }

  @Test
  void removingAGroupPaperDeletesItsDiscussionAndGroupAnnotations() {
    String paperId = sharePaper("Removed");
    String thread = g + "/papers/" + paperId + "/comments";
    String root = json(apiPost(thread, memberT, Map.of("bodyMd", "old thread"))).get("id").asString();
    apiPost(thread, adminT, Map.of("bodyMd", "old reply", "parentId", root));
    String annotations = "/api/v1/papers/" + paperId + "/annotations";
    Map<String, Object> position = Map.of("pageNumber", 1, "boundingRect", Map.of("y1", 5), "rects", List.of());
    String groupAnnotation = json(apiPost(annotations, memberT, Map.of("visibility", "GROUP", "groupId", groupId,
            "color", "GREEN", "position", position))).get("id").asString();
    apiPost(annotations + "/" + groupAnnotation + "/replies", adminT, Map.of("body", "old annotation reply"));
    String privateOne = json(apiPost(annotations, memberT, Map.of("visibility", "PRIVATE", "color", "GREEN", "position", position)))
            .get("id").asString();

    assertThat(status(apiDelete(g + "/papers/" + paperId, adminT))).isEqualTo(204);
    assertThat(status(apiPost(g + "/papers", memberT, Map.of("paperId", paperId)))).isEqualTo(200);

    assertThat(json(apiGet(thread, memberT))).isEmpty();
    // the member's private annotation is theirs, not the group's, so it stays
    assertThat(field(json(apiGet(annotations, memberT)), "id")).containsExactly(privateOne);
    assertThat(jdbc.queryForObject("SELECT count(*) FROM annotation_replies r JOIN annotations a ON a.id = r.annotation_id "
            + "WHERE a.paper_id = ?", Long.class, paperId)).isZero();
  }
}
