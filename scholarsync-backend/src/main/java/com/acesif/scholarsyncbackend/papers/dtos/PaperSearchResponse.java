package com.acesif.scholarsyncbackend.papers.dtos;

import java.util.List;

public record PaperSearchResponse(int total, int offset, int limit, List<PaperSummary> items) {}
