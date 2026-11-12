package com.acesif.scholarsyncbackend.collections.entities;

import com.acesif.scholarsyncbackend.collections.enums.CollectionVisibility;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "collections")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Collection {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(nullable = false)
  private UUID ownerId;

  @Column(nullable = false)
  private String name;

  private String description;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private CollectionVisibility visibility;

  private String shareToken;
  private Instant archivedAt;

  @Column(nullable = false, updatable = false)
  private Instant createdAt;

  @Column(nullable = false)
  private Instant updatedAt;
}
