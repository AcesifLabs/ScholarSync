package com.acesif.scholarsyncbackend.annotations.repositories;

import com.acesif.scholarsyncbackend.annotations.entities.Annotation;
import lombok.NonNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface AnnotationRepository extends JpaRepository<@NonNull Annotation, @NonNull UUID> {

  /**
   * The caller's private annotations plus group annotations in the given groups, narrowed by the optional filters
   * (a null filter is ignored; with {@code groupId} set only that group's annotations match).
   */
  @EntityGraph(attributePaths = "author")
  @Query("""
          select a from Annotation a
          where a.paperId = :paperId
            and ((a.visibility = com.acesif.scholarsyncbackend.annotations.enums.AnnotationVisibility.PRIVATE and a.author.id = :userId)
              or (a.groupId in :groupIds))
            and (:groupId is null or a.groupId = :groupId)
            and (:authorId is null or a.author.id = :authorId)
            and (:includeResolved = true or a.resolvedAt is null)
          order by a.createdAt asc
          """)
  List<Annotation> findVisible(String paperId, UUID userId, Collection<UUID> groupIds, UUID groupId, UUID authorId,
                               boolean includeResolved);

  @EntityGraph(attributePaths = "author")
  @Query("""
          select a from Annotation a
          where a.groupId = :groupId and (:includeResolved = true or a.resolvedAt is null)
          order by a.createdAt desc, a.id desc
          """)
  Page<Annotation> findInGroup(UUID groupId, boolean includeResolved, Pageable pageable);

  @Modifying
  @Query("delete from Annotation a where a.groupId = :groupId and a.paperId = :paperId")
  int deleteInGroup(UUID groupId, String paperId);
}
