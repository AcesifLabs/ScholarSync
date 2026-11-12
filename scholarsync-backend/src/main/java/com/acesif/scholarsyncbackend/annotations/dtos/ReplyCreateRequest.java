package com.acesif.scholarsyncbackend.annotations.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReplyCreateRequest(@NotBlank @Size(max = 10000) String body) {}
