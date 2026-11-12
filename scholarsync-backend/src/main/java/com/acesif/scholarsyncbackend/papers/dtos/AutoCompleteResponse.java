package com.acesif.scholarsyncbackend.papers.dtos;

import java.util.List;

/** Title suggestions; {@code id} is a paper id usable at /papers/{id}. */
public record AutoCompleteResponse(List<Matches> matches) {
  public record Matches(String id, String title, String authorsYear) {}
}
