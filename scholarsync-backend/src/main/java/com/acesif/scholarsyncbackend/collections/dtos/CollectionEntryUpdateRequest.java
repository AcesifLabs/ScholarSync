package com.acesif.scholarsyncbackend.collections.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

/** Null leaves a field unchanged; an empty note clears it. */
public record CollectionEntryUpdateRequest(
        @Size(max = 5000) String note,
        @Size(max = 20) List<@NotBlank @Size(max = 40) String> tags
) {}
