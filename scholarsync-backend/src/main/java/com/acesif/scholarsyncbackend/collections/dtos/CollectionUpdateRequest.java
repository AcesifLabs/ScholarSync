package com.acesif.scholarsyncbackend.collections.dtos;

import com.acesif.scholarsyncbackend.collections.enums.CollectionVisibility;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Every field optional; null leaves it unchanged. PRIVATE revokes any share link. */
public record CollectionUpdateRequest(
        @Size(max = 120) @Pattern(regexp = ".*\\S.*", message = "must not be blank") String name,
        @Size(max = 2000) String description,
        CollectionVisibility visibility,
        Boolean archived
) {}
