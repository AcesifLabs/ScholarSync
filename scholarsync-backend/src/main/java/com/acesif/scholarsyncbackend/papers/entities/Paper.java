package com.acesif.scholarsyncbackend.papers.entities;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.DynamicUpdate;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.domain.Persistable;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** A paper merged from every source that knows it (ADR 0005). The id comes from {@code PaperKeys.idFor} and never changes. */
@Entity
@Table(name = "papers")
@DynamicUpdate
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Paper implements Persistable<String> {

  @Id
  private String id;

  @Column(nullable = false)
  private String title;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(nullable = false)
  @Builder.Default
  private List<PaperAuthor> authors = new ArrayList<>();

  private Integer year;
  private String venue;

  @Column(name = "abstract")
  private String abstractText;

  private Integer citationCount;
  private Integer referenceCount;

  @JdbcTypeCode(SqlTypes.ARRAY)
  @Column(nullable = false)
  @Builder.Default
  private List<String> fieldsOfStudy = new ArrayList<>();

  @JdbcTypeCode(SqlTypes.ARRAY)
  @Column(nullable = false)
  @Builder.Default
  private List<String> publicationTypes = new ArrayList<>();

  private String openAccessPdfUrl;

  @JdbcTypeCode(SqlTypes.JSON)
  private Map<String, Object> externalIds;

  private String doi;
  private String arxivId;
  private String pmid;
  private String openalexId;

  /** Sources that contributed to this record, e.g. openalex, crossref. */
  @JdbcTypeCode(SqlTypes.ARRAY)
  @Column(nullable = false)
  @Builder.Default
  private List<String> sources = new ArrayList<>();

  /** Written only by PaperRepository's conditional updates, so a stale entity save can never undo an upload. */
  @Column(updatable = false)
  private String uploadedPdfKey;
  @Column(updatable = false)
  private UUID uploadedBy;

  @Column(nullable = false)
  private Instant fetchedAt;

  /** Ids are assigned, not generated: without this, save() would SELECT before every INSERT to tell new from existing. */
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
