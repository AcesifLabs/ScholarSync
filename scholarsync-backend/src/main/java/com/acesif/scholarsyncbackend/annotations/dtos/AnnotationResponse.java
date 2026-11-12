package com.acesif.scholarsyncbackend.annotations.dtos;

import com.acesif.scholarsyncbackend.users.dtos.UserRef;
import com.acesif.scholarsyncbackend.annotations.enums.AnnotationVisibility;
import com.acesif.scholarsyncbackend.annotations.enums.HighlightColor;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record AnnotationResponse(
        UUID id,
        String paperId,
        UserRef author,
        AnnotationVisibility visibility,
        UUID groupId,
        HighlightColor color,
        Map<String, Object> position,
        String quote,
        String comment,
        boolean resolved,
        Instant createdAt,
        Instant updatedAt,
        List<ReplyResponse> replies
) {}
