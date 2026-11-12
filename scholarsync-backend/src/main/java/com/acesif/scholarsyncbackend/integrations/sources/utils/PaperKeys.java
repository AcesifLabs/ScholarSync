package com.acesif.scholarsyncbackend.integrations.sources.utils;

import com.acesif.scholarsyncbackend.integrations.sources.dtos.SourceRecord;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.Arrays;
import java.util.Base64;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Identifier normalization and the paper id scheme: {@code doi:<doi>}, else {@code arxiv:<id>}, {@code pmid:<id>} or
 * {@code openalex:W…}. A '/' becomes '~' because Tomcat and Spring Security reject %2F in a path segment. A DOI with a
 * character the firewall rejects (';', '%', '\\'), a '~' of its own or anything outside printable ASCII is written
 * {@code doi64:<base64url>} instead, so every id fits in one URL path segment and reads back exactly.
 */
public final class PaperKeys {

  public enum Type {
    DOI("doi"), ARXIV("arxiv"), PMID("pmid"), OPENALEX("openalex");

    public final String prefix;

    Type(String prefix) {
      this.prefix = prefix;
    }

    /** "doi:10.1/x"-style key, used to index papers by identifier in memory (not the URL-safe paper id). */
    public String key(String value) {
      return prefix + ":" + value;
    }
  }

  /** Prefix of arXiv's own DataCite DOIs: 10.48550/arxiv.{id}. */
  public static final String ARXIV_DOI_PREFIX = "10.48550/arxiv.";
  private static final String DOI64 = "doi64";

  public record Key(Type type, String value) {}

  private static final Pattern DOI_PREFIX = Pattern.compile("^(https?://(dx\\.)?doi\\.org/|doi:)", Pattern.CASE_INSENSITIVE);
  private static final Pattern ARXIV_DOI = Pattern.compile("^" + Pattern.quote(ARXIV_DOI_PREFIX) + "(.+)$");
  /** Characters a DOI may keep in a plain doi: id; see the class comment. */
  private static final Pattern ID_SAFE = Pattern.compile("[!-~&&[^;%\\\\~]]+");
  private static final Pattern ARXIV_PREFIX = Pattern.compile("^(https?://(export\\.)?arxiv\\.org/(abs|pdf)/|arxiv:)", Pattern.CASE_INSENSITIVE);
  private static final Pattern ARXIV_URL = Pattern.compile("arxiv\\.org/(?:abs|pdf)/([^?#]+?)(?:\\.pdf)?(?:[?#].*)?$", Pattern.CASE_INSENSITIVE);
  private static final Pattern VERSION = Pattern.compile("v\\d+$");
  private static final Pattern DIGITS = Pattern.compile("(\\d+)/?$");
  private static final Pattern OPENALEX = Pattern.compile("(W\\d+)$", Pattern.CASE_INSENSITIVE);
  private static final Pattern OPENALEX_AUTHOR = Pattern.compile("(A\\d+)$", Pattern.CASE_INSENSITIVE);

  private PaperKeys() {}

  /** Lowercase DOI without resolver prefix, or null if it is not a DOI (including empty, "." or ".." path segments). */
  public static String doi(String raw) {
    if (raw == null) return null;
    String doi = DOI_PREFIX.matcher(raw.trim()).replaceFirst("").toLowerCase(Locale.ROOT);
    if (!doi.startsWith("10.") || doi.indexOf('/') <= 3) return null;
    boolean badSegment = Arrays.stream(doi.split("/", -1)).anyMatch(s -> s.isEmpty() || s.equals(".") || s.equals(".."));
    return badSegment ? null : doi;
  }

  public static String arxivDoi(String arxivId) {
    return ARXIV_DOI_PREFIX + arxivId;
  }

  /** arXiv's own DataCite DOI (10.48550/arxiv.X) names the preprint; returns X or null. */
  public static String arxivFromDoi(String doi) {
    if (doi == null) return null;
    Matcher m = ARXIV_DOI.matcher(doi);
    return m.matches() ? arxiv(m.group(1)) : null;
  }

  /** arXiv id without version suffix, from an id, an arxiv: key or an abs/pdf URL. */
  public static String arxiv(String raw) {
    if (raw == null || raw.isBlank()) return null;
    String id = ARXIV_PREFIX.matcher(raw.trim()).replaceFirst("");
    return VERSION.matcher(id).replaceFirst("").toLowerCase(Locale.ROOT);
  }

