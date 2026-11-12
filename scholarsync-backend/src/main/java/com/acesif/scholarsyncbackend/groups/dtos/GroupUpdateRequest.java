package com.acesif.scholarsyncbackend.groups.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

public record GroupUpdateRequest(
        @Size(max = 120) @Pattern(regexp = ".*\\S.*", message = "must not be blank") String name,
        @Size(max = 2000) String description,
        @Size(max = 10) List<@NotBlank @Size(max = 40) String> tags
) {}
