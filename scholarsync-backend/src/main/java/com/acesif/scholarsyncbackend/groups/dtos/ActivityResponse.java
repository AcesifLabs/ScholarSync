package com.acesif.scholarsyncbackend.groups.dtos;

import com.acesif.scholarsyncbackend.groups.enums.ActivityType;
import com.acesif.scholarsyncbackend.users.dtos.UserRef;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record ActivityResponse(long id, UUID groupId, ActivityType type, UserRef actor, String paperId,
                               String paperTitle, Map<String, Object> payload, Instant createdAt) {}
