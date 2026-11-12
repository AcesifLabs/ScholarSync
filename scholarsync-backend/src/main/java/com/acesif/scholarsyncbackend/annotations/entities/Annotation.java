package com.acesif.scholarsyncbackend.annotations.entities;

import com.acesif.scholarsyncbackend.annotations.enums.AnnotationVisibility;
import com.acesif.scholarsyncbackend.annotations.enums.HighlightColor;
import com.acesif.scholarsyncbackend.users.entities.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "annotations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Annotation {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(nullable = false)
  private String paperId;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "author_id")
  private User author;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private AnnotationVisibility visibility;

  private UUID groupId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private HighlightColor color;

  /** The PDF highlighter's scaled position (pageNumber, boundingRect, rects), stored as given. */
  @JdbcTypeCode(SqlTypes.JSON)
  @Column(nullable = false)
  private Map<String, Object> position;

  private String quote;
  private String comment;
  private Instant resolvedAt;
  private UUID resolvedBy;

  @Column(nullable = false, updatable = false)
  private Instant createdAt;

  @Column(nullable = false)
  private Instant updatedAt;
}
