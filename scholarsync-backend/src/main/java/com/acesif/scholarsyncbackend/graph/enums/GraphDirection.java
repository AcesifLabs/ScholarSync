package com.acesif.scholarsyncbackend.graph.enums;

import java.util.Arrays;

public enum GraphDirection {
  /** Papers the seed cites (its references). */
  CITES,
  /** Papers citing the seed. */
  CITED_BY,
  BOTH;

  public boolean includesReferences() {
    return this != CITED_BY;
  }

  public boolean includesCitations() {
    return this != CITES;
  }

  public static GraphDirection parse(String value) {
    return Arrays.stream(values())
            .filter(d -> d.name().equalsIgnoreCase(value))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("direction must be one of cites, cited_by, both"));
  }
}
