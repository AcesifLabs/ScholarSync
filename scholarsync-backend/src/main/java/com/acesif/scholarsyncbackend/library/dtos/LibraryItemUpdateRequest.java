package com.acesif.scholarsyncbackend.library.dtos;

import com.acesif.scholarsyncbackend.library.enums.ReadingStatus;

import jakarta.validation.constraints.Min;

/** All fields optional; at least one must be set. */
public record LibraryItemUpdateRequest(ReadingStatus status, Boolean archived, @Min(1) Integer lastPage) {}
