package com.acesif.scholarsyncbackend.groups.dtos;

import com.acesif.scholarsyncbackend.commons.constants.Limits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GroupPaperAddRequest(@NotBlank @Size(max = Limits.MAX_PAPER_ID_LENGTH) String paperId) {}
