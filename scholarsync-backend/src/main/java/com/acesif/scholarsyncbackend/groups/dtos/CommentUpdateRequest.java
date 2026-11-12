package com.acesif.scholarsyncbackend.groups.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CommentUpdateRequest(@NotBlank @Size(max = 20000) String bodyMd) {}
