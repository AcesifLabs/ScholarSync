package com.acesif.scholarsyncbackend.notifications;

import com.acesif.scholarsyncbackend.support.E2ETestBase;
import com.acesif.scholarsyncbackend.users.entities.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.StreamSupport;

import static org.assertj.core.api.Assertions.assertThat;

class NotificationApiE2ETest extends E2ETestBase {

  private static final String N = "/api/v1/notifications";

  private User owner, member;
  private String ownerT, memberT;
  private String g;
  private String groupId;

  @BeforeEach
  void setUp() {
    owner = createUser("Owner");
    member = createUser("Member");
    ownerT = tokenFor(owner);
    memberT = tokenFor(member);
    groupId = json(apiPost("/api/v1/groups", ownerT, Map.of("name", "Club"))).get("id").asString();
    g = "/api/v1/groups/" + groupId;
    apiPost(g + "/members", ownerT, Map.of("email", member.getEmail(), "role", "MEMBER"));
  }

  private JsonNode list(String token) {
    return json(apiGet(N, token));
  }

  private long unread(String token) {
    return json(apiGet(N + "/unread-count", token)).get("count").asLong();
  }

  private static List<String> types(JsonNode list) {
    return StreamSupport.stream(list.spliterator(), false).map(n -> n.get("type").asString()).toList();
  }

  private String sharePaper(String token) {
    String paperId = paperKey("np");
    stubPaper(paperId, "Notified paper");
    apiPost(g + "/papers", token, Map.of("paperId", paperId));
    return paperId;
  }

  @Test
  void requiresLogin() {
    assertThat(status(apiGet(N, null))).isEqualTo(401);
    assertThat(status(apiGet(N + "/unread-count", null))).isEqualTo(401);
    assertThat(status(apiPost(N + "/read-all", null, null))).isEqualTo(401);
  }

  @Test
  void beingAddedToAGroupNotifiesTheNewMemberOnly() {
    JsonNode notes = list(memberT);
    assertThat(types(notes)).containsExactly("GROUP_ADDED");
    assertThat(notes.get(0).get("actor").get("name").asString()).isEqualTo("Owner");
    assertThat(notes.get(0).get("groupName").asString()).isEqualTo("Club");
    assertThat(notes.get(0).get("read").asBoolean()).isFalse();
    assertThat(list(ownerT)).isEmpty();
  }

  @Test
  void joiningByInviteLinkDoesNotNotify() {
    String token = json(apiPost(g + "/invites", ownerT, Map.of("role", "MEMBER", "expiresInHours", 1))).get("token").asString();
    String joinerT = tokenFor(createUser("Joiner"));
    apiPost("/api/v1/groups/join/" + token, joinerT, null);
    assertThat(list(joinerT)).isEmpty();
  }

  @Test
  void sharingAPaperNotifiesEveryoneButTheActor() {
    String viewerT = tokenFor(createUser("Viewer"));
    String token = json(apiPost(g + "/invites", ownerT, Map.of("role", "VIEWER", "expiresInHours", 1))).get("token").asString();
    apiPost("/api/v1/groups/join/" + token, viewerT, null);

    String paperId = sharePaper(memberT);

    assertThat(types(list(ownerT))).containsExactly("GROUP_PAPER_ADDED");
    assertThat(list(ownerT).get(0).get("paperTitle").asString()).isEqualTo("Notified paper");
    assertThat(list(ownerT).get(0).get("paperId").asString()).isEqualTo(paperId);
    assertThat(types(list(viewerT))).containsExactly("GROUP_PAPER_ADDED");
    assertThat(types(list(memberT))).containsExactly("GROUP_ADDED");

    // sharing the same paper again is idempotent and sends nothing new
    apiPost(g + "/papers", ownerT, Map.of("paperId", paperId));
    assertThat(list(ownerT)).hasSize(1);
  }

  @Test
  void replyToCommentNotifiesTheParentAuthorButNotSelfReplies() {
    String paperId = sharePaper(ownerT);
    String thread = g + "/papers/" + paperId + "/comments";
    String root = json(apiPost(thread, ownerT, Map.of("bodyMd", "root"))).get("id").asString();

    apiPost(thread, ownerT, Map.of("bodyMd", "self follow-up", "parentId", root));
    assertThat(types(list(ownerT))).isEmpty();

    String reply = json(apiPost(thread, memberT, Map.of("bodyMd", "reply", "parentId", root))).get("id").asString();
    JsonNode notes = list(ownerT);
    assertThat(types(notes)).containsExactly("COMMENT_REPLY");
    assertThat(notes.get(0).get("targetId").asString()).isEqualTo(reply);
    // a top-level comment notifies nobody
    apiPost(thread, memberT, Map.of("bodyMd", "new thread"));
    assertThat(list(ownerT)).hasSize(1);
  }

