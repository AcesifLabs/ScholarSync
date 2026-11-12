package com.acesif.scholarsyncbackend.collections.utils;

import com.acesif.scholarsyncbackend.collections.entities.Collection;
import com.acesif.scholarsyncbackend.collections.entities.CollectionPaper;
import com.acesif.scholarsyncbackend.papers.entities.Paper;
import com.acesif.scholarsyncbackend.papers.entities.PaperAuthor;

import java.text.Normalizer;
import java.util.*;
import java.util.stream.Collectors;

/** Renders a collection as BibTeX or Markdown. Pure functions over loaded entities. */
public final class CollectionExporter {

  private static final String DOI_RESOLVER = "https://doi.org/";

  private CollectionExporter() {}

  public static String bibtex(List<CollectionPaper> entries) {
    Set<String> usedKeys = new HashSet<>();
    StringBuilder out = new StringBuilder();
    for (CollectionPaper entry : entries) {
      Paper p = entry.getPaper();
      String key = uniqueKey(baseKey(p), usedKeys);
      boolean article = p.getVenue() != null && !p.getVenue().isBlank();
      out.append(article ? "@article{" : "@misc{").append(key).append(",\n");
      field(out, "title", p.getTitle());
      List<String> names = authorNames(p);
      if (!names.isEmpty()) field(out, "author", String.join(" and ", names));
      if (p.getYear() != null) field(out, "year", p.getYear().toString());
      if (article) field(out, "journal", p.getVenue());
      String doi = p.getDoi();
      if (doi != null) field(out, "doi", doi);
      if (entry.getNote() != null && !entry.getNote().isBlank()) field(out, "note", entry.getNote());
      out.append("}\n\n");
    }
    return out.toString();
  }

  public static String markdown(Collection collection, List<CollectionPaper> entries) {
    StringBuilder out = new StringBuilder("# ").append(collection.getName()).append("\n\n");
    if (collection.getDescription() != null && !collection.getDescription().isBlank()) {
      out.append(collection.getDescription().strip()).append("\n\n");
    }
    int n = 1;
    for (CollectionPaper entry : entries) {
      Paper p = entry.getPaper();
      out.append(n++).append(". **").append(p.getTitle()).append("**");
      List<String> names = authorNames(p);
      if (!names.isEmpty()) out.append(". ").append(String.join(", ", names));
      if (p.getYear() != null) out.append(" (").append(p.getYear()).append(")");
      if (p.getVenue() != null && !p.getVenue().isBlank()) out.append(". *").append(p.getVenue()).append("*");
      String doi = p.getDoi();
      if (doi != null) out.append(". [doi:").append(doi).append("](").append(DOI_RESOLVER).append(doi).append(")");
      out.append("\n");
      if (entry.getTags() != null && !entry.getTags().isEmpty()) {
        out.append("   Tags: ").append(String.join(", ", entry.getTags())).append("\n");
      }
      if (entry.getNote() != null && !entry.getNote().isBlank()) {
        entry.getNote().strip().lines().forEach(line -> out.append("   > ").append(line).append("\n"));
      }
    }
    return out.toString();
  }

  /** Escapes characters that are special inside a braced BibTeX/LaTeX field. */
  static String escape(String value) {
    StringBuilder out = new StringBuilder();
    for (char c : value.toCharArray()) {
      switch (c) {
        case '\\' -> out.append("\\textbackslash{}");
        case '{', '}', '&', '%', '$', '#', '_' -> out.append('\\').append(c);
        case '~' -> out.append("\\textasciitilde{}");
        case '^' -> out.append("\\textasciicircum{}");
        case '\n', '\r' -> out.append(' ');
        default -> out.append(c);
      }
    }
    return out.toString();
  }

  private static void field(StringBuilder out, String name, String value) {
    out.append("  ").append(name).append(" = {").append(escape(value)).append("},\n");
  }

  private static List<String> authorNames(Paper p) {
    if (p.getAuthors() == null) return List.of();
    return p.getAuthors().stream().map(PaperAuthor::name).filter(Objects::nonNull).map(String::strip)
            .filter(n -> !n.isEmpty()).toList();
  }

  /** e.g. "vaswani2017attention": first author's surname, year, first title word, ASCII only. */
  private static String baseKey(Paper p) {
    List<String> names = authorNames(p);
    String surname = names.isEmpty() ? "anon" : names.getFirst().substring(names.getFirst().lastIndexOf(' ') + 1);
    String firstWord = Arrays.stream(Objects.requireNonNullElse(p.getTitle(), "").split("\\s+"))
            .map(CollectionExporter::ascii).filter(w -> w.length() > 3).findFirst().orElse("paper");
    String key = ascii(surname) + (p.getYear() == null ? "" : p.getYear()) + firstWord;
    return key.isEmpty() ? "paper" : key;
  }

  private static String ascii(String s) {
    return Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("[^A-Za-z0-9]", "").toLowerCase(Locale.ROOT);
  }

  private static String uniqueKey(String base, Set<String> used) {
    String key = base;
    for (char suffix = 'a'; !used.add(key); suffix++) key = base + suffix;
    return key;
  }

  public static String filename(Collection collection, String extension) {
    String slug = ascii(collection.getName());
    return (slug.isEmpty() ? "collection" : slug) + "." + extension;
  }

  public static List<String> normalizeTags(List<String> tags) {
    return tags.stream().map(String::strip).filter(t -> !t.isEmpty()).distinct().collect(Collectors.toCollection(ArrayList::new));
  }
}
