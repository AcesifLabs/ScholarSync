package com.acesif.scholarsyncbackend.integrations.sources.dtos;

import java.util.List;

/** Search query and filters. Lists are trimmed, de-duplicated and sorted by the controller so cache keys are stable. */
public record SearchFilters(
        String query,
        Integer yearFrom,
        Integer yearTo,
        List<String> fieldsOfStudy,
        List<String> venues,
        Integer minCitations,
        boolean openAccessOnly,
        List<String> publicationTypes
) {
  /** Bounds for yearFrom/yearTo; the frontend's MIN_YEAR mirrors MIN_YEAR. */
  public static final int MIN_YEAR = 1800;
  public static final int MAX_YEAR = 2100;
}
