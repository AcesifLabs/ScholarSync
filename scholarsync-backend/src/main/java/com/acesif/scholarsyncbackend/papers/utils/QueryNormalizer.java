package com.acesif.scholarsyncbackend.papers.utils;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;

/** Cache keys for search text: accents and punctuation (except + and #) dropped, lowercase, unique tokens sorted. */
public final class QueryNormalizer {

  private QueryNormalizer() {}

  public static String normalize(String query) {
    return String.join(" ", tokens(query));
  }

  /**
   * Tokens that must match exactly between two queries: ones with a digit ("bert 2019" never answers "bert 2020") or a
   * '+'/'#' ("c++" never answers "c"; pg_trgm ignores those symbols when it compares).
   */
  public static Set<String> exactTokens(String normalized) {
    return Arrays.stream(normalized.split(" "))
            .filter(t -> t.chars().anyMatch(c -> Character.isDigit(c) || c == '+' || c == '#'))
            .collect(Collectors.toSet());
  }

  private static TreeSet<String> tokens(String query) {
    String plain = Normalizer.normalize(query, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT);
    // '+' and '#' stay inside tokens: "c++", "c#" and "c" are different topics
    return Arrays.stream(plain.split("[^\\p{L}\\p{N}+#]+")).filter(t -> !t.isEmpty()).collect(Collectors.toCollection(TreeSet::new));
  }
}
