package com.acesif.scholarsyncbackend.commons.utils;

/** Free-text search input as the source clients can send it. */
public final class SearchText {

  private SearchText() {}

  /** Braces would be read as URI template variables by the source clients and carry no search meaning. */
  public static String plain(String q) {
    String text = q.replace("{", " ").replace("}", " ").trim();
    if (text.isEmpty()) throw new IllegalArgumentException("q must contain search text");
    return text;
  }
}
