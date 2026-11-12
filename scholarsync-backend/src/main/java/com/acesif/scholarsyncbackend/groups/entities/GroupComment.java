package com.acesif.scholarsyncbackend.groups.entities;

import com.acesif.scholarsyncbackend.users.entities.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "group_comments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupComment {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(nullable = false)
  private UUID groupId;

  @Column(nullable = false)
  private String paperId;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "author_id")
  private User author;

  private UUID parentId;

  @Column(nullable = false)
  private String bodyMd;

  @Column(nullable = false, updatable = false)
  private Instant createdAt;

  private Instant editedAt;
  private Instant deletedAt;
}
