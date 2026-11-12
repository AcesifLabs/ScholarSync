package com.acesif.scholarsyncbackend.groups.repositories;

import com.acesif.scholarsyncbackend.groups.entities.GroupComment;
import lombok.NonNull;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface GroupCommentRepository extends JpaRepository<@NonNull GroupComment, @NonNull UUID> {

  @EntityGraph(attributePaths = "author")
  List<GroupComment> findByGroupIdAndPaperIdOrderByCreatedAtAsc(UUID groupId, String paperId);

  /** One DELETE statement, so replies that the parent_id cascade removes are not deleted twice. */
  @Modifying
  @Query("delete from GroupComment c where c.groupId = :groupId and c.paperId = :paperId")
  int deleteThread(UUID groupId, String paperId);
}
