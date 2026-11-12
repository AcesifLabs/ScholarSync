package com.acesif.scholarsyncbackend.annotations.services;

import com.acesif.scholarsyncbackend.users.dtos.UserRef;
import com.acesif.scholarsyncbackend.annotations.dtos.*;
import com.acesif.scholarsyncbackend.annotations.entities.Annotation;
import com.acesif.scholarsyncbackend.annotations.entities.AnnotationReply;
import com.acesif.scholarsyncbackend.annotations.enums.AnnotationVisibility;
import com.acesif.scholarsyncbackend.annotations.repositories.AnnotationReplyRepository;
import com.acesif.scholarsyncbackend.annotations.repositories.AnnotationRepository;
import com.acesif.scholarsyncbackend.groups.enums.GroupRole;
import com.acesif.scholarsyncbackend.groups.services.GroupAccessService;
import com.acesif.scholarsyncbackend.papers.entities.Paper;
import com.acesif.scholarsyncbackend.papers.services.PaperService;
import com.acesif.scholarsyncbackend.users.entities.User;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Visibility: PRIVATE annotations are seen by their author only; GROUP annotations by every member of the group.
 * Writing to a group (annotate, reply, resolve) needs the MEMBER role; viewers read only. Editing is author-only;
 * deleting is the author or a group admin. An annotation the caller cannot see is reported as 404.
 */
@Service
@RequiredArgsConstructor
public class AnnotationService {

  /** Published after a reply is saved so other modules (notifications) can react in the same transaction. */
  public record ReplyCreated(Annotation annotation, AnnotationReply reply) {}

  /** Published after a group annotation is created (group activity feed). */
  public record GroupAnnotationCreated(Annotation annotation) {}

  private final AnnotationRepository annotationRepository;
  private final AnnotationReplyRepository replyRepository;
  private final GroupAccessService groupAccess;
  private final PaperService paperService;
  private final ApplicationEventPublisher events;
  private final TransactionTemplate tx;

  @Transactional(readOnly = true)
  public List<AnnotationResponse> list(User user, String paperId, UUID groupId, UUID authorId, boolean includeResolved) {
    paperId = paperService.canonicalId(paperId);
    Set<UUID> groups;
    if (groupId != null) {
      groupAccess.require(groupId, user, GroupRole.VIEWER);
      groups = Set.of(groupId);
    } else {
      groups = groupAccess.groupIdsOf(user);
    }
    return withReplies(annotationRepository.findVisible(paperId, user.getId(), nonEmpty(groups), groupId, authorId, includeResolved));
  }

  @Transactional(readOnly = true)
  public GroupAnnotationPage listForGroup(User user, UUID groupId, boolean includeResolved, int page, int size) {
    groupAccess.require(groupId, user, GroupRole.VIEWER);
    Page<Annotation> result = annotationRepository.findInGroup(groupId, includeResolved, PageRequest.of(page, size));
    List<AnnotationResponse> annotations = withReplies(result.getContent());
    Map<String, String> titles = paperService.titles(annotations.stream().map(AnnotationResponse::paperId).collect(Collectors.toSet()));
    return new GroupAnnotationPage(annotations.stream().map(a -> new GroupAnnotation(a, titles.get(a.paperId()))).toList(),
            result.getTotalElements(), page, size);
  }

  /** The paper is resolved before the transaction opens, so no connection is held while the sources answer. */
  public AnnotationResponse create(User user, String paperId, AnnotationCreateRequest request) {
    if (request.visibility() == AnnotationVisibility.GROUP) {
      if (request.groupId() == null) throw new IllegalArgumentException("groupId is required for group annotations");
      groupAccess.require(request.groupId(), user, GroupRole.MEMBER);
    } else if (request.groupId() != null) {
      throw new IllegalArgumentException("Private annotations cannot have a groupId");
    }
    validatePosition(request.position());
    Paper paper = paperService.findOrFetch(paperId);
    return tx.execute(status -> create(user, paper, request));
  }

