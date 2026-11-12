package com.acesif.scholarsyncbackend.groups.dtos;

import com.acesif.scholarsyncbackend.groups.enums.GroupRole;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record GroupSummary(UUID id, String name, String description, List<String> tags, GroupRole myRole,
                           long memberCount, Instant createdAt) {}
