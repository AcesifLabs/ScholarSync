package com.acesif.scholarsyncbackend.collections.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CollectionCreateRequest(
        @NotBlank @Size(max = 120) String name,
        @Size(max = 2000) String description
) {}
