package com.acesif.scholarsyncbackend.notifications.entities;

import com.acesif.scholarsyncbackend.notifications.enums.NotificationType;
import com.acesif.scholarsyncbackend.users.entities.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(nullable = false)
  private UUID recipientId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private NotificationType type;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "actor_id")
  private User actor;

  private UUID groupId;
  private String paperId;
  private UUID targetId;
  private Instant readAt;

  @Column(nullable = false, updatable = false)
  private Instant createdAt;
}