  private AnnotationResponse create(User user, Paper paper, AnnotationCreateRequest request) {
    Instant now = Instant.now();
    Annotation annotation = annotationRepository.save(Annotation.builder()
            .paperId(paper.getId())
            .author(user)
            .visibility(request.visibility())
            .groupId(request.groupId())
            .color(request.color())
            .position(request.position())
            .quote(blankToNull(request.quote()))
            .comment(blankToNull(request.comment()))
            .createdAt(now)
            .updatedAt(now)
            .build());
    if (annotation.getGroupId() != null) events.publishEvent(new GroupAnnotationCreated(annotation));
    return toResponse(annotation, List.of());
  }

  @Transactional
  public AnnotationResponse update(User user, String paperId, UUID id, AnnotationUpdateRequest request) {
    paperId = paperService.canonicalId(paperId);
    Annotation annotation = requireWritable(user, paperId, id);
    if (!isAuthor(user, annotation)) throw forbidden("Only the author can edit an annotation");
    if (request.color() != null) annotation.setColor(request.color());
    if (request.comment() != null) annotation.setComment(blankToNull(request.comment()));
    annotation.setUpdatedAt(Instant.now());
    return single(annotation);
  }

  @Transactional
  public void delete(User user, String paperId, UUID id) {
    paperId = paperService.canonicalId(paperId);
    Annotation annotation = visible(user, paperId, id);
    boolean moderator = annotation.getGroupId() != null && groupAccess.hasRole(annotation.getGroupId(), user, GroupRole.ADMIN);
    if (!isAuthor(user, annotation) && !moderator) throw forbidden("Only the author or a group admin can delete an annotation");
    annotationRepository.delete(annotation);
  }

  @Transactional
  public AnnotationResponse setResolved(User user, String paperId, UUID id, boolean resolved) {
    paperId = paperService.canonicalId(paperId);
    Annotation annotation = requireWritable(user, paperId, id);
    // Resolving twice keeps who resolved it first and when
    if (resolved != (annotation.getResolvedAt() != null)) {
      annotation.setResolvedAt(resolved ? Instant.now() : null);
      annotation.setResolvedBy(resolved ? user.getId() : null);
      annotation.setUpdatedAt(Instant.now());
    }
    return single(annotation);
  }

  @Transactional
  public ReplyResponse reply(User user, String paperId, UUID id, ReplyCreateRequest request) {
    paperId = paperService.canonicalId(paperId);
    Annotation annotation = requireWritable(user, paperId, id);
    AnnotationReply reply = replyRepository.save(AnnotationReply.builder()
            .annotationId(annotation.getId())
            .author(user)
            .body(request.body().strip())
            .createdAt(Instant.now())
            .build());
    events.publishEvent(new ReplyCreated(annotation, reply));
    return toReply(reply);
  }

  @Transactional
  public void deleteReply(User user, String paperId, UUID id, UUID replyId) {
    paperId = paperService.canonicalId(paperId);
    visible(user, paperId, id);
    AnnotationReply reply = replyRepository.findById(replyId)
            .filter(r -> r.getAnnotationId().equals(id))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reply not found"));
    if (!reply.getAuthor().getId().equals(user.getId())) throw forbidden("Only the author can delete a reply");
    replyRepository.delete(reply);
  }

  /**
   * Markdown of the caller-visible annotations, ordered by page, then top-to-bottom. The paper is resolved before the
   * transaction opens, so no connection is held while the sources answer.
   */
  public String exportMarkdown(User user, String paperId, UUID groupId) {
    Paper paper = paperService.findOrFetch(paperId);
    List<AnnotationResponse> annotations = new ArrayList<>(Objects.requireNonNull(
            tx.execute(status -> list(user, paper.getId(), groupId, null, true))));
    annotations.sort(Comparator.comparingInt((AnnotationResponse a) -> page(a.position())).thenComparingDouble(a -> top(a.position())));

    StringBuilder out = new StringBuilder("# Annotations: ").append(paper.getTitle()).append("\n");
    int currentPage = -1;
    for (AnnotationResponse a : annotations) {
      if (page(a.position()) != currentPage) {
        currentPage = page(a.position());
        out.append("\n## Page ").append(currentPage).append("\n\n");
      }
      if (a.quote() != null) a.quote().strip().lines().forEach(line -> out.append("> ").append(line).append("\n"));
      out.append("- ").append(a.comment() == null ? "_(highlight)_" : a.comment().strip())
              .append(" — ").append(Objects.requireNonNullElse(a.author().name(), "Unknown"))
              .append(", ").append(a.color().name().toLowerCase(Locale.ROOT))
              .append(a.resolved() ? ", resolved" : "").append("\n");
      for (ReplyResponse r : a.replies()) {
        out.append("  - ").append(Objects.requireNonNullElse(r.author().name(), "Unknown")).append(": ").append(r.body().strip()).append("\n");
      }
      out.append("\n");
    }
    return out.toString();
  }

