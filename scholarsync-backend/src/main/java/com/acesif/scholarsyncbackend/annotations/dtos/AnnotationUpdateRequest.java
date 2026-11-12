package com.acesif.scholarsyncbackend.annotations.dtos;

import com.acesif.scholarsyncbackend.annotations.enums.HighlightColor;
import jakarta.validation.constraints.Size;

/** Null leaves a field unchanged; an empty comment clears it. */
public record AnnotationUpdateRequest(HighlightColor color, @Size(max = 10000) String comment) {}
