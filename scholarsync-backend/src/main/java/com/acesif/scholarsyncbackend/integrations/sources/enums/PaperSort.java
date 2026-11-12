package com.acesif.scholarsyncbackend.integrations.sources.enums;

import java.util.Arrays;

public enum PaperSort {
  RELEVANCE,
  CITATIONS,
  RECENT;

  public static PaperSort parse(String value) {
    return Arrays.stream(values())
            .filter(s -> s.name().equalsIgnoreCase(value))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("sort must be one of relevance, citations, recent"));
  }
}
