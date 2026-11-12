package com.acesif.scholarsyncbackend.groups.repositories;

import com.acesif.scholarsyncbackend.groups.entities.GroupPaper;
import com.acesif.scholarsyncbackend.groups.entities.GroupPaperId;
import lombok.NonNull;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface GroupPaperRepository extends JpaRepository<@NonNull GroupPaper, @NonNull GroupPaperId> {

  @EntityGraph(attributePaths = {"paper", "addedBy"})
  List<GroupPaper> findByIdGroupIdOrderByAddedAtDesc(UUID groupId);

  /** True when the paper is in the library of a group where the user has at least the MEMBER role. */
  @Query("""
          select count(gp) > 0 from GroupPaper gp, GroupMember m
          where gp.id.paperId = :paperId and m.id.groupId = gp.id.groupId and m.id.userId = :userId
            and m.role in (com.acesif.scholarsyncbackend.groups.enums.GroupRole.OWNER,
                           com.acesif.scholarsyncbackend.groups.enums.GroupRole.ADMIN,
                           com.acesif.scholarsyncbackend.groups.enums.GroupRole.MEMBER)
          """)
  boolean sharedWithWriter(String paperId, UUID userId);
}
