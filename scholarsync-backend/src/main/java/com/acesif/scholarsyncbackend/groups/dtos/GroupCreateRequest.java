package com.acesif.scholarsyncbackend.groups.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record GroupCreateRequest(
        @NotBlank @Size(max = 120) String name,
        @Size(max = 2000) String description,
        @Size(max = 10) List<@NotBlank @Size(max = 40) String> tags
) {}
