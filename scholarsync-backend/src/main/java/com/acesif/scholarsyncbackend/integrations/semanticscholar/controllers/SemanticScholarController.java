package com.acesif.scholarsyncbackend.integrations.semanticscholar.controllers;

import com.acesif.scholarsyncbackend.commons.constants.ApiPaths;
import com.acesif.scholarsyncbackend.integrations.semanticscholar.dtos.AutoCompleteResponse;
import com.acesif.scholarsyncbackend.integrations.semanticscholar.services.SemanticScholarService;
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
public class SemanticScholarController {

  private final SemanticScholarService semanticScholarService;

  @GetMapping("/autocomplete")
  public ResponseEntity<@NonNull AutoCompleteResponse> queryCompletion(@RequestParam("query") String query) {
    return ResponseEntity.ok(semanticScholarService.suggestPaperQueryCompletion(query));
  }
}
