package com.acesif.scholarsyncbackend.collections.controllers;

import com.acesif.scholarsyncbackend.collections.enums.ExportFormat;
import com.acesif.scholarsyncbackend.collections.dtos.*;
import com.acesif.scholarsyncbackend.collections.services.CollectionService;
import com.acesif.scholarsyncbackend.commons.constants.ApiPaths;
import com.acesif.scholarsyncbackend.commons.constants.MediaTypes;
import com.acesif.scholarsyncbackend.users.entities.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping(ApiPaths.Collections.BASE)
@RequiredArgsConstructor
@Tag(name = "Collections", description = "Named, ordered reading lists")
public class CollectionController {

  private final CollectionService collectionService;

  @Operation(summary = "List collections", description = "The user's active collections, or archived ones")
  @GetMapping
  public List<CollectionSummary> list(@AuthenticationPrincipal User user, @RequestParam(defaultValue = "false") boolean archived) {
    return collectionService.list(user, archived);
  }

  @Operation(summary = "Create collection")
  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public CollectionSummary create(@AuthenticationPrincipal User user, @Valid @RequestBody CollectionCreateRequest request) {
    return collectionService.create(user, request);
  }

  @Operation(summary = "Get collection", description = "Collection with its papers in order")
  @GetMapping("/{id}")
  public CollectionDetail get(@AuthenticationPrincipal User user, @PathVariable UUID id) {
    return collectionService.get(user, id);
  }

  @Operation(summary = "Update collection", description = "Rename, describe, share/unshare, archive/unarchive")
  @PatchMapping("/{id}")
  public CollectionSummary update(@AuthenticationPrincipal User user, @PathVariable UUID id,
                                  @Valid @RequestBody CollectionUpdateRequest request) {
    return collectionService.update(user, id, request);
  }

  @Operation(summary = "Delete collection")
  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@AuthenticationPrincipal User user, @PathVariable UUID id) {
    collectionService.delete(user, id);
  }

  @Operation(summary = "Add paper", description = "Appends a paper (idempotent) and saves it to the library")
  @PostMapping("/{id}/papers")
  public CollectionEntry addPaper(@AuthenticationPrincipal User user, @PathVariable UUID id,
                                  @Valid @RequestBody CollectionAddPaperRequest request) {
    return collectionService.addPaper(user, id, request.paperId());
  }

  @Operation(summary = "Remove paper")
  @DeleteMapping("/{id}/papers/{paperId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void removePaper(@AuthenticationPrincipal User user, @PathVariable UUID id, @PathVariable String paperId) {
    collectionService.removePaper(user, id, paperId);
  }

  @Operation(summary = "Edit note and tags")
  @PatchMapping("/{id}/papers/{paperId}")
  public CollectionEntry updateEntry(@AuthenticationPrincipal User user, @PathVariable UUID id, @PathVariable String paperId,
                                     @Valid @RequestBody CollectionEntryUpdateRequest request) {
    return collectionService.updateEntry(user, id, paperId, request);
  }

  @Operation(summary = "Reorder papers")
  @PutMapping("/{id}/order")
  public CollectionDetail reorder(@AuthenticationPrincipal User user, @PathVariable UUID id,
                                  @Valid @RequestBody CollectionReorderRequest request) {
    return collectionService.reorder(user, id, request.paperIds());
  }

  @Operation(summary = "Export collection", description = "format=bibtex or markdown; returned as a file download")
  @GetMapping(value = "/{id}/export", produces = {MediaTypes.APPLICATION_BIBTEX, MediaTypes.TEXT_MARKDOWN})
  public ResponseEntity<String> export(@AuthenticationPrincipal User user, @PathVariable UUID id, @RequestParam String format) {
    ExportFormat parsed;
    try {
      parsed = ExportFormat.valueOf(format.toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException e) {
      throw new IllegalArgumentException("format must be bibtex or markdown");
    }
    CollectionService.Export export = collectionService.export(user, id, parsed);
    return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_TYPE, export.contentType())
            .header(HttpHeaders.CONTENT_DISPOSITION,
                    ContentDisposition.attachment().filename(export.filename(), StandardCharsets.UTF_8).build().toString())
            .body(export.body());
  }

  @Operation(summary = "Shared collection", description = "Public read-only view by share token")
  @GetMapping(ApiPaths.Collections.SHARED)
  public SharedCollection shared(@PathVariable String token) {
    return collectionService.shared(token);
  }
}
