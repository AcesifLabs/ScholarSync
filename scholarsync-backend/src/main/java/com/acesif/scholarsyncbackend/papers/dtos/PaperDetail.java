package com.acesif.scholarsyncbackend.papers.dtos;

import com.acesif.scholarsyncbackend.papers.entities.PaperAuthor;

import java.util.List;
import java.util.Map;

public record PaperDetail(
        String id,
        String title,
        List<PaperAuthor> authors,
        Integer year,
        String venue,
        String abstractText,
        Integer citationCount,
        Integer referenceCount,
        List<String> fieldsOfStudy,
        List<String> publicationTypes,
        Map<String, Object> externalIds,
        boolean openAccess,
        boolean hasPdf,
        /** Sources that contributed to this record, e.g. openalex, crossref. */
        List<String> sources,
        /** True only for the signed-in user who uploaded the PDF; they may remove it until it is annotated. */
        boolean pdfUploadedByYou
) {
  /** Keys of {@link #externalIds}; the frontend's EXTERNAL_ID keys mirror these. */
  public static final String ID_DOI = "DOI";
  public static final String ID_ARXIV = "ArXiv";
  public static final String ID_PUBMED = "PubMed";
  public static final String ID_OPENALEX = "OpenAlex";
}
