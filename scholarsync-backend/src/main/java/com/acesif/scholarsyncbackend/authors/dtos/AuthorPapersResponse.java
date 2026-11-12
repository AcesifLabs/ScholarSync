package com.acesif.scholarsyncbackend.authors.dtos;

import com.acesif.scholarsyncbackend.papers.dtos.PaperSummary;

import java.util.List;

/** {@code next} is the offset of the following page, or null on the last page. */
public record AuthorPapersResponse(int offset, Integer next, List<PaperSummary> items) {}
