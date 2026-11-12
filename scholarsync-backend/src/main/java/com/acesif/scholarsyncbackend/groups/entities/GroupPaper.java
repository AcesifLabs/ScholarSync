package com.acesif.scholarsyncbackend.groups.entities;

import com.acesif.scholarsyncbackend.papers.entities.Paper;
import com.acesif.scholarsyncbackend.users.entities.User;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.domain.Persistable;

import java.time.Instant;

@Entity
@Table(name = "group_papers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupPaper implements Persistable<GroupPaperId> {

  @EmbeddedId
  private GroupPaperId id;

  @MapsId("paperId")
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "paper_id")
  private Paper paper;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "added_by")
  private User addedBy;

  @Column(nullable = false, updatable = false)
  private Instant addedAt;

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
