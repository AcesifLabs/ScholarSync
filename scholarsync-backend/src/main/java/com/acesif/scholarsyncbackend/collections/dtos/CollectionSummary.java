package com.acesif.scholarsyncbackend.collections.dtos;

import com.acesif.scholarsyncbackend.collections.enums.CollectionVisibility;

import java.time.Instant;
import java.util.UUID;

public record CollectionSummary(
        UUID id,
        String name,
        String description,
        CollectionVisibility visibility,
        String shareToken,
        boolean archived,
        long paperCount,
        Instant createdAt,
        Instant updatedAt
) {}
