package com.acesif.scholarsyncbackend.collections.dtos;

import com.acesif.scholarsyncbackend.commons.constants.Limits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CollectionAddPaperRequest(@NotBlank @Size(max = Limits.MAX_PAPER_ID_LENGTH) String paperId) {}
