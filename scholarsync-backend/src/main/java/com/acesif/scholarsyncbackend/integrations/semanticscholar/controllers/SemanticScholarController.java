package com.acesif.scholarsyncbackend.integrations.semanticscholar.controllers;

import com.acesif.scholarsyncbackend.commons.constants.ApiPaths;
import com.acesif.scholarsyncbackend.integrations.semanticscholar.dtos.AutoCompleteResponse;
import com.acesif.scholarsyncbackend.integrations.semanticscholar.services.SemanticScholarService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiPaths.Integrations.Base + "/semantic-scholar")
@RequiredArgsConstructor
@Tag(name = "Semantic Scholar", description = "Integration with Semantic Scholar API")
public class SemanticScholarController {

  private final SemanticScholarService semanticScholarService;

  @Operation(summary = "Query autocomplete", description = "Returns paper query suggestions based on a search term")
  @GetMapping("/autocomplete")
  public ResponseEntity<@NonNull AutoCompleteResponse> queryCompletion(@RequestParam("query") String query) {
    return ResponseEntity.ok(semanticScholarService.suggestPaperQueryCompletion(query));
  }
}
