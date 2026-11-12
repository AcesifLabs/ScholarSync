package com.acesif.scholarsyncbackend.library.dtos;

import com.acesif.scholarsyncbackend.library.enums.ReadingStatus;

/** Lightweight row used by the UI to mark search results as saved and to reopen the reader at the last page. */
public record LibraryEntryState(String paperId, ReadingStatus status, boolean archived, Integer lastPage) {}
