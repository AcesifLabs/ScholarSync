package com.acesif.scholarsyncbackend.papers.repositories;

import com.acesif.scholarsyncbackend.papers.entities.Paper;
import lombok.NonNull;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface PaperRepository extends JpaRepository<@NonNull Paper, @NonNull String> {

  /** Callers pass a non-empty placeholder for an empty collection. */
  @Query("select p from Paper p where p.doi in :dois or p.arxivId in :arxivIds or p.pmid in :pmids or p.openalexId in :openalexIds")
  List<Paper> findByAnyIdentifier(Collection<String> dois, Collection<String> arxivIds, Collection<String> pmids,
                                  Collection<String> openalexIds);

  /** Sets the uploaded PDF only while the paper has none; 0 when another upload or an open-access URL got there first. */
  @Transactional
  @Modifying
  @Query(value = """
          UPDATE papers SET uploaded_pdf_key = :key, uploaded_by = :userId
          WHERE id = :id AND uploaded_pdf_key IS NULL AND open_access_pdf_url IS NULL
          """, nativeQuery = true)
  int attachUpload(String id, String key, UUID userId);

  /** Clears the upload of {@code userId} while nobody has annotated the paper; 0 otherwise. */
  @Transactional
  @Modifying
  @Query(value = """
          UPDATE papers SET uploaded_pdf_key = NULL, uploaded_by = NULL
          WHERE id = :id AND uploaded_by = :userId AND uploaded_pdf_key = :key
            AND NOT EXISTS (SELECT 1 FROM annotations a WHERE a.paper_id = papers.id)
          """, nativeQuery = true)
  int detachUpload(String id, String key, UUID userId);
}
