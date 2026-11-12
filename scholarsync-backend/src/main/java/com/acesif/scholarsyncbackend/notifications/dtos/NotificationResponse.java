package com.acesif.scholarsyncbackend.notifications.dtos;

import com.acesif.scholarsyncbackend.users.dtos.UserRef;
import com.acesif.scholarsyncbackend.notifications.enums.NotificationType;

import java.time.Instant;
import java.util.UUID;

public record NotificationResponse(
        UUID id,
        NotificationType type,
        UserRef actor,
        UUID groupId,
        String groupName,
        String paperId,
        String paperTitle,
        UUID targetId,
        boolean read,
        Instant createdAt
) {}
