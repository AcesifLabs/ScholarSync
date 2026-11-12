package com.acesif.scholarsyncbackend.groups.services;

import com.acesif.scholarsyncbackend.groups.events.GroupEvents;
import com.acesif.scholarsyncbackend.users.dtos.UserRef;
import com.acesif.scholarsyncbackend.annotations.repositories.AnnotationRepository;
import com.acesif.scholarsyncbackend.groups.dtos.*;
import com.acesif.scholarsyncbackend.groups.entities.GroupComment;
import com.acesif.scholarsyncbackend.groups.entities.GroupMember;
import com.acesif.scholarsyncbackend.groups.entities.GroupPaper;
import com.acesif.scholarsyncbackend.groups.entities.GroupPaperId;
import com.acesif.scholarsyncbackend.groups.enums.GroupRole;
import com.acesif.scholarsyncbackend.groups.repositories.GroupCommentRepository;
import com.acesif.scholarsyncbackend.groups.repositories.GroupPaperRepository;
import com.acesif.scholarsyncbackend.papers.entities.Paper;
import com.acesif.scholarsyncbackend.papers.services.PaperService;
import com.acesif.scholarsyncbackend.users.entities.User;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** The group's shared paper list and the per-paper discussion threads. */
@Service
@RequiredArgsConstructor
public class GroupLibraryService {

  private final GroupPaperRepository groupPaperRepository;
  private final GroupCommentRepository commentRepository;
  private final AnnotationRepository annotationRepository;
  private final GroupAccessService groupAccess;
  private final PaperService paperService;
  private final ApplicationEventPublisher events;
  private final TransactionTemplate tx;

  @Transactional(readOnly = true)
  public List<GroupPaperResponse> papers(User user, UUID groupId) {
    groupAccess.require(groupId, user, GroupRole.VIEWER);
    return groupPaperRepository.findByIdGroupIdOrderByAddedAtDesc(groupId).stream().map(GroupLibraryService::toPaper).toList();
  }

  /**
   * Idempotent: adding a paper that is already shared returns the existing entry and records no activity. The paper is
   * resolved before the transaction opens, so no connection is held while the sources answer.
   */
  public GroupPaperResponse addPaper(User user, UUID groupId, String paperId) {
    groupAccess.require(groupId, user, GroupRole.MEMBER);
    Paper paper = paperService.findOrFetch(paperId);
    try {
      return tx.execute(status -> addPaper(user, groupId, paper));
    } catch (DataIntegrityViolationException e) {
      return tx.execute(status -> addPaper(user, groupId, paper));
    }
  }

  private GroupPaperResponse addPaper(User user, UUID groupId, Paper paper) {
    GroupPaper existing = groupPaperRepository.findById(new GroupPaperId(groupId, paper.getId())).orElse(null);
    if (existing != null) return toPaper(existing);
    GroupPaper added = groupPaperRepository.saveAndFlush(GroupPaper.builder()
            .id(new GroupPaperId(groupId, paper.getId()))
            .paper(paper)
            .addedBy(user)
            .addedAt(Instant.now())
            .build());
    events.publishEvent(new GroupEvents.PaperAdded(groupId, paper.getId(), user));
    return toPaper(added);
  }

  /** Also deletes the paper's discussion and group annotations in this group, so adding it again starts clean. */
  @Transactional
  public void removePaper(User user, UUID groupId, String paperId) {
    groupAccess.require(groupId, user, GroupRole.ADMIN);
    String canonical = paperService.canonicalId(paperId);
    groupPaperRepository.deleteById(new GroupPaperId(groupId, canonical));
    commentRepository.deleteThread(groupId, canonical);
    annotationRepository.deleteInGroup(groupId, canonical);
  }

  @Transactional(readOnly = true)
  public List<CommentResponse> comments(User user, UUID groupId, String requestedId) {
    groupAccess.require(groupId, user, GroupRole.VIEWER);
    String paperId = paperService.canonicalId(requestedId);
    requireShared(groupId, paperId);
    return commentRepository.findByGroupIdAndPaperIdOrderByCreatedAtAsc(groupId, paperId).stream().map(GroupLibraryService::toComment).toList();
  }

  @Transactional
  public CommentResponse comment(User user, UUID groupId, String requestedId, CommentCreateRequest request) {
    groupAccess.require(groupId, user, GroupRole.MEMBER);
    String paperId = paperService.canonicalId(requestedId);
    requireShared(groupId, paperId);
    GroupComment parent = null;
    if (request.parentId() != null) {
      parent = commentRepository.findById(request.parentId())
              .filter(p -> p.getGroupId().equals(groupId) && p.getPaperId().equals(paperId))
              .orElseThrow(() -> new IllegalArgumentException("parentId must be a comment in the same thread"));
    }
    GroupComment comment = commentRepository.save(GroupComment.builder()
            .groupId(groupId).paperId(paperId).author(user).parentId(request.parentId())
            .bodyMd(request.bodyMd().strip()).createdAt(Instant.now()).build());
    events.publishEvent(new GroupEvents.CommentPosted(comment, parent));
    return toComment(comment);
  }

  @Transactional
  public CommentResponse editComment(User user, UUID groupId, UUID commentId, CommentUpdateRequest request) {
    groupAccess.require(groupId, user, GroupRole.MEMBER);
    GroupComment comment = comment(groupId, commentId);
    if (!comment.getAuthor().getId().equals(user.getId())) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the author can edit a comment");
    if (comment.getDeletedAt() != null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found");
    comment.setBodyMd(request.bodyMd().strip());
    comment.setEditedAt(Instant.now());
    return toComment(comment);
  }

  /** Soft delete by the author or an admin: replies stay attached to a "[deleted]" placeholder. */
  @Transactional
  public void deleteComment(User user, UUID groupId, UUID commentId) {
    GroupMember me = groupAccess.require(groupId, user, GroupRole.VIEWER);
    GroupComment comment = comment(groupId, commentId);
    boolean own = comment.getAuthor().getId().equals(user.getId());
    if (!own && !me.getRole().atLeast(GroupRole.ADMIN)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the author or an admin can delete a comment");
    }
    if (comment.getDeletedAt() == null) comment.setDeletedAt(Instant.now());
  }

  private void requireShared(UUID groupId, String paperId) {
    if (!groupPaperRepository.existsById(new GroupPaperId(groupId, paperId))) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "That paper is not in this group's library");
    }
  }

  private GroupComment comment(UUID groupId, UUID commentId) {
    return commentRepository.findById(commentId).filter(c -> c.getGroupId().equals(groupId))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found"));
  }

  private static GroupPaperResponse toPaper(GroupPaper gp) {
    return new GroupPaperResponse(PaperService.toSummary(gp.getPaper()), gp.getAddedBy() == null ? null : UserRef.of(gp.getAddedBy()), gp.getAddedAt());
  }

  private static CommentResponse toComment(GroupComment c) {
    boolean deleted = c.getDeletedAt() != null;
    return new CommentResponse(c.getId(), c.getParentId(), UserRef.of(c.getAuthor()), deleted ? null : c.getBodyMd(), deleted,
            c.getCreatedAt(), c.getEditedAt());
  }
}
