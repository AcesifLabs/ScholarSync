package com.acesif.scholarsyncbackend.integrations.sources.utils;

import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Shared field-of-study and publication-type names. Fields are OpenAlex's 26 top-level fields (the frontend lists
 * the same names); types are OpenAlex's work types, which other sources are mapped onto.
 */
public final class Vocabulary {

  private Vocabulary() {}

  /** Field name to OpenAlex field id (https://openalex.org/fields/{id}). */
  public static final Map<String, Integer> FIELDS = Map.ofEntries(
          Map.entry("Agricultural and Biological Sciences", 11),
          Map.entry("Arts and Humanities", 12),
          Map.entry("Biochemistry, Genetics and Molecular Biology", 13),
          Map.entry("Business, Management and Accounting", 14),
          Map.entry("Chemical Engineering", 15),
          Map.entry("Chemistry", 16),
          Map.entry("Computer Science", 17),
          Map.entry("Decision Sciences", 18),
          Map.entry("Earth and Planetary Sciences", 19),
          Map.entry("Economics, Econometrics and Finance", 20),
          Map.entry("Energy", 21),
          Map.entry("Engineering", 22),
          Map.entry("Environmental Science", 23),
          Map.entry("Immunology and Microbiology", 24),
          Map.entry("Materials Science", 25),
          Map.entry("Mathematics", 26),
          Map.entry("Medicine", 27),
          Map.entry("Neuroscience", 28),
          Map.entry("Nursing", 29),
          Map.entry("Pharmacology, Toxicology and Pharmaceutics", 30),
          Map.entry("Physics and Astronomy", 31),
          Map.entry("Psychology", 32),
          Map.entry("Social Sciences", 33),
          Map.entry("Veterinary", 34),
          Map.entry("Dentistry", 35),
          Map.entry("Health Professions", 36));

  /** Field id to name, the inverse of {@link #FIELDS}; the API takes ids because four names contain commas. */
  public static final Map<Integer, String> FIELD_NAMES = FIELDS.entrySet().stream()
          .collect(java.util.stream.Collectors.toUnmodifiableMap(Map.Entry::getValue, Map.Entry::getKey));

  public static final String ARTICLE = "article";
  public static final String PREPRINT = "preprint";
  public static final String REVIEW = "review";
  public static final String BOOK = "book";
  public static final String BOOK_CHAPTER = "book-chapter";
  public static final String DATASET = "dataset";
  public static final String DISSERTATION = "dissertation";
  public static final String EDITORIAL = "editorial";
  public static final String LETTER = "letter";
  public static final String REPORT = "report";
  public static final String OTHER = "other";

  /** Publication types; the frontend's PUBLICATION_TYPES mirrors this list. */
  public static final List<String> TYPES = List.of(
          ARTICLE, PREPRINT, REVIEW, BOOK, BOOK_CHAPTER, DATASET, DISSERTATION, EDITORIAL, LETTER, REPORT, OTHER);

  /** Top-level arXiv archive (the part before the first '.' or '-') to field. */
  private static final Map<String, String> ARXIV_ARCHIVES = Map.ofEntries(
          Map.entry("cs", "Computer Science"),
          Map.entry("math", "Mathematics"),
          Map.entry("stat", "Mathematics"),
          Map.entry("physics", "Physics and Astronomy"),
          Map.entry("astro", "Physics and Astronomy"),
          Map.entry("cond", "Physics and Astronomy"),
          Map.entry("gr", "Physics and Astronomy"),
          Map.entry("hep", "Physics and Astronomy"),
          Map.entry("nucl", "Physics and Astronomy"),
          Map.entry("quant", "Physics and Astronomy"),
          Map.entry("nlin", "Physics and Astronomy"),
          Map.entry("q", "Biochemistry, Genetics and Molecular Biology"),
          Map.entry("econ", "Economics, Econometrics and Finance"),
          Map.entry("eess", "Engineering"));

  /** cs.LG to Computer Science, q-fin.ST to Economics…, unknown categories to null. */
  public static String fieldForArxivCategory(String category) {
    if (category == null) return null;
    if (category.startsWith("q-fin")) return "Economics, Econometrics and Finance";
    String archive = category.split("[.-]", 2)[0].toLowerCase(Locale.ROOT);
    return ARXIV_ARCHIVES.get(archive);
  }

  public static String typeFromOpenAlex(String type) {
    if (type == null) return null;
    return TYPES.contains(type) ? type : OTHER;
  }

  public static String typeFromCrossref(String type) {
    if (type == null) return null;
    return switch (type) {
      case "journal-article", "proceedings-article" -> ARTICLE;
      case "posted-content" -> PREPRINT;
      case "book", "monograph", "edited-book", "reference-book" -> BOOK;
      case "book-chapter", "book-section", "book-part" -> BOOK_CHAPTER;
      case "dataset" -> DATASET;
      case "dissertation" -> DISSERTATION;
      case "report" -> REPORT;
      default -> OTHER;
    };
  }

  /** Europe PMC pubType values such as "review", "research-article", "Journal Article", "Preprint". */
  public static String typeFromEuropePmc(String pubType) {
    if (pubType == null) return null;
    String t = pubType.toLowerCase(Locale.ROOT);
    if (t.contains("preprint")) return PREPRINT;
    if (t.contains("review")) return REVIEW;
    if (t.contains("editorial")) return EDITORIAL;
    if (t.contains("letter")) return LETTER;
    if (t.contains("article")) return ARTICLE;
    return null;
  }
}
