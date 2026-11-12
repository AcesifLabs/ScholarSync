package com.acesif.scholarsyncbackend.notifications.services;

import com.acesif.scholarsyncbackend.users.dtos.UserRef;
import com.acesif.scholarsyncbackend.annotations.services.AnnotationService;
import com.acesif.scholarsyncbackend.groups.entities.GroupMemberId;
import com.acesif.scholarsyncbackend.groups.entities.ReadingGroup;
import com.acesif.scholarsyncbackend.groups.repositories.GroupMemberRepository;
import com.acesif.scholarsyncbackend.groups.repositories.ReadingGroupRepository;
import com.acesif.scholarsyncbackend.groups.events.GroupEvents;
import com.acesif.scholarsyncbackend.notifications.dtos.NotificationResponse;
import com.acesif.scholarsyncbackend.notifications.entities.Notification;
import com.acesif.scholarsyncbackend.notifications.enums.NotificationType;
import com.acesif.scholarsyncbackend.notifications.repositories.NotificationRepository;
import com.acesif.scholarsyncbackend.papers.entities.Paper;
import com.acesif.scholarsyncbackend.papers.repositories.PaperRepository;
import com.acesif.scholarsyncbackend.users.entities.User;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Limit;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/**
 * In-app notifications (ADR 0004: the client polls). Created by synchronous listeners, so they commit or roll back
 * with the action that caused them. Nobody is notified about their own actions.
 */
@Service
@RequiredArgsConstructor
public class NotificationService {

  /** Postgres cannot type a null timestamp parameter, so "no cursor" is a cursor far in the future. */
  private static final Instant NO_CURSOR = Instant.parse("9999-12-31T00:00:00Z");

  private final NotificationRepository notificationRepository;
  private final GroupMemberRepository memberRepository;
  private final ReadingGroupRepository groupRepository;
  private final PaperRepository paperRepository;

  /** Only when an admin added the user; joining through an invite link is the user's own action. */
  @EventListener
  public void onMemberAdded(GroupEvents.MemberAdded event) {
    if (event.addedBy() == null) return;
    notify(event.member().getId(), NotificationType.GROUP_ADDED, event.addedBy(), event.groupId(), null, null);
  }

  @EventListener
  public void onPaperAdded(GroupEvents.PaperAdded event) {
    notificationRepository.notifyGroupMembers(event.groupId(), NotificationType.GROUP_PAPER_ADDED.name(),
            event.addedBy().getId(), event.paperId(), Instant.now());
  }

  /** Reply notifications go to current members only: a removed member must not keep hearing about the group. */
  @EventListener
  public void onAnnotationReply(AnnotationService.ReplyCreated event) {
    var annotation = event.annotation();
    UUID recipient = annotation.getAuthor().getId();
    if (annotation.getGroupId() != null && !isMember(annotation.getGroupId(), recipient)) return;
    notify(recipient, NotificationType.ANNOTATION_REPLY, event.reply().getAuthor(),
            annotation.getGroupId(), annotation.getPaperId(), annotation.getId());
  }

  @EventListener
  public void onCommentReply(GroupEvents.CommentPosted event) {
    if (event.parent() == null) return;
    var comment = event.comment();
    UUID recipient = event.parent().getAuthor().getId();
    if (!isMember(comment.getGroupId(), recipient)) return;
    notify(recipient, NotificationType.COMMENT_REPLY, comment.getAuthor(),
            comment.getGroupId(), comment.getPaperId(), comment.getId());
  }

  private boolean isMember(UUID groupId, UUID userId) {
    return memberRepository.existsById(new GroupMemberId(groupId, userId));
  }

  @Transactional(readOnly = true)
  public List<NotificationResponse> list(User user, boolean unreadOnly, Instant before, int limit) {
    Instant cursor = before == null ? NO_CURSOR : before;
    List<Notification> rows = notificationRepository.page(user.getId(), unreadOnly, cursor, Limit.of(limit));
    Set<UUID> groupIds = rows.stream().map(Notification::getGroupId).filter(Objects::nonNull).collect(Collectors.toSet());
    Set<String> paperIds = rows.stream().map(Notification::getPaperId).filter(Objects::nonNull).collect(Collectors.toSet());
    Map<UUID, String> groupNames = groupRepository.findAllById(groupIds).stream().collect(Collectors.toMap(ReadingGroup::getId, ReadingGroup::getName));
    Map<String, String> titles = paperRepository.findAllById(paperIds).stream().collect(Collectors.toMap(Paper::getId, Paper::getTitle));
    return rows.stream().map(n -> new NotificationResponse(n.getId(), n.getType(), n.getActor() == null ? null : UserRef.of(n.getActor()),
            n.getGroupId(), groupNames.get(n.getGroupId()), n.getPaperId(), titles.get(n.getPaperId()), n.getTargetId(),
            n.getReadAt() != null, n.getCreatedAt())).toList();
  }

  @Transactional(readOnly = true)
  public long unreadCount(User user) {
    return notificationRepository.countByRecipientIdAndReadAtIsNull(user.getId());
  }

  @Transactional
  public void markRead(User user, UUID id) {
    Notification notification = notificationRepository.findByIdAndRecipientId(id, user.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));
    if (notification.getReadAt() == null) notification.setReadAt(Instant.now());
  }

  @Transactional
  public void markAllRead(User user) {
    notificationRepository.markAllRead(user.getId(), Instant.now());
  }

  private void notify(UUID recipientId, NotificationType type, User actor, UUID groupId, String paperId, UUID targetId) {
    if (actor != null && actor.getId().equals(recipientId)) return;
    notificationRepository.save(Notification.builder()
            .recipientId(recipientId).type(type).actor(actor).groupId(groupId).paperId(paperId).targetId(targetId)
            .createdAt(Instant.now()).build());
  }
}
