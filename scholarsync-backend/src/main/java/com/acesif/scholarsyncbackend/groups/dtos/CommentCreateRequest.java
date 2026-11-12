package com.acesif.scholarsyncbackend.groups.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record CommentCreateRequest(@NotBlank @Size(max = 20000) String bodyMd, UUID parentId) {}
