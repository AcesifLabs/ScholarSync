package com.acesif.scholarsyncbackend.groups.entities;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "reading_groups")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReadingGroup {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(nullable = false)
  private String name;

  private String description;

  @JdbcTypeCode(SqlTypes.ARRAY)
  @Column(nullable = false)
  @Builder.Default
  private List<String> tags = new ArrayList<>();

  @Column(nullable = false)
  private UUID ownerId;

  @Column(nullable = false, updatable = false)
  private Instant createdAt;
}
