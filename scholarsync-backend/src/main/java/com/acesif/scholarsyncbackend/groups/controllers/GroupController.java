package com.acesif.scholarsyncbackend.groups.controllers;

import com.acesif.scholarsyncbackend.commons.constants.Limits;
import com.acesif.scholarsyncbackend.commons.constants.ApiPaths;
import com.acesif.scholarsyncbackend.groups.dtos.*;
import com.acesif.scholarsyncbackend.groups.services.GroupActivityService;
import com.acesif.scholarsyncbackend.groups.services.GroupLibraryService;
import com.acesif.scholarsyncbackend.groups.services.GroupService;
import com.acesif.scholarsyncbackend.users.entities.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping(ApiPaths.Groups.BASE)
@RequiredArgsConstructor
@Tag(name = "Reading groups", description = "Groups, members, invites, shared papers, discussion and activity")
public class GroupController {

  private final GroupService groupService;
  private final GroupLibraryService libraryService;
  private final GroupActivityService activityService;

  @Operation(summary = "My groups")
  @GetMapping
  public List<GroupSummary> mine(@AuthenticationPrincipal User user) {
    return groupService.mine(user);
  }

  @Operation(summary = "Create group", description = "The creator becomes the owner")
  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public GroupSummary create(@AuthenticationPrincipal User user, @Valid @RequestBody GroupCreateRequest request) {
    return groupService.create(user, request);
  }

  @Operation(summary = "Recent activity in all my groups")
  @GetMapping("/activity/mine")
  public List<ActivityResponse> myActivity(@AuthenticationPrincipal User user,
                                           @RequestParam(defaultValue = "10") @Min(1) @Max(Limits.MAX_SMALL_PAGE_SIZE) int limit) {
    return activityService.mine(user, limit);
  }

  @Operation(summary = "Join by invite link")
  @PostMapping("/join/{token}")
  public GroupSummary join(@AuthenticationPrincipal User user, @PathVariable String token) {
    return groupService.joinByToken(user, token);
  }

  @Operation(summary = "Get group")
  @GetMapping("/{groupId}")
  public GroupSummary get(@AuthenticationPrincipal User user, @PathVariable UUID groupId) {
    return groupService.get(user, groupId);
  }

  @Operation(summary = "Update group", description = "Admin or owner")
  @PatchMapping("/{groupId}")
  public GroupSummary update(@AuthenticationPrincipal User user, @PathVariable UUID groupId, @Valid @RequestBody GroupUpdateRequest request) {
    return groupService.update(user, groupId, request);
  }

  @Operation(summary = "Delete group", description = "Owner only")
  @DeleteMapping("/{groupId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@AuthenticationPrincipal User user, @PathVariable UUID groupId) {
    groupService.delete(user, groupId);
  }

  @Operation(summary = "List members")
  @GetMapping("/{groupId}/members")
  public List<MemberResponse> members(@AuthenticationPrincipal User user, @PathVariable UUID groupId) {
    return groupService.members(user, groupId);
  }

  @Operation(summary = "Add member by email",
          description = "Admin or owner. Always 202 with no body: if the address has an account that is not yet a member, it is added. "
                  + "The answer does not reveal which, so reload the member list to see the result.")
  @PostMapping("/{groupId}/members")
  @ResponseStatus(HttpStatus.ACCEPTED)
  public void addMember(@AuthenticationPrincipal User user, @PathVariable UUID groupId, @Valid @RequestBody MemberAddRequest request) {
    groupService.addMember(user, groupId, request);
  }

  @Operation(summary = "Change member role", description = "Admin or owner; only the owner can change an admin")
  @PatchMapping("/{groupId}/members/{userId}")
  public MemberResponse changeRole(@AuthenticationPrincipal User user, @PathVariable UUID groupId, @PathVariable UUID userId,
                                   @Valid @RequestBody MemberRoleRequest request) {
    return groupService.changeRole(user, groupId, userId, request.role());
  }

  @Operation(summary = "Remove member", description = "Admin or owner; only the owner can remove an admin. Revokes their invite links")
  @DeleteMapping("/{groupId}/members/{userId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void removeMember(@AuthenticationPrincipal User user, @PathVariable UUID groupId, @PathVariable UUID userId) {
    groupService.removeMember(user, groupId, userId);
  }

