package com.acesif.scholarsyncbackend.authors.dtos;

import java.util.List;

public record AuthorSearchResponse(int total, int offset, int limit, List<AuthorSummary> items) {}
