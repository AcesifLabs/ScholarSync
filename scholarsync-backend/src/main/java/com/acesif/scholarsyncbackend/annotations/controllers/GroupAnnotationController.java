package com.acesif.scholarsyncbackend.annotations.controllers;

import com.acesif.scholarsyncbackend.annotations.dtos.GroupAnnotationPage;
import com.acesif.scholarsyncbackend.annotations.services.AnnotationService;
import com.acesif.scholarsyncbackend.commons.constants.ApiPaths;
import com.acesif.scholarsyncbackend.commons.constants.Limits;
import com.acesif.scholarsyncbackend.users.entities.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping(ApiPaths.Groups.BASE)
@RequiredArgsConstructor
@Tag(name = "Annotations", description = "PDF highlights, comments and reply threads")
public class GroupAnnotationController {

  private final AnnotationService annotationService;

  @Operation(summary = "Group annotations", description = "Every annotation shared with the group, newest first; any member, viewers included")
  @GetMapping("/{groupId}/annotations")
  public GroupAnnotationPage list(
          @AuthenticationPrincipal User user,
          @PathVariable UUID groupId,
          @RequestParam(defaultValue = "true") boolean includeResolved,
          @RequestParam(defaultValue = "0") @Min(0) int page,
          @RequestParam(defaultValue = Limits.DEFAULT_PAGE_SIZE) @Min(1) @Max(Limits.MAX_PAGE_SIZE) int size
  ) {
    return annotationService.listForGroup(user, groupId, includeResolved, page, size);
  }
}
