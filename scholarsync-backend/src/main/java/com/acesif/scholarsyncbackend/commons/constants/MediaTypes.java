package com.acesif.scholarsyncbackend.commons.constants;

/** Export media types that Spring's MediaType does not define. */
public final class MediaTypes {

  private MediaTypes() {}

  public static final String TEXT_MARKDOWN = "text/markdown";
  public static final String APPLICATION_BIBTEX = "application/x-bibtex";
  public static final String TEXT_MARKDOWN_UTF8 = TEXT_MARKDOWN + "; charset=UTF-8";
  public static final String APPLICATION_BIBTEX_UTF8 = APPLICATION_BIBTEX + "; charset=UTF-8";
}
