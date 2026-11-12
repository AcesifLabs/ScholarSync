package com.acesif.scholarsyncbackend.groups.events;

import com.acesif.scholarsyncbackend.groups.entities.GroupComment;
import com.acesif.scholarsyncbackend.users.entities.User;

import java.util.UUID;

/** Published inside the writing transaction; notifications subscribe to them. */
public final class GroupEvents {

  private GroupEvents() {}

  public record MemberAdded(UUID groupId, User member, User addedBy) {}

  public record PaperAdded(UUID groupId, String paperId, User addedBy) {}

  public record CommentPosted(GroupComment comment, GroupComment parent) {}
}
