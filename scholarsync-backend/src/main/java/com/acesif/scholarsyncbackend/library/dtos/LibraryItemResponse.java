package com.acesif.scholarsyncbackend.library.dtos;

import com.acesif.scholarsyncbackend.library.enums.ReadingStatus;
import com.acesif.scholarsyncbackend.papers.dtos.PaperSummary;

import java.time.Instant;

public record LibraryItemResponse(
        PaperSummary paper,
        ReadingStatus status,
        boolean archived,
        Instant addedAt,
        Instant updatedAt,
        /** PDF page where the user last stopped reading, or null. */
        Integer lastPage
) {}