  /** The annotation if the caller may see it, else 404 (also for a different paper id). */
  private Annotation visible(User user, String paperId, UUID id) {
    return annotationRepository.findById(id)
            .filter(a -> a.getPaperId().equals(paperId))
            .filter(a -> canSee(user, a))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Annotation not found"));
  }

  /** Visible, and the caller may write to it: the author of a private one, or a group member (not viewer). */
  private Annotation requireWritable(User user, String paperId, UUID id) {
    Annotation annotation = visible(user, paperId, id);
    if (annotation.getGroupId() != null && !groupAccess.hasRole(annotation.getGroupId(), user, GroupRole.MEMBER)) {
      throw forbidden("Viewers cannot edit, reply to or resolve annotations");
    }
    return annotation;
  }

  private boolean canSee(User user, Annotation a) {
    return a.getVisibility() == AnnotationVisibility.PRIVATE
            ? isAuthor(user, a)
            : groupAccess.membership(a.getGroupId(), user).isPresent();
  }

  private static boolean isAuthor(User user, Annotation a) {
    return a.getAuthor().getId().equals(user.getId());
  }

  private static void validatePosition(Map<String, Object> position) {
    if (!(position.get("pageNumber") instanceof Number page) || page.intValue() < 1) {
      throw new IllegalArgumentException("position.pageNumber must be a positive number");
    }
    if (!(position.get("boundingRect") instanceof Map<?, ?> rect) || !(rect.get("y1") instanceof Number)) {
      throw new IllegalArgumentException("position.boundingRect.y1 must be a number");
    }
  }

  private static int page(Map<String, Object> position) {
    return ((Number) position.get("pageNumber")).intValue();
  }

  private static double top(Map<String, Object> position) {
    return ((Number) ((Map<?, ?>) position.get("boundingRect")).get("y1")).doubleValue();
  }

  /** JPQL "in ()" with an empty list is not portable; a random id never matches. */
  private static Collection<UUID> nonEmpty(Set<UUID> ids) {
    return ids.isEmpty() ? List.of(UUID.randomUUID()) : ids;
  }

  private AnnotationResponse single(Annotation annotation) {
    return withReplies(List.of(annotation)).getFirst();
  }

  private List<AnnotationResponse> withReplies(List<Annotation> annotations) {
    if (annotations.isEmpty()) return List.of();
    Map<UUID, List<ReplyResponse>> replies = replyRepository
            .findByAnnotationIdInOrderByCreatedAtAsc(annotations.stream().map(Annotation::getId).toList()).stream()
            .collect(Collectors.groupingBy(AnnotationReply::getAnnotationId, LinkedHashMap::new,
                    Collectors.mapping(AnnotationService::toReply, Collectors.toList())));
    return annotations.stream().map(a -> toResponse(a, replies.getOrDefault(a.getId(), List.of()))).toList();
  }

  private static AnnotationResponse toResponse(Annotation a, List<ReplyResponse> replies) {
    return new AnnotationResponse(a.getId(), a.getPaperId(), UserRef.of(a.getAuthor()), a.getVisibility(), a.getGroupId(),
            a.getColor(), a.getPosition(), a.getQuote(), a.getComment(), a.getResolvedAt() != null, a.getCreatedAt(),
            a.getUpdatedAt(), replies);
  }

  private static ReplyResponse toReply(AnnotationReply r) {
    return new ReplyResponse(r.getId(), UserRef.of(r.getAuthor()), r.getBody(), r.getCreatedAt());
  }

  private static ResponseStatusException forbidden(String message) {
    return new ResponseStatusException(HttpStatus.FORBIDDEN, message);
  }

  private static String blankToNull(String s) {
    return s == null || s.isBlank() ? null : s.strip();
  }
}
