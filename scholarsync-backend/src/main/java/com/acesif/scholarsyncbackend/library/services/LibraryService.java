package com.acesif.scholarsyncbackend.library.services;

import com.acesif.scholarsyncbackend.library.enums.LibrarySort;
import com.acesif.scholarsyncbackend.library.dtos.*;
import com.acesif.scholarsyncbackend.library.entities.LibraryItem;
import com.acesif.scholarsyncbackend.library.entities.LibraryItemId;
import com.acesif.scholarsyncbackend.library.enums.ReadingStatus;
import com.acesif.scholarsyncbackend.library.repositories.LibraryItemRepository;
import com.acesif.scholarsyncbackend.papers.entities.Paper;
import com.acesif.scholarsyncbackend.papers.services.PaperService;
import com.acesif.scholarsyncbackend.users.entities.User;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LibraryService {

  private final LibraryItemRepository libraryItemRepository;
  private final PaperService paperService;
  private final TransactionTemplate tx;

  /**
   * Idempotent: saving an already-saved paper keeps its status; saving an archived paper restores it. Any id that
   * names the paper (an alias such as its OpenAlex id) finds the same library entry. The paper is resolved before the
   * transaction opens, so no connection is held while the sources answer; a concurrent identical save is retried once.
   */
  public LibraryItemResponse save(User user, String paperId) {
    Paper paper = paperService.findOrFetch(paperId);
    try {
      return tx.execute(status -> save(user, paper));
    } catch (DataIntegrityViolationException e) {
      return tx.execute(status -> save(user, paper));
    }
  }

  /** {@link #save(User, String)} for a paper that is already stored; joins the caller's transaction. */
  @Transactional
  public LibraryItemResponse save(User user, Paper paper) {
    LibraryItem item = libraryItemRepository.findById(new LibraryItemId(user.getId(), paper.getId())).orElse(null);
    if (item == null) {
      Instant now = Instant.now();
      item = LibraryItem.builder()
              .id(new LibraryItemId(user.getId(), paper.getId()))
              .paper(paper)
              .status(ReadingStatus.TO_READ)
              .statusChangedAt(now)
              .createdAt(now)
              .updatedAt(now)
              .build();
    } else if (item.getArchivedAt() != null) {
      item.setArchivedAt(null);
      item.setUpdatedAt(Instant.now());
    }
    return toResponse(libraryItemRepository.saveAndFlush(item));
  }

  @Transactional
  public void remove(User user, String paperId) {
    libraryItemRepository.deleteById(new LibraryItemId(user.getId(), paperService.canonicalId(paperId)));
  }

  @Transactional
  public LibraryItemResponse update(User user, String paperId, LibraryItemUpdateRequest request) {
    if (request.status() == null && request.archived() == null && request.lastPage() == null) {
      throw new IllegalArgumentException("Provide status, archived or lastPage");
    }
    LibraryItem item = libraryItemRepository.findById(new LibraryItemId(user.getId(), paperService.canonicalId(paperId)))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Paper is not in your library"));
    Instant now = Instant.now();
    if (request.status() != null && request.status() != item.getStatus()) {
      item.setStatus(request.status());
      item.setStatusChangedAt(now);
    }
    if (request.archived() != null) {
      item.setArchivedAt(request.archived() ? (item.getArchivedAt() == null ? now : item.getArchivedAt()) : null);
    }
    if (request.lastPage() != null) item.setLastPage(request.lastPage());
    item.setUpdatedAt(now);
    return toResponse(item);
  }

  @Transactional(readOnly = true)
  public LibraryPage list(User user, ReadingStatus status, boolean archived, LibrarySort sort, int page, int size) {
    PageRequest pageable = PageRequest.of(page, size, sort.sort);
    Page<LibraryItem> result;
    if (archived) {
      result = libraryItemRepository.findByIdUserIdAndArchivedAtIsNotNull(user.getId(), pageable);
    } else if (status != null) {
      result = libraryItemRepository.findByIdUserIdAndStatusAndArchivedAtIsNull(user.getId(), status, pageable);
    } else {
      result = libraryItemRepository.findByIdUserIdAndArchivedAtIsNull(user.getId(), pageable);
    }
    return new LibraryPage(result.map(LibraryService::toResponse).getContent(), result.getTotalElements(), page, size);
  }

  @Transactional(readOnly = true)
  public List<LibraryEntryState> states(User user) {
    return libraryItemRepository.states(user.getId());
  }

  private static LibraryItemResponse toResponse(LibraryItem item) {
    return new LibraryItemResponse(PaperService.toSummary(item.getPaper()), item.getStatus(), item.getArchivedAt() != null,
            item.getCreatedAt(), item.getUpdatedAt(), item.getLastPage());
  }
}