  @Operation(summary = "Leave group")
  @PostMapping("/{groupId}/leave")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void leave(@AuthenticationPrincipal User user, @PathVariable UUID groupId) {
    groupService.leave(user, groupId);
  }

  @Operation(summary = "Active invite links", description = "Admin or owner")
  @GetMapping("/{groupId}/invites")
  public List<InviteResponse> invites(@AuthenticationPrincipal User user, @PathVariable UUID groupId) {
    return groupService.invites(user, groupId);
  }

  @Operation(summary = "Create invite link", description = "Admin or owner")
  @PostMapping("/{groupId}/invites")
  @ResponseStatus(HttpStatus.CREATED)
  public InviteResponse createInvite(@AuthenticationPrincipal User user, @PathVariable UUID groupId,
                                     @Valid @RequestBody InviteCreateRequest request) {
    return groupService.createInvite(user, groupId, request);
  }

  @Operation(summary = "Revoke invite link", description = "Admin or owner")
  @DeleteMapping("/{groupId}/invites/{inviteId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void revokeInvite(@AuthenticationPrincipal User user, @PathVariable UUID groupId, @PathVariable UUID inviteId) {
    groupService.revokeInvite(user, groupId, inviteId);
  }

  @Operation(summary = "Group papers")
  @GetMapping("/{groupId}/papers")
  public List<GroupPaperResponse> papers(@AuthenticationPrincipal User user, @PathVariable UUID groupId) {
    return libraryService.papers(user, groupId);
  }

  @Operation(summary = "Add paper to group", description = "Member or above")
  @PostMapping("/{groupId}/papers")
  public GroupPaperResponse addPaper(@AuthenticationPrincipal User user, @PathVariable UUID groupId,
                                     @Valid @RequestBody GroupPaperAddRequest request) {
    return libraryService.addPaper(user, groupId, request.paperId());
  }

  @Operation(summary = "Remove paper from group", description = "Admin or owner")
  @DeleteMapping("/{groupId}/papers/{paperId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void removePaper(@AuthenticationPrincipal User user, @PathVariable UUID groupId, @PathVariable String paperId) {
    libraryService.removePaper(user, groupId, paperId);
  }

  @Operation(summary = "Discussion thread for a paper")
  @GetMapping("/{groupId}/papers/{paperId}/comments")
  public List<CommentResponse> comments(@AuthenticationPrincipal User user, @PathVariable UUID groupId, @PathVariable String paperId) {
    return libraryService.comments(user, groupId, paperId);
  }

  @Operation(summary = "Post comment", description = "Member or above; Markdown body; parentId for a reply")
  @PostMapping("/{groupId}/papers/{paperId}/comments")
  @ResponseStatus(HttpStatus.CREATED)
  public CommentResponse comment(@AuthenticationPrincipal User user, @PathVariable UUID groupId, @PathVariable String paperId,
                                 @Valid @RequestBody CommentCreateRequest request) {
    return libraryService.comment(user, groupId, paperId, request);
  }

  @Operation(summary = "Edit comment", description = "Author only")
  @PatchMapping("/{groupId}/comments/{commentId}")
  public CommentResponse editComment(@AuthenticationPrincipal User user, @PathVariable UUID groupId, @PathVariable UUID commentId,
                                     @Valid @RequestBody CommentUpdateRequest request) {
    return libraryService.editComment(user, groupId, commentId, request);
  }

  @Operation(summary = "Delete comment", description = "Author or admin; soft delete")
  @DeleteMapping("/{groupId}/comments/{commentId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteComment(@AuthenticationPrincipal User user, @PathVariable UUID groupId, @PathVariable UUID commentId) {
    libraryService.deleteComment(user, groupId, commentId);
  }

  @Operation(summary = "Activity feed", description = "Newest first; page with before=<last id>")
  @GetMapping("/{groupId}/activity")
  public List<ActivityResponse> activity(
          @AuthenticationPrincipal User user,
          @PathVariable UUID groupId,
          @RequestParam(required = false) UUID actorId,
          @RequestParam(required = false) String paperId,
          @RequestParam(required = false) @Min(1) Long before,
          @RequestParam(defaultValue = "30") @Min(1) @Max(Limits.MAX_PAGE_SIZE) int limit
  ) {
    return activityService.feed(user, groupId, actorId, paperId, before, limit);
  }
}
