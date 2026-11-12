package com.acesif.scholarsyncbackend.groups.dtos;

import com.acesif.scholarsyncbackend.users.dtos.UserRef;

import java.time.Instant;
import java.util.UUID;

/** {@code bodyMd} is null once the comment is deleted; the row stays so replies keep their place in the thread. */
public record CommentResponse(UUID id, UUID parentId, UserRef author, String bodyMd, boolean deleted,
                              Instant createdAt, Instant editedAt) {}
