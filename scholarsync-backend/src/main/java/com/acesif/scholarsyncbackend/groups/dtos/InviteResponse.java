package com.acesif.scholarsyncbackend.groups.dtos;

import com.acesif.scholarsyncbackend.groups.enums.GroupRole;

import java.time.Instant;
import java.util.UUID;

public record InviteResponse(UUID id, String token, GroupRole role, Instant expiresAt, Instant createdAt) {}
