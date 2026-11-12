package com.acesif.scholarsyncbackend.library.enums;

import org.springframework.data.domain.Sort;

import java.util.Arrays;

public enum LibrarySort {
  ADDED(Sort.by(Sort.Direction.DESC, "createdAt")),
  UPDATED(Sort.by(Sort.Direction.DESC, "updatedAt")),
  TITLE(Sort.by(Sort.Direction.ASC, "paper.title"));

  public final Sort sort;

  LibrarySort(Sort sort) {
    this.sort = sort;
  }

  public static LibrarySort parse(String value) {
    return Arrays.stream(values())
            .filter(s -> s.name().equalsIgnoreCase(value))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("sort must be one of added, updated, title"));
  }
}
