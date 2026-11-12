package com.acesif.scholarsyncbackend.library.controllers;

import com.acesif.scholarsyncbackend.commons.constants.Limits;
import com.acesif.scholarsyncbackend.library.enums.LibrarySort;

import com.acesif.scholarsyncbackend.commons.constants.ApiPaths;
import com.acesif.scholarsyncbackend.library.dtos.*;
import com.acesif.scholarsyncbackend.library.enums.ReadingStatus;
import com.acesif.scholarsyncbackend.library.services.LibraryService;
import com.acesif.scholarsyncbackend.users.entities.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(ApiPaths.Library.BASE)
@RequiredArgsConstructor
@Tag(name = "Library", description = "The signed-in user's saved papers")
public class LibraryController {

  private final LibraryService libraryService;

  @Operation(summary = "List library", description = "Saved papers, optionally filtered by status, or the archived ones")
  @GetMapping
  public LibraryPage list(
          @AuthenticationPrincipal User user,
          @RequestParam(required = false) ReadingStatus status,
          @RequestParam(defaultValue = "false") boolean archived,
          @RequestParam(defaultValue = "added") String sort,
          @RequestParam(defaultValue = "0") @Min(0) int page,
          @RequestParam(defaultValue = Limits.DEFAULT_PAGE_SIZE) @Min(1) @Max(Limits.MAX_PAGE_SIZE) int size
  ) {
    return libraryService.list(user, status, archived, LibrarySort.parse(sort), page, size);
  }

  @Operation(summary = "Library states", description = "paperId → status for every saved paper, used to mark search results")
  @GetMapping("/states")
  public List<LibraryEntryState> states(@AuthenticationPrincipal User user) {
    return libraryService.states(user);
  }

  @Operation(summary = "Save paper", description = "Adds a paper to the library (idempotent; restores it if archived)")
  @PutMapping("/{paperId}")
  public LibraryItemResponse save(@AuthenticationPrincipal User user, @PathVariable @Size(max = Limits.MAX_PAPER_ID_LENGTH) String paperId) {
    return libraryService.save(user, paperId);
  }

  @Operation(summary = "Update saved paper", description = "Change reading status, archive state and/or the last page read")
  @PatchMapping("/{paperId}")
  public LibraryItemResponse update(@AuthenticationPrincipal User user, @PathVariable @Size(max = Limits.MAX_PAPER_ID_LENGTH) String paperId,
                                    @RequestBody @Valid LibraryItemUpdateRequest request) {
    return libraryService.update(user, paperId, request);
  }

  @Operation(summary = "Remove paper", description = "Removes a paper from the library (idempotent)")
  @DeleteMapping("/{paperId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void remove(@AuthenticationPrincipal User user, @PathVariable @Size(max = Limits.MAX_PAPER_ID_LENGTH) String paperId) {
    libraryService.remove(user, paperId);
  }
}
