package com.acesif.scholarsyncbackend.library.repositories;

import com.acesif.scholarsyncbackend.library.dtos.LibraryEntryState;
import com.acesif.scholarsyncbackend.library.entities.LibraryItem;
import com.acesif.scholarsyncbackend.library.entities.LibraryItemId;
import com.acesif.scholarsyncbackend.library.enums.ReadingStatus;
import lombok.NonNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface LibraryItemRepository extends JpaRepository<@NonNull LibraryItem, @NonNull LibraryItemId> {

  @EntityGraph(attributePaths = "paper")
  Page<LibraryItem> findByIdUserIdAndArchivedAtIsNull(UUID userId, Pageable pageable);

  @EntityGraph(attributePaths = "paper")
  Page<LibraryItem> findByIdUserIdAndStatusAndArchivedAtIsNull(UUID userId, ReadingStatus status, Pageable pageable);

  @EntityGraph(attributePaths = "paper")
  Page<LibraryItem> findByIdUserIdAndArchivedAtIsNotNull(UUID userId, Pageable pageable);

  @Query("""
          select new com.acesif.scholarsyncbackend.library.dtos.LibraryEntryState(
            i.id.paperId, i.status, case when i.archivedAt is not null then true else false end, i.lastPage)
          from LibraryItem i where i.id.userId = :userId
          """)
  List<LibraryEntryState> states(UUID userId);
}
