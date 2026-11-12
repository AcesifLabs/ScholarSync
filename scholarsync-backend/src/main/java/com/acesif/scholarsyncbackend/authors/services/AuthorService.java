package com.acesif.scholarsyncbackend.authors.services;

import com.acesif.scholarsyncbackend.authors.dtos.AuthorPapersResponse;
import com.acesif.scholarsyncbackend.authors.dtos.AuthorSearchResponse;
import com.acesif.scholarsyncbackend.authors.dtos.AuthorSummary;
import com.acesif.scholarsyncbackend.integrations.sources.dtos.ResultPage;
import com.acesif.scholarsyncbackend.integrations.sources.dtos.SourceAuthorProfile;
import com.acesif.scholarsyncbackend.integrations.sources.dtos.SourceRecord;
import com.acesif.scholarsyncbackend.integrations.sources.openalex.OpenAlexClient;
import com.acesif.scholarsyncbackend.papers.services.PaperService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;

/** Researcher search and profiles from OpenAlex. OpenAlex pages by page number, so offsets must be multiples of limit. */
@Service
@RequiredArgsConstructor
public class AuthorService {

  private final OpenAlexClient openAlex;

  public AuthorSearchResponse search(String query, int offset, int limit) {
    if (offset + limit > PaperService.MAX_RESULT_WINDOW) {
      throw new IllegalArgumentException("offset + limit must not exceed " + PaperService.MAX_RESULT_WINDOW);
    }
    ResultPage<SourceAuthorProfile> page = openAlex.searchAuthors(query, pageNumber(offset, limit), limit);
    return new AuthorSearchResponse(page.total(), offset, limit, page.items().stream().map(AuthorService::toSummary).toList());
  }

  public AuthorSummary get(String authorId) {
    SourceAuthorProfile author = openAlex.author(authorId.toUpperCase(Locale.ROOT));
    if (author == null) throw notFound(authorId);
    return toSummary(author);
  }

  public AuthorPapersResponse papers(String authorId, int offset, int limit) {
    String id = authorId.toUpperCase(Locale.ROOT);
    ResultPage<SourceRecord> page = openAlex.authorWorks(id, pageNumber(offset, limit), limit);
    if (page.total() == 0 && openAlex.author(id) == null) throw notFound(authorId);
    Integer next = offset + limit < page.total() ? offset + limit : null;
    return new AuthorPapersResponse(offset, next, page.items().stream().map(PaperService::toSummary).filter(p -> p.id() != null).toList());
  }

  private static AuthorSummary toSummary(SourceAuthorProfile a) {
    return new AuthorSummary(a.id(), a.name(), a.affiliations(), a.paperCount(), a.citationCount(), a.hIndex(), a.url(), a.homepage());
  }

  private static int pageNumber(int offset, int limit) {
    if (offset % limit != 0) throw new IllegalArgumentException("offset must be a multiple of limit");
    return offset / limit + 1;
  }

  private static ResponseStatusException notFound(String authorId) {
    return new ResponseStatusException(HttpStatus.NOT_FOUND, "Author not found: " + authorId);
  }
}
