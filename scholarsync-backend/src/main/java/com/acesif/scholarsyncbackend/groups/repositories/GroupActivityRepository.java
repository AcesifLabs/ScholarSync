package com.acesif.scholarsyncbackend.groups.repositories;

import com.acesif.scholarsyncbackend.groups.entities.GroupActivity;
import lombok.NonNull;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface GroupActivityRepository extends JpaRepository<@NonNull GroupActivity, @NonNull Long> {

  /** Newest first. Null filters are ignored; {@code before} is an id cursor. */
  @EntityGraph(attributePaths = "actor")
  @Query("""
          select a from GroupActivity a
          where a.groupId in :groupIds
            and (:actorId is null or a.actor.id = :actorId)
            and (:paperId is null or a.paperId = :paperId)
            and (:before is null or a.id < :before)
          order by a.id desc
          """)
  List<GroupActivity> feed(Collection<UUID> groupIds, UUID actorId, String paperId, Long before, Limit limit);

  /**
   * Ids of the newest activity across every group {@code userId} belongs to. Each group's newest rows come off the
   * (group_id, id DESC) index first, so only {@code limit} rows per group are read before the merge.
   */
  @Query(value = """
          SELECT a.id FROM group_members m
          CROSS JOIN LATERAL (
            SELECT ga.id FROM group_activity ga WHERE ga.group_id = m.group_id ORDER BY ga.id DESC LIMIT :limit
          ) a
          WHERE m.user_id = :userId
          ORDER BY a.id DESC
          LIMIT :limit
          """, nativeQuery = true)
  List<Long> recentIdsForMember(UUID userId, int limit);

  @EntityGraph(attributePaths = "actor")
  List<GroupActivity> findByIdInOrderByIdDesc(Collection<Long> ids);
}