  @Test
  void replyToAnnotationNotifiesItsAuthor() {
    String paperId = paperKey("ap");
    stubPaper(paperId, "Annotated");
    Map<String, Object> body = Map.of("visibility", "GROUP", "groupId", groupId, "color", "BLUE",
            "position", Map.of("pageNumber", 2, "boundingRect", Map.of("y1", 9), "rects", List.of()));
    String annotationId = json(apiPost("/api/v1/papers/" + paperId + "/annotations", memberT, body)).get("id").asString();

    apiPost("/api/v1/papers/" + paperId + "/annotations/" + annotationId + "/replies", ownerT, Map.of("body", "good point"));
    apiPost("/api/v1/papers/" + paperId + "/annotations/" + annotationId + "/replies", memberT, Map.of("body", "thanks"));

    JsonNode notes = list(memberT);
    assertThat(types(notes)).containsExactly("ANNOTATION_REPLY", "GROUP_ADDED");
    assertThat(notes.get(0).get("targetId").asString()).isEqualTo(annotationId);
    assertThat(notes.get(0).get("paperId").asString()).isEqualTo(paperId);
    assertThat(list(ownerT)).isEmpty();
  }

  @Test
  void readStateAndCounts() {
    sharePaper(ownerT);
    assertThat(unread(memberT)).isEqualTo(2);

    String first = list(memberT).get(0).get("id").asString();
    assertThat(status(apiPost(N + "/" + first + "/read", memberT, null))).isEqualTo(204);
    assertThat(status(apiPost(N + "/" + first + "/read", memberT, null))).isEqualTo(204);
    assertThat(unread(memberT)).isEqualTo(1);
    assertThat(json(apiGet(N + "?unreadOnly=true", memberT))).hasSize(1);

    assertThat(status(apiPost(N + "/read-all", memberT, null))).isEqualTo(204);
    assertThat(unread(memberT)).isZero();
    assertThat(list(memberT)).hasSize(2);
  }

  @Test
  void otherUsersCannotTouchMyNotifications() {
    String mine = list(memberT).get(0).get("id").asString();
    sharePaper(memberT);

    assertThat(status(apiPost(N + "/" + mine + "/read", ownerT, null))).isEqualTo(404);
    apiPost(N + "/read-all", ownerT, null);
    assertThat(unread(memberT)).isEqualTo(1);
    assertThat(unread(ownerT)).isZero();
    assertThat(status(apiPost(N + "/" + UUID.randomUUID() + "/read", memberT, null))).isEqualTo(404);
    assertThat(status(apiPost(N + "/not-a-uuid/read", memberT, null))).isEqualTo(400);
  }

  @Test
  void paginationWithBeforeCursor() {
    for (int i = 0; i < 3; i++) sharePaper(ownerT);

    JsonNode page1 = json(apiGet(N + "?limit=2", memberT));
    assertThat(page1).hasSize(2);
    String cursor = page1.get(1).get("createdAt").asString();
    JsonNode page2 = json(apiGet(N + "?limit=2&before=" + cursor, memberT));
    assertThat(page2).hasSize(2);
    assertThat(page2.get(0).get("id").asString()).isNotIn(page1.get(0).get("id").asString(), page1.get(1).get("id").asString());

    assertThat(status(apiGet(N + "?limit=0", memberT))).isEqualTo(400);
    assertThat(status(apiGet(N + "?limit=51", memberT))).isEqualTo(400);
    assertThat(status(apiGet(N + "?before=yesterday", memberT))).isEqualTo(400);
  }

  @Test
  void aRemovedMemberGetsNoReplyNotifications() {
    String paperId = sharePaper(ownerT);
    String thread = g + "/papers/" + paperId + "/comments";
    String comment = json(apiPost(thread, memberT, Map.of("bodyMd", "member's comment"))).get("id").asString();
    Map<String, Object> body = Map.of("visibility", "GROUP", "groupId", groupId, "color", "BLUE",
            "position", Map.of("pageNumber", 1, "boundingRect", Map.of("y1", 9), "rects", List.of()));
    String annotation = json(apiPost("/api/v1/papers/" + paperId + "/annotations", memberT, body)).get("id").asString();
    List<String> before = types(list(memberT));

    apiDelete(g + "/members/" + member.getId(), ownerT);
    apiPost(thread, ownerT, Map.of("bodyMd", "reply after removal", "parentId", comment));
    apiPost("/api/v1/papers/" + paperId + "/annotations/" + annotation + "/replies", ownerT, Map.of("body", "too late"));

    assertThat(types(list(memberT))).isEqualTo(before).doesNotContain("COMMENT_REPLY", "ANNOTATION_REPLY");
  }
}
