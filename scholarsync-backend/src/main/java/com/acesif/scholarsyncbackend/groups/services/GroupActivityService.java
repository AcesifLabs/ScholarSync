package com.acesif.scholarsyncbackend.groups.services;

import com.acesif.scholarsyncbackend.groups.events.GroupEvents;
import com.acesif.scholarsyncbackend.users.dtos.UserRef;
import com.acesif.scholarsyncbackend.annotations.services.AnnotationService;
import com.acesif.scholarsyncbackend.groups.dtos.ActivityResponse;
import com.acesif.scholarsyncbackend.groups.entities.GroupActivity;
import com.acesif.scholarsyncbackend.groups.enums.ActivityType;
import com.acesif.scholarsyncbackend.groups.enums.GroupRole;
import com.acesif.scholarsyncbackend.groups.repositories.GroupActivityRepository;
import com.acesif.scholarsyncbackend.papers.entities.Paper;
import com.acesif.scholarsyncbackend.papers.repositories.PaperRepository;
import com.acesif.scholarsyncbackend.papers.services.PaperService;
import com.acesif.scholarsyncbackend.users.entities.User;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GroupActivityService {

  private final GroupActivityRepository activityRepository;
  private final PaperRepository paperRepository;
  private final PaperService paperService;
  private final GroupAccessService groupAccess;

  @Transactional
  public void record(UUID groupId, User actor, ActivityType type, String paperId, Map<String, Object> payload) {
    activityRepository.save(GroupActivity.builder()
            .groupId(groupId).actor(actor).type(type).paperId(paperId)
            .payload(new HashMap<>(payload)).createdAt(Instant.now()).build());
  }

  @EventListener
  public void onGroupAnnotation(AnnotationService.GroupAnnotationCreated event) {
    var a = event.annotation();
    record(a.getGroupId(), a.getAuthor(), ActivityType.ANNOTATION_ADDED, a.getPaperId(), Map.of("annotationId", a.getId().toString()));
  }

  @EventListener
  public void onMemberAdded(GroupEvents.MemberAdded event) {
    record(event.groupId(), event.member(), ActivityType.MEMBER_JOINED, null, Map.of());
  }

  @EventListener
  public void onPaperAdded(GroupEvents.PaperAdded event) {
    record(event.groupId(), event.addedBy(), ActivityType.PAPER_ADDED, event.paperId(), Map.of());
  }

  @EventListener
  public void onCommentPosted(GroupEvents.CommentPosted event) {
    var c = event.comment();
    record(c.getGroupId(), c.getAuthor(), ActivityType.COMMENT_POSTED, c.getPaperId(), Map.of("commentId", c.getId().toString()));
  }

  @Transactional(readOnly = true)
  public List<ActivityResponse> feed(User user, UUID groupId, UUID actorId, String paperId, Long before, int limit) {
    groupAccess.require(groupId, user, GroupRole.VIEWER);
    String canonical = paperId == null ? null : paperService.canonicalId(paperId);
    return toResponses(activityRepository.feed(List.of(groupId), actorId, canonical, before, Limit.of(limit)));
  }

  /** Recent activity across every group the user belongs to (dashboard). */
  @Transactional(readOnly = true)
  public List<ActivityResponse> mine(User user, int limit) {
    List<Long> ids = activityRepository.recentIdsForMember(user.getId(), limit);
    if (ids.isEmpty()) return List.of();
    return toResponses(activityRepository.findByIdInOrderByIdDesc(ids));
  }

  private List<ActivityResponse> toResponses(List<GroupActivity> rows) {
    Set<String> paperIds = rows.stream().map(GroupActivity::getPaperId).filter(Objects::nonNull).collect(Collectors.toSet());
    Map<String, String> titles = paperRepository.findAllById(paperIds).stream().collect(Collectors.toMap(Paper::getId, Paper::getTitle));
    return rows.stream().map(a -> new ActivityResponse(a.getId(), a.getGroupId(), a.getType(),
            a.getActor() == null ? null : UserRef.of(a.getActor()), a.getPaperId(),
            a.getPaperId() == null ? null : titles.get(a.getPaperId()), a.getPayload(), a.getCreatedAt())).toList();
  }
}