  /** arXiv id if {@code url} is an arxiv.org abs or pdf link, else null. */
  public static String arxivFromUrl(String url) {
    if (url == null) return null;
    Matcher m = ARXIV_URL.matcher(url);
    return m.find() ? arxiv(m.group(1)) : null;
  }

  /** Digits of a PMID, from a bare id or a pubmed URL. */
  public static String pmid(String raw) {
    if (raw == null) return null;
    Matcher m = DIGITS.matcher(raw.trim());
    return m.find() ? m.group(1) : null;
  }

  /** "W123" from a bare id or https://openalex.org/W123. */
  public static String openalex(String raw) {
    if (raw == null) return null;
    Matcher m = OPENALEX.matcher(raw.trim());
    return m.find() ? m.group(1).toUpperCase(Locale.ROOT) : null;
  }

  /** "A123" from a bare id or https://openalex.org/A123. */
  public static String openalexAuthor(String raw) {
    if (raw == null) return null;
    Matcher m = OPENALEX_AUTHOR.matcher(raw.trim());
    return m.find() ? m.group(1).toUpperCase(Locale.ROOT) : null;
  }

  /** The id for a paper with these (normalized) identifiers, or null when it has none. */
  public static String idFor(String doi, String arxivId, String pmid, String openalexId) {
    if (doi != null) {
      if (!ID_SAFE.matcher(doi).matches()) {
        return DOI64 + ":" + Base64.getUrlEncoder().withoutPadding().encodeToString(doi.getBytes(StandardCharsets.UTF_8));
      }
      return Type.DOI.key(doi.replace('/', '~'));
    }
    if (arxivId != null) return Type.ARXIV.key(arxivId.replace('/', '~'));
    if (pmid != null) return Type.PMID.key(pmid);
    if (openalexId != null) return Type.OPENALEX.key(openalexId);
    return null;
  }

  public static String idFor(SourceRecord r) {
    return idFor(r.doi(), r.arxivId(), r.pmid(), r.openalexId());
  }

  /** Reads an id built by {@link #idFor}; null for anything else (e.g. legacy Semantic Scholar ids). */
  public static Key parse(String id) {
    int colon = id.indexOf(':');
    if (colon < 0) return null;
    String prefix = id.substring(0, colon);
    String value = prefix.equals(DOI64) ? decode64(id.substring(colon + 1)) : id.substring(colon + 1).replace('~', '/');
    if (value == null) return null;
    return switch (prefix) {
      case "doi", DOI64 -> {
        String doi = doi(value);
        if (doi == null) yield null;
        // arXiv's DataCite DOI names the preprint, which is stored under its arXiv id
        String arxivId = arxivFromDoi(doi);
        yield arxivId != null ? new Key(Type.ARXIV, arxivId) : new Key(Type.DOI, doi);
      }
      case "arxiv" -> value.isBlank() || value.contains("..") ? null : new Key(Type.ARXIV, arxiv(value));
      case "pmid" -> value.matches("\\d{1,12}") ? new Key(Type.PMID, value) : null;
      case "openalex" -> value.matches("(?i)W\\d{1,15}") ? new Key(Type.OPENALEX, value.toUpperCase(Locale.ROOT)) : null;
      default -> null;
    };
  }

  private static String decode64(String value) {
    try {
      return new String(Base64.getUrlDecoder().decode(value), StandardCharsets.UTF_8);
    } catch (IllegalArgumentException e) {
      return null;
    }
  }

  /** Lowercase letters and digits only, single-spaced; for matching titles across sources. */
  public static String title(String raw) {
    if (raw == null) return null;
    String t = Normalizer.normalize(raw, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
            .toLowerCase(Locale.ROOT).replaceAll("[^\\p{L}\\p{N}]+", " ").trim();
    return t.isEmpty() ? null : t;
  }

  /** Strips HTML/JATS tags and collapses whitespace; null when nothing is left. */
  public static String text(String raw) {
    if (raw == null) return null;
    String t = raw.replaceAll("<[^>]+>", " ").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
            .replaceAll("\\s+", " ").trim();
    return t.isEmpty() ? null : t;
  }
}
