package com.acesif.scholarsyncbackend.groups.entities;

import com.acesif.scholarsyncbackend.groups.enums.GroupRole;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "group_invites")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupInvite {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(nullable = false)
  private UUID groupId;

  @Column(nullable = false)
  private String token;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private GroupRole role;

  @Column(nullable = false)
  private Instant expiresAt;

  private UUID createdBy;
  private Instant revokedAt;

  @Column(nullable = false, updatable = false)
  private Instant createdAt;

  public boolean isUsable(Instant now) {
    return revokedAt == null && expiresAt.isAfter(now);
  }
}
