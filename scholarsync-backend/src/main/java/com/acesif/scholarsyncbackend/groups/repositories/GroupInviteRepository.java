package com.acesif.scholarsyncbackend.groups.repositories;

import com.acesif.scholarsyncbackend.groups.entities.GroupInvite;
import lombok.NonNull;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GroupInviteRepository extends JpaRepository<@NonNull GroupInvite, @NonNull UUID> {

  Optional<GroupInvite> findByToken(String token);

  List<GroupInvite> findByGroupIdAndRevokedAtIsNullAndExpiresAtAfterOrderByCreatedAtDesc(UUID groupId, Instant now);

  @Modifying
  @Query("update GroupInvite i set i.revokedAt = :now where i.groupId = :groupId and i.createdBy = :userId and i.revokedAt is null")
  int revokeCreatedBy(UUID groupId, UUID userId, Instant now);
}
