package com.acesif.scholarsyncbackend.integrations.sources.enums;

import com.acesif.scholarsyncbackend.papers.utils.PaperMerger;

/** Paper sources in field-priority order for bibliographic fields (see PaperMerger). */
public enum Source {
  CROSSREF("crossref"),
  OPENALEX("openalex"),
  EUROPEPMC("europepmc"),
  ARXIV("arxiv"),
  UNPAYWALL("unpaywall"),
  OPENCITATIONS("opencitations");

  /** Stored in papers.sources and search_cache.sources_ok. */
  public final String key;

  Source(String key) {
    this.key = key;
  }
}
