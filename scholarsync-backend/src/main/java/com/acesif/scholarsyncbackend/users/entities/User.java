package com.acesif.scholarsyncbackend.users.entities;

import com.acesif.scholarsyncbackend.users.enums.EAuthProvider;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

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
  private String id;

  @Column(unique = true)
  private String googleId;

  @Column(unique = true)
  private String orcidId;

  @Column(nullable = false, unique = true)
  private String email;

  private String name;
  private String avatarUrl;

  @Enumerated(EnumType.STRING)
  private EAuthProvider primaryProvider;

  @CreationTimestamp
  @Column(nullable = false, updatable = false)
  private Instant createdAt;

  private Instant lastLoginAt;
}