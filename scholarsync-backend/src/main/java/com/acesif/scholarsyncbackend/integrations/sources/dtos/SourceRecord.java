package com.acesif.scholarsyncbackend.integrations.sources.dtos;

import com.acesif.scholarsyncbackend.integrations.sources.utils.PaperKeys;
import com.acesif.scholarsyncbackend.integrations.sources.enums.Source;
import lombok.Builder;

import java.util.List;
import java.util.Set;

/**
 * One paper as a source describes it, or the merge of several (then {@code sources} has more than one entry).
 * Identifiers are normalized by PaperKeys; any field may be null and lists may be empty.
 */
@Builder(toBuilder = true)
public record SourceRecord(
        Set<Source> sources,
        String doi,
        String arxivId,
        String pmid,
        String openalexId,
        String title,
        List<Author> authors,
        Integer year,
        String venue,
        String abstractText,
        Integer citationCount,
        Integer referenceCount,
        List<String> fieldsOfStudy,
        List<String> publicationTypes,
        String pdfUrl,
        /** OpenAlex W-ids this paper cites; only OpenAlex fills it. */
        List<String> referencedWorks
) {
  /** {@code id} is an OpenAlex author id (A…) when known. */
  public record Author(String id, String name) {
    /** Some sources send "Family, Given"; show every name as "Given Family". */
    public Author {
      if (name != null) {
        int comma = name.indexOf(',');
        if (comma > 0 && comma == name.lastIndexOf(',') && comma < name.length() - 1 && !name.substring(comma + 1).isBlank()) {
          name = name.substring(comma + 1).strip() + " " + name.substring(0, comma).strip();
        }
      }
    }
  }
}
