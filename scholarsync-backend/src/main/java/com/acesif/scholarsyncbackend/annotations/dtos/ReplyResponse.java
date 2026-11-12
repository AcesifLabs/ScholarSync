package com.acesif.scholarsyncbackend.annotations.dtos;

import com.acesif.scholarsyncbackend.users.dtos.UserRef;

import java.time.Instant;
import java.util.UUID;

public record ReplyResponse(UUID id, UserRef author, String body, Instant createdAt) {}
