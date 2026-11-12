package com.acesif.scholarsyncbackend.collections.repositories;

import com.acesif.scholarsyncbackend.collections.entities.Collection;
import lombok.NonNull;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CollectionRepository extends JpaRepository<@NonNull Collection, @NonNull UUID> {

  List<Collection> findByOwnerIdAndArchivedAtIsNullOrderByUpdatedAtDesc(UUID ownerId);

  List<Collection> findByOwnerIdAndArchivedAtIsNotNullOrderByUpdatedAtDesc(UUID ownerId);

  Optional<Collection> findByIdAndOwnerId(UUID id, UUID ownerId);

  /** SELECT ... FOR UPDATE: callers that compute the next position hold this lock until they commit. */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select c from Collection c where c.id = :id and c.ownerId = :ownerId")
  Optional<Collection> lockOwned(UUID id, UUID ownerId);

  Optional<Collection> findByShareToken(String shareToken);

  boolean existsByOwnerIdAndNameAndIdNot(UUID ownerId, String name, UUID id);

  boolean existsByOwnerIdAndName(UUID ownerId, String name);
}
