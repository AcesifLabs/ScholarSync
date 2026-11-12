package com.acesif.scholarsyncbackend.annotations.controllers;

import com.acesif.scholarsyncbackend.annotations.dtos.*;
import com.acesif.scholarsyncbackend.annotations.services.AnnotationService;
import com.acesif.scholarsyncbackend.commons.constants.ApiPaths;
import com.acesif.scholarsyncbackend.commons.constants.MediaTypes;
import com.acesif.scholarsyncbackend.users.entities.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping(ApiPaths.Papers.ANNOTATIONS)
@RequiredArgsConstructor
@Tag(name = "Annotations", description = "PDF highlights, comments and reply threads")
public class AnnotationController {

  private final AnnotationService annotationService;

  @Operation(summary = "List annotations", description = "Your private annotations plus those of your groups")
  @GetMapping
  public List<AnnotationResponse> list(
          @AuthenticationPrincipal User user,
          @PathVariable String paperId,
          @RequestParam(required = false) UUID groupId,
          @RequestParam(required = false) UUID authorId,
          @RequestParam(defaultValue = "true") boolean includeResolved
  ) {
    return annotationService.list(user, paperId, groupId, authorId, includeResolved);
  }

  @Operation(summary = "Create annotation")
  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public AnnotationResponse create(@AuthenticationPrincipal User user, @PathVariable String paperId,
                                   @Valid @RequestBody AnnotationCreateRequest request) {
    return annotationService.create(user, paperId, request);
  }

  @Operation(summary = "Edit annotation", description = "Author only (group annotations also need the member role): colour and comment")
  @PatchMapping("/{id}")
  public AnnotationResponse update(@AuthenticationPrincipal User user, @PathVariable String paperId, @PathVariable UUID id,
                                   @Valid @RequestBody AnnotationUpdateRequest request) {
    return annotationService.update(user, paperId, id, request);
  }

  @Operation(summary = "Delete annotation", description = "Author, or a group admin for group annotations")
  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@AuthenticationPrincipal User user, @PathVariable String paperId, @PathVariable UUID id) {
    annotationService.delete(user, paperId, id);
  }

  @Operation(summary = "Resolve thread")
  @PostMapping("/{id}/resolve")
  public AnnotationResponse resolve(@AuthenticationPrincipal User user, @PathVariable String paperId, @PathVariable UUID id) {
    return annotationService.setResolved(user, paperId, id, true);
  }

  @Operation(summary = "Reopen thread")
  @PostMapping("/{id}/unresolve")
  public AnnotationResponse unresolve(@AuthenticationPrincipal User user, @PathVariable String paperId, @PathVariable UUID id) {
    return annotationService.setResolved(user, paperId, id, false);
  }

  @Operation(summary = "Reply to annotation")
  @PostMapping("/{id}/replies")
  @ResponseStatus(HttpStatus.CREATED)
  public ReplyResponse reply(@AuthenticationPrincipal User user, @PathVariable String paperId, @PathVariable UUID id,
                             @Valid @RequestBody ReplyCreateRequest request) {
    return annotationService.reply(user, paperId, id, request);
  }

  @Operation(summary = "Delete reply", description = "Reply author only")
  @DeleteMapping("/{id}/replies/{replyId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteReply(@AuthenticationPrincipal User user, @PathVariable String paperId, @PathVariable UUID id,
                          @PathVariable UUID replyId) {
    annotationService.deleteReply(user, paperId, id, replyId);
  }

  @Operation(summary = "Export annotations", description = "Markdown, ordered by page")
  @GetMapping(value = "/export", produces = MediaTypes.TEXT_MARKDOWN)
  public ResponseEntity<String> export(@AuthenticationPrincipal User user, @PathVariable String paperId,
                                       @RequestParam(required = false) UUID groupId) {
    return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_TYPE, MediaTypes.TEXT_MARKDOWN_UTF8)
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"annotations.md\"")
            .body(annotationService.exportMarkdown(user, paperId, groupId));
  }
}
