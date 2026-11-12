package com.acesif.scholarsyncbackend.notifications.controllers;

import com.acesif.scholarsyncbackend.commons.constants.Limits;
import com.acesif.scholarsyncbackend.commons.constants.ApiPaths;
import com.acesif.scholarsyncbackend.notifications.dtos.NotificationResponse;
import com.acesif.scholarsyncbackend.notifications.dtos.UnreadCount;
import com.acesif.scholarsyncbackend.notifications.services.NotificationService;
import com.acesif.scholarsyncbackend.users.entities.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping(ApiPaths.Notifications.BASE)
@RequiredArgsConstructor
@Tag(name = "Notifications", description = "In-app notifications for the signed-in user")
public class NotificationController {

  private final NotificationService notificationService;

  @Operation(summary = "List notifications", description = "Newest first; page with before=<createdAt of the last item>")
  @GetMapping
  public List<NotificationResponse> list(
          @AuthenticationPrincipal User user,
          @RequestParam(defaultValue = "false") boolean unreadOnly,
          @RequestParam(required = false) Instant before,
          @RequestParam(defaultValue = Limits.DEFAULT_PAGE_SIZE) @Min(1) @Max(Limits.MAX_SMALL_PAGE_SIZE) int limit
  ) {
    return notificationService.list(user, unreadOnly, before, limit);
  }

  @Operation(summary = "Unread count")
  @GetMapping("/unread-count")
  public UnreadCount unreadCount(@AuthenticationPrincipal User user) {
    return new UnreadCount(notificationService.unreadCount(user));
  }

  @Operation(summary = "Mark one as read")
  @PostMapping("/{id}/read")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void markRead(@AuthenticationPrincipal User user, @PathVariable UUID id) {
    notificationService.markRead(user, id);
  }

  @Operation(summary = "Mark all as read")
  @PostMapping("/read-all")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void markAllRead(@AuthenticationPrincipal User user) {
    notificationService.markAllRead(user);
  }
}
