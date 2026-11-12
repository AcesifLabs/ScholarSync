package com.acesif.scholarsyncbackend.library.dtos;

import java.util.List;

public record LibraryPage(List<LibraryItemResponse> items, long total, int page, int size) {}
