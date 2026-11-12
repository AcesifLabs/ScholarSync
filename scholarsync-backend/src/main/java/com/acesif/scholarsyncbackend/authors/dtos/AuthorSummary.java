package com.acesif.scholarsyncbackend.authors.dtos;

import java.util.List;

public record AuthorSummary(
        String id,
        String name,
        List<String> affiliations,
        int paperCount,
        int citationCount,
        int hIndex,
        String url,
        String homepage
) {}
