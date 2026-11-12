package com.acesif.scholarsyncbackend.collections.services;

import com.acesif.scholarsyncbackend.collections.enums.ExportFormat;
import com.acesif.scholarsyncbackend.commons.constants.MediaTypes;
import com.acesif.scholarsyncbackend.commons.utils.Tokens;
import com.acesif.scholarsyncbackend.collections.utils.CollectionExporter;

import com.acesif.scholarsyncbackend.collections.dtos.*;
import com.acesif.scholarsyncbackend.collections.entities.Collection;
import com.acesif.scholarsyncbackend.collections.entities.CollectionPaper;
import com.acesif.scholarsyncbackend.collections.entities.CollectionPaperId;
import com.acesif.scholarsyncbackend.collections.enums.CollectionVisibility;
import com.acesif.scholarsyncbackend.collections.repositories.CollectionPaperRepository;
import com.acesif.scholarsyncbackend.collections.repositories.CollectionRepository;
import com.acesif.scholarsyncbackend.library.services.LibraryService;
import com.acesif.scholarsyncbackend.papers.entities.Paper;
import com.acesif.scholarsyncbackend.papers.services.PaperService;
import com.acesif.scholarsyncbackend.users.entities.User;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CollectionService {

  public record Export(String filename, String contentType, String body) {}


  private final CollectionRepository collectionRepository;
  private final CollectionPaperRepository collectionPaperRepository;
  private final PaperService paperService;
  private final LibraryService libraryService;
  private final TransactionTemplate tx;

  @Transactional(readOnly = true)
  public List<CollectionSummary> list(User user, boolean archived) {
    List<Collection> collections = archived
            ? collectionRepository.findByOwnerIdAndArchivedAtIsNotNullOrderByUpdatedAtDesc(user.getId())
            : collectionRepository.findByOwnerIdAndArchivedAtIsNullOrderByUpdatedAtDesc(user.getId());
    if (collections.isEmpty()) return List.of();
    Map<UUID, Long> counts = collectionPaperRepository.countByCollection(collections.stream().map(Collection::getId).toList())
            .stream().collect(Collectors.toMap(row -> (UUID) row[0], row -> (Long) row[1]));
    return collections.stream().map(c -> toSummary(c, counts.getOrDefault(c.getId(), 0L))).toList();
  }

  @Transactional
  public CollectionSummary create(User user, CollectionCreateRequest request) {
    String name = request.name().strip();
    if (collectionRepository.existsByOwnerIdAndName(user.getId(), name)) throw duplicateName(name);
    Instant now = Instant.now();
    Collection collection = collectionRepository.save(Collection.builder()
            .ownerId(user.getId())
            .name(name)
            .description(blankToNull(request.description()))
            .visibility(CollectionVisibility.PRIVATE)
            .createdAt(now)
            .updatedAt(now)
            .build());
    return toSummary(collection, 0);
  }

  @Transactional(readOnly = true)
  public CollectionDetail get(User user, UUID id) {
    Collection collection = owned(user, id);
    List<CollectionPaper> entries = entries(id);
    return new CollectionDetail(toSummary(collection, entries.size()), entries.stream().map(CollectionService::toEntry).toList());
  }

  @Transactional
  public CollectionSummary update(User user, UUID id, CollectionUpdateRequest request) {
    Collection collection = owned(user, id);
    if (request.name() != null) {
      String name = request.name().strip();
      if (collectionRepository.existsByOwnerIdAndNameAndIdNot(user.getId(), name, id)) throw duplicateName(name);
      collection.setName(name);
    }
    if (request.description() != null) collection.setDescription(blankToNull(request.description()));
    if (request.visibility() != null && request.visibility() != collection.getVisibility()) {
      collection.setVisibility(request.visibility());
      // Switching to private revokes the link; switching back issues a new one.
      collection.setShareToken(request.visibility() == CollectionVisibility.PUBLIC_LINK ? Tokens.newUrlToken() : null);
    }
    if (request.archived() != null) {
      collection.setArchivedAt(request.archived() ? Objects.requireNonNullElseGet(collection.getArchivedAt(), Instant::now) : null);
    }
    touch(collection);
    return toSummary(collection, collectionPaperRepository.countByIdCollectionId(id));
  }

  @Transactional
  public void delete(User user, UUID id) {
    collectionRepository.delete(owned(user, id));
  }

  /**
   * Idempotent. Also saves the paper to the user's library. The paper is resolved before the transaction opens, so no
   * connection is held while the sources answer; a concurrent identical add is retried once and finds the entry.
   */
  public CollectionEntry addPaper(User user, UUID id, String paperId) {
    owned(user, id);
    Paper paper = paperService.findOrFetch(paperId);
    try {
      return tx.execute(status -> addPaper(user, id, paper));
    } catch (DataIntegrityViolationException e) {
      return tx.execute(status -> addPaper(user, id, paper));
    }
  }

  private CollectionEntry addPaper(User user, UUID id, Paper paper) {
    // The row lock serializes adds to one collection, so maxPosition() + 1 is not handed out twice
    Collection collection = collectionRepository.lockOwned(id, user.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Collection not found"));
    CollectionPaper existing = collectionPaperRepository.findById(new CollectionPaperId(id, paper.getId())).orElse(null);
    if (existing != null) return toEntry(existing);

    libraryService.save(user, paper);
    CollectionPaper entry = collectionPaperRepository.saveAndFlush(CollectionPaper.builder()
            .id(new CollectionPaperId(id, paper.getId()))
            .paper(paper)
            .position(collectionPaperRepository.maxPosition(id) + 1)
            .addedAt(Instant.now())
            .build());
    touch(collection);
    return toEntry(entry);
  }

  @Transactional
  public void removePaper(User user, UUID id, String paperId) {
    Collection collection = owned(user, id);
    collectionPaperRepository.deleteById(new CollectionPaperId(id, paperService.canonicalId(paperId)));
    touch(collection);
  }

  @Transactional
  public CollectionEntry updateEntry(User user, UUID id, String paperId, CollectionEntryUpdateRequest request) {
    Collection collection = owned(user, id);
    CollectionPaper entry = collectionPaperRepository.findById(new CollectionPaperId(id, paperService.canonicalId(paperId)))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Paper is not in this collection"));
    if (request.note() != null) entry.setNote(blankToNull(request.note()));
    if (request.tags() != null) entry.setTags(CollectionExporter.normalizeTags(request.tags()));
    touch(collection);
    return toEntry(entry);
  }

  @Transactional
  public CollectionDetail reorder(User user, UUID id, List<String> paperIds) {
    Collection collection = owned(user, id);
    List<CollectionPaper> entries = entries(id);
    Set<String> requested = new HashSet<>(paperIds);
    Set<String> current = entries.stream().map(e -> e.getId().getPaperId()).collect(Collectors.toSet());
    if (requested.size() != paperIds.size() || !requested.equals(current)) {
      throw new IllegalArgumentException("paperIds must list every paper in the collection exactly once");
    }
    Map<String, CollectionPaper> byId = entries.stream().collect(Collectors.toMap(e -> e.getId().getPaperId(), Function.identity()));
    for (int i = 0; i < paperIds.size(); i++) byId.get(paperIds.get(i)).setPosition(i);
    touch(collection);
    List<CollectionPaper> ordered = paperIds.stream().map(byId::get).toList();
    return new CollectionDetail(toSummary(collection, ordered.size()), ordered.stream().map(CollectionService::toEntry).toList());
  }

  @Transactional(readOnly = true)
  public SharedCollection shared(String token) {
    Collection collection = collectionRepository.findByShareToken(token)
            .filter(c -> c.getArchivedAt() == null)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Shared collection not found"));
    return new SharedCollection(collection.getName(), collection.getDescription(),
            entries(collection.getId()).stream().map(e -> PaperService.toSummary(e.getPaper())).toList());
  }

  @Transactional(readOnly = true)
  public Export export(User user, UUID id, ExportFormat format) {
    Collection collection = owned(user, id);
    List<CollectionPaper> entries = entries(id);
    return switch (format) {
      case BIBTEX -> new Export(CollectionExporter.filename(collection, "bib"), MediaTypes.APPLICATION_BIBTEX_UTF8,
              CollectionExporter.bibtex(entries));
      case MARKDOWN -> new Export(CollectionExporter.filename(collection, "md"), MediaTypes.TEXT_MARKDOWN_UTF8,
              CollectionExporter.markdown(collection, entries));
    };
  }

  private Collection owned(User user, UUID id) {
    // 404 rather than 403 so ids of other users' collections are not confirmed
    return collectionRepository.findByIdAndOwnerId(id, user.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Collection not found"));
  }

  private List<CollectionPaper> entries(UUID collectionId) {
    return collectionPaperRepository.findByIdCollectionIdOrderByPositionAsc(collectionId);
  }

  private static void touch(Collection collection) {
    collection.setUpdatedAt(Instant.now());
  }

  private static ResponseStatusException duplicateName(String name) {
    return new ResponseStatusException(HttpStatus.CONFLICT, "You already have a collection named \"" + name + "\"");
  }

  private static String blankToNull(String s) {
    return s == null || s.isBlank() ? null : s.strip();
  }

  private static CollectionSummary toSummary(Collection c, long paperCount) {
    return new CollectionSummary(c.getId(), c.getName(), c.getDescription(), c.getVisibility(), c.getShareToken(),
            c.getArchivedAt() != null, paperCount, c.getCreatedAt(), c.getUpdatedAt());
  }

  private static CollectionEntry toEntry(CollectionPaper e) {
    return new CollectionEntry(PaperService.toSummary(e.getPaper()), e.getPosition(), e.getNote(), e.getTags(), e.getAddedAt());
  }
}
