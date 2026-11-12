package com.acesif.scholarsyncbackend.papers.dtos;

import com.acesif.scholarsyncbackend.papers.entities.PaperAuthor;

import java.util.List;

public record PaperSummary(
        String id,
        String title,
        List<PaperAuthor> authors,
        Integer year,
        String venue,
        String abstractText,
        Integer citationCount,
        boolean openAccess,
        List<String> fieldsOfStudy,
        List<String> publicationTypes,
        /** Sources that contributed to this record, e.g. openalex, crossref. */
        List<String> sources,
        /** An open-access or uploaded PDF exists, so the reader can open it. */
        boolean hasPdf
) {}
