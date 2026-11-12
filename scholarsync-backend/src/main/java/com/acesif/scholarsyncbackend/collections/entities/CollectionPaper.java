package com.acesif.scholarsyncbackend.collections.entities;

import com.acesif.scholarsyncbackend.papers.entities.Paper;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.domain.Persistable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "collection_papers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CollectionPaper implements Persistable<CollectionPaperId> {

  @EmbeddedId
  private CollectionPaperId id;

  @MapsId("paperId")
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "paper_id")
  private Paper paper;

  @Column(nullable = false)
  private int position;

  private String note;

  @JdbcTypeCode(SqlTypes.ARRAY)
  @Column(nullable = false)
  @Builder.Default
  private List<String> tags = new ArrayList<>();

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
