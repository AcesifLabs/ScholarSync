package com.acesif.scholarsyncbackend.library.entities;

import com.acesif.scholarsyncbackend.library.enums.ReadingStatus;
import com.acesif.scholarsyncbackend.papers.entities.Paper;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.domain.Persistable;

import java.time.Instant;

@Entity
@Table(name = "library_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LibraryItem implements Persistable<LibraryItemId> {

  @EmbeddedId
  private LibraryItemId id;

  @MapsId("paperId")
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "paper_id")
  private Paper paper;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private ReadingStatus status;

  @Column(nullable = false)
  private Instant statusChangedAt;

  private Instant archivedAt;

  private Integer lastPage;

  @Column(nullable = false, updatable = false)
  private Instant createdAt;

  @Column(nullable = false)
  private Instant updatedAt;

  /** Assigned ids: without this, save() would SELECT before every INSERT to tell new from existing. */
  @Transient
  @Builder.Default
  private boolean isNew = true;

  @Override
  public boolean isNew() {
    return isNew;
  }

  @PostLoad
  @PostPersist
  void markStored() {
    isNew = false;
  }
}
