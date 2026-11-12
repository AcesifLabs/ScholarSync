package com.acesif.scholarsyncbackend.notifications.repositories;

import com.acesif.scholarsyncbackend.notifications.entities.Notification;
import lombok.NonNull;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<@NonNull Notification, @NonNull UUID> {

  @EntityGraph(attributePaths = "actor")
  @Query("""
          select n from Notification n
          where n.recipientId = :recipientId
            and (:unreadOnly = false or n.readAt is null)
            and n.createdAt < :before
          order by n.createdAt desc
          """)
  List<Notification> page(UUID recipientId, boolean unreadOnly, Instant before, Limit limit);

  long countByRecipientIdAndReadAtIsNull(UUID recipientId);

  Optional<Notification> findByIdAndRecipientId(UUID id, UUID recipientId);

  @Modifying
  @Query("update Notification n set n.readAt = :now where n.recipientId = :recipientId and n.readAt is null")
  int markAllRead(UUID recipientId, Instant now);

  /** One notification per member of the group except the actor, in a single statement. */
  @Modifying
  @Query(value = """
          INSERT INTO notifications (recipient_id, type, actor_id, group_id, paper_id, created_at)
          SELECT m.user_id, :type, :actorId, :groupId, :paperId, :now
          FROM group_members m
          WHERE m.group_id = :groupId AND m.user_id <> :actorId
          """, nativeQuery = true)
  int notifyGroupMembers(UUID groupId, String type, UUID actorId, String paperId, Instant now);
}
