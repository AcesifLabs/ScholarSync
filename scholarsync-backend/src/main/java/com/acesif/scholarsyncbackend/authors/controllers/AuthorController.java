package com.acesif.scholarsyncbackend.authors.controllers;

import com.acesif.scholarsyncbackend.commons.constants.Limits;
import com.acesif.scholarsyncbackend.authors.dtos.AuthorPapersResponse;
import com.acesif.scholarsyncbackend.authors.dtos.AuthorSearchResponse;
import com.acesif.scholarsyncbackend.authors.dtos.AuthorSummary;
import com.acesif.scholarsyncbackend.authors.services.AuthorService;
import com.acesif.scholarsyncbackend.commons.constants.ApiPaths;
import com.acesif.scholarsyncbackend.commons.utils.SearchText;
import com.acesif.scholarsyncbackend.papers.services.PaperService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(ApiPaths.Authors.BASE)
@RequiredArgsConstructor
@Tag(name = "Authors", description = "Researcher profiles from OpenAlex (public)")
public class AuthorController {

  /** OpenAlex author ids such as A5023888391; case-insensitive. */
  private static final String AUTHOR_ID = "[Aa]\\d{1,20}";
  private static final String AUTHOR_ID_MESSAGE = "must be an OpenAlex author id such as A5023888391";

  private final AuthorService authorService;

  @Operation(summary = "Search authors")
  @GetMapping("/search")
  public AuthorSearchResponse search(
          @RequestParam @NotBlank @Size(max = 200) String q,
          @RequestParam(defaultValue = "0") @Min(0) int offset,
          @RequestParam(defaultValue = Limits.DEFAULT_PAGE_SIZE) @Min(1) @Max(Limits.MAX_SMALL_PAGE_SIZE) int limit
  ) {
    return authorService.search(SearchText.plain(q), offset, limit);
  }

  @Operation(summary = "Get author", description = "Profile with paper count, citations and h-index")
  @GetMapping("/{authorId}")
  public AuthorSummary get(@PathVariable @Pattern(regexp = AUTHOR_ID, message = AUTHOR_ID_MESSAGE) String authorId) {
    return authorService.get(authorId);
  }

  @Operation(summary = "Author papers")
  @GetMapping("/{authorId}/papers")
  public AuthorPapersResponse papers(
          @PathVariable @Pattern(regexp = AUTHOR_ID, message = AUTHOR_ID_MESSAGE) String authorId,
          @RequestParam(defaultValue = "0") @Min(0) @Max(PaperService.MAX_RESULT_WINDOW) int offset,
          @RequestParam(defaultValue = Limits.DEFAULT_PAGE_SIZE) @Min(1) @Max(Limits.MAX_PAGE_SIZE) int limit
  ) {
    return authorService.papers(authorId, offset, limit);
  }
}
