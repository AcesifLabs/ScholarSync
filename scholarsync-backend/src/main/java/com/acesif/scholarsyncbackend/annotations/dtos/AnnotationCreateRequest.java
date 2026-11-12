package com.acesif.scholarsyncbackend.annotations.dtos;

import com.acesif.scholarsyncbackend.annotations.enums.AnnotationVisibility;
import com.acesif.scholarsyncbackend.annotations.enums.HighlightColor;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.Map;
import java.util.UUID;

/** {@code groupId} is required for GROUP and must be absent for PRIVATE. */
public record AnnotationCreateRequest(
        @NotNull AnnotationVisibility visibility,
        UUID groupId,
        @NotNull HighlightColor color,
        @NotNull Map<String, Object> position,
        @Size(max = 5000) String quote,
        @Size(max = 10000) String comment
) {}
