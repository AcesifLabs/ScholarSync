package com.acesif.scholarsyncbackend.notifications.enums;

public enum NotificationType {
  /** An admin added you to a group. */
  GROUP_ADDED,
  /** Someone replied to your annotation; targetId is the annotation. */
  ANNOTATION_REPLY,
  /** Someone replied to your group comment; targetId is the reply. */
  COMMENT_REPLY,
  GROUP_PAPER_ADDED
}
