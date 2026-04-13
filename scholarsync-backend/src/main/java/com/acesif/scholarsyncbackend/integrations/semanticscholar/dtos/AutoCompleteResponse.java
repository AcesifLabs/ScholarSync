package com.acesif.scholarsyncbackend.integrations.semanticscholar.dtos;

import java.util.List;

public record AutoCompleteResponse(List<Matches> matches) {
  public record Matches(String id, String title, String authorsYear) {}
}
