package com.acesif.scholarsyncbackend.users.entities;

import com.acesif.scholarsyncbackend.users.enums.AuthProvider;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(unique = true)
  private String googleId;

  @Column(nullable = false, unique = true)
  private String email;

  private String name;
  private String avatarUrl;

  @Enumerated(EnumType.STRING)
  private AuthProvider primaryProvider;

  @CreationTimestamp
  @Column(nullable = false, updatable = false)
  private Instant createdAt;

  private Instant lastLoginAt;
}
