package com.acesif.scholarsyncbackend.collections.repositories;

import com.acesif.scholarsyncbackend.collections.entities.CollectionPaper;
import com.acesif.scholarsyncbackend.collections.entities.CollectionPaperId;
import lombok.NonNull;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface CollectionPaperRepository extends JpaRepository<@NonNull CollectionPaper, @NonNull CollectionPaperId> {

  @EntityGraph(attributePaths = "paper")
  List<CollectionPaper> findByIdCollectionIdOrderByPositionAsc(UUID collectionId);

  @Query("select coalesce(max(cp.position), -1) from CollectionPaper cp where cp.id.collectionId = :collectionId")
  int maxPosition(UUID collectionId);

  long countByIdCollectionId(UUID collectionId);

  @Query("select cp.id.collectionId, count(cp) from CollectionPaper cp where cp.id.collectionId in :collectionIds group by cp.id.collectionId")
  List<Object[]> countByCollection(List<UUID> collectionIds);
}
