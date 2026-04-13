package com.acesif.scholarsyncbackend.integrations.semanticscholar.services;

import com.acesif.scholarsyncbackend.commons.config.properties.SemanticScholar;
import com.acesif.scholarsyncbackend.integrations.semanticscholar.dtos.AutoCompleteResponse;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Slf4j
@Service
@RequiredArgsConstructor
public class SemanticScholarService {

  private final SemanticScholar semanticScholar;

  StringBuilder baseUrl = new StringBuilder();

  public AutoCompleteResponse suggestPaperQueryCompletion(String query) {

    baseUrl.append(semanticScholar.getBaseUrl());

    String fullUrl = baseUrl.append("/paper/autocomplete").append("?").append("query").append("=").append(query).toString();
    RestClient restClient = RestClient.create();

    return restClient.get()
            .uri(fullUrl)
            .headers(semanticScholar.getHeaders())
            .retrieve()
            .body(AutoCompleteResponse.class);
  }
}
