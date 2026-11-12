package com.acesif.scholarsyncbackend.papers.controllers;

import com.acesif.scholarsyncbackend.commons.constants.Limits;
import com.acesif.scholarsyncbackend.commons.constants.ApiPaths;
import com.acesif.scholarsyncbackend.commons.utils.SearchText;
import com.acesif.scholarsyncbackend.integrations.sources.utils.Vocabulary;
import com.acesif.scholarsyncbackend.papers.dtos.*;
import com.acesif.scholarsyncbackend.integrations.sources.enums.PaperSort;
import com.acesif.scholarsyncbackend.integrations.sources.dtos.SearchFilters;
import com.acesif.scholarsyncbackend.papers.services.PaperService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import com.acesif.scholarsyncbackend.users.entities.User;

import java.util.List;

@RestController
@RequestMapping(ApiPaths.Papers.BASE)
@RequiredArgsConstructor
@Tag(name = "Papers", description = "Paper search and metadata (public)")
public class PaperController {

  private final PaperService paperService;

  @Operation(summary = "Search papers", description = "Merged results from OpenAlex, Crossref, Europe PMC and arXiv, served from the search cache when a similar query was seen")
  @GetMapping(ApiPaths.Papers.SEARCH)
  public PaperSearchResponse search(
          @RequestParam @NotBlank @Size(max = 300) String q,
          @RequestParam(required = false) @Min(SearchFilters.MIN_YEAR) @Max(SearchFilters.MAX_YEAR) Integer yearFrom,
          @RequestParam(required = false) @Min(SearchFilters.MIN_YEAR) @Max(SearchFilters.MAX_YEAR) Integer yearTo,
          @Parameter(description = "OpenAlex field ids (e.g. 17 = Computer Science); names contain commas, so ids travel instead")
          @RequestParam(required = false) List<Integer> fields,
          @RequestParam(required = false) List<@NotBlank String> venue,
          @RequestParam(required = false) @Min(0) Integer minCitations,
          @RequestParam(defaultValue = "false") boolean openAccess,
          @RequestParam(required = false) List<@NotBlank String> types,
          @RequestParam(defaultValue = "relevance") String sort,
          @RequestParam(defaultValue = "0") @Min(0) int offset,
          @RequestParam(defaultValue = Limits.DEFAULT_PAGE_SIZE) @Min(1) @Max(Limits.MAX_SMALL_PAGE_SIZE) int limit
  ) {
    SearchFilters filters = new SearchFilters(SearchText.plain(q), yearFrom, yearTo,
            fieldNames(fields), normalized(venue), minCitations, openAccess, publicationTypes(types));
    return paperService.search(filters, PaperSort.parse(sort), offset, limit);
  }

  @Operation(summary = "Autocomplete", description = "Paper title suggestions for a partial query")
  @GetMapping(ApiPaths.Papers.AUTOCOMPLETE)
  public AutoCompleteResponse autocomplete(@RequestParam @NotBlank @Size(max = 100) String q) {
    return paperService.autocomplete(SearchText.plain(q));
  }

  @Operation(summary = "Get paper", description = "Merged paper metadata; refreshed from the sources when older than search.paper-ttl")
  @GetMapping(ApiPaths.Papers.BY_ID)
  public PaperDetail get(@PathVariable @Size(max = Limits.MAX_PAPER_ID_LENGTH) String paperId,
                         @AuthenticationPrincipal User user) {
    return paperService.getDetail(paperId, user == null ? null : user.getId());
  }

  /** Field names for the given OpenAlex field ids; an unknown id is a 400. */
  private static List<String> fieldNames(List<Integer> ids) {
    if (ids == null) return List.of();
    return ids.stream().distinct().map(id -> {
      String name = Vocabulary.FIELD_NAMES.get(id);
      if (name == null) throw new IllegalArgumentException("Unknown field id: " + id);
      return name;
    }).sorted().toList();
  }

  /** Only the shared vocabulary is accepted, so every value means something to the filters and cache keys. */
  private static List<String> publicationTypes(List<String> types) {
    List<String> values = normalized(types);
    values.stream().filter(t -> !Vocabulary.TYPES.contains(t)).findFirst().ifPresent(t -> {
      throw new IllegalArgumentException("Unknown publication type: " + t);
    });
    return values;
  }

  /** Sorted and de-duplicated so equivalent queries share one cache entry. */
  private static List<String> normalized(List<String> values) {
    return values == null ? List.of() : values.stream().map(String::trim).filter(v -> !v.isEmpty()).distinct().sorted().toList();
  }
}
