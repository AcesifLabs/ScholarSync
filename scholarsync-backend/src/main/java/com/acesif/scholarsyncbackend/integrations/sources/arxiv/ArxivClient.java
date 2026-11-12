package com.acesif.scholarsyncbackend.integrations.sources.arxiv;

import com.acesif.scholarsyncbackend.integrations.sources.utils.SourceHttpFactory;
import com.acesif.scholarsyncbackend.commons.config.properties.ExternalSourcesProperties;
import com.acesif.scholarsyncbackend.commons.exceptions.UpstreamException;
import com.acesif.scholarsyncbackend.integrations.sources.dtos.*;
import com.acesif.scholarsyncbackend.integrations.sources.enums.*;
import com.acesif.scholarsyncbackend.integrations.sources.utils.*;
import com.acesif.scholarsyncbackend.integrations.sources.enums.PaperSort;
import com.acesif.scholarsyncbackend.integrations.sources.dtos.SearchFilters;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;

/**
 * arXiv export API (Atom). Its terms allow one request every 3 seconds on a single connection; metadata is CC0.
 * Citation counts are unknown here, so citation-sorted searches skip arXiv.
 */
@Service
public class ArxivClient {

  public static final String SERVICE = "arXiv";
  private static final String ATOM = "http://www.w3.org/2005/Atom";
  private static final String ARXIV = "http://arxiv.org/schemas/atom";
  /** Lower bound for an open-ended year range: arXiv has no submissions before it opened in 1991. */
  private static final int FIRST_YEAR = 1991;

  private final SourceHttp http;

  public ArxivClient(ExternalSourcesProperties properties) {
    this.http = SourceHttpFactory.http(SERVICE, properties, properties.getArxiv(), b -> { });
  }

  /** True while an arXiv call is already running; another would wait at least the 3 s spacing. */
  public boolean busy() {
    return http.busy();
  }

  public List<SourceRecord> search(SearchFilters f, PaperSort sort, int limit) {
    List<String> terms = Arrays.stream(f.query().split("[^\\p{L}\\p{N}]+")).filter(t -> !t.isBlank()).map(t -> "all:" + t).toList();
    if (terms.isEmpty()) return List.of();
    StringBuilder query = new StringBuilder(String.join(" AND ", terms));
    if (f.yearFrom() != null || f.yearTo() != null) {
      query.append(" AND submittedDate:[").append(f.yearFrom() == null ? FIRST_YEAR : f.yearFrom()).append("01010000 TO ")
              .append(f.yearTo() == null ? SearchFilters.MAX_YEAR : f.yearTo()).append("12312359]");
    }
    String xml = http.get(b -> b.path("/query").queryParam("search_query", query.toString()).queryParam("start", 0)
            .queryParam("max_results", limit)
            .queryParam("sortBy", sort == PaperSort.RECENT ? "submittedDate" : "relevance")
            .queryParam("sortOrder", "descending").build(), String.class);
    return parse(xml);
  }

  @Cacheable(cacheNames = "arxiv-paper", unless = "#result == null")
  public SourceRecord byId(String arxivId) {
    String xml = http.getOrNull(b -> b.path("/query").queryParam("id_list", arxivId).build(), String.class);
    return xml == null ? null : parse(xml).stream().findFirst().orElse(null);
  }

  static List<SourceRecord> parse(String xml) {
    Document doc;
    try {
      DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
      factory.setNamespaceAware(true);
      factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
      factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
      doc = factory.newDocumentBuilder().parse(new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception e) {
      throw UpstreamException.failed(SERVICE, e);
    }
    List<SourceRecord> records = new ArrayList<>();
    NodeList entries = doc.getElementsByTagNameNS(ATOM, "entry");
    for (int i = 0; i < entries.getLength(); i++) {
      SourceRecord record = toRecord((Element) entries.item(i));
      if (record != null) records.add(record);
    }
    return records;
  }

  private static SourceRecord toRecord(Element entry) {
    String arxivId = PaperKeys.arxivFromUrl(text(entry, ATOM, "id"));
    String title = PaperKeys.text(text(entry, ATOM, "title"));
    if (arxivId == null || title == null) return null; // an id_list miss comes back as an "Error" entry
    String published = text(entry, ATOM, "published");
    List<SourceRecord.Author> authors = new ArrayList<>();
    for (Element author : children(entry, ATOM, "author")) {
      String name = PaperKeys.text(text(author, ATOM, "name"));
      if (name != null) authors.add(new SourceRecord.Author(null, name));
    }
    Set<String> fields = new LinkedHashSet<>();
    for (Element category : children(entry, ATOM, "category")) {
      String field = Vocabulary.fieldForArxivCategory(category.getAttribute("term"));
      if (field != null) fields.add(field);
    }
    String pdf = null;
    for (Element link : children(entry, ATOM, "link")) {
      if ("pdf".equals(link.getAttribute("title"))) pdf = link.getAttribute("href").replaceFirst("^http:", "https:");
    }
    String journalRef = PaperKeys.text(text(entry, ARXIV, "journal_ref"));
    return SourceRecord.builder()
            .sources(EnumSet.of(Source.ARXIV))
            .doi(PaperKeys.doi(text(entry, ARXIV, "doi")))
            .arxivId(arxivId)
            .title(title)
            .authors(authors)
            .year(published != null && published.length() >= 4 ? Integer.valueOf(published.substring(0, 4)) : null)
            .venue(journalRef == null ? SERVICE : journalRef)
            .abstractText(PaperKeys.text(text(entry, ATOM, "summary")))
            .fieldsOfStudy(List.copyOf(fields))
            .publicationTypes(List.of(Vocabulary.PREPRINT))
            .pdfUrl(pdf)
            .build();
  }

  private static List<Element> children(Element parent, String ns, String name) {
    List<Element> out = new ArrayList<>();
    for (Node n = parent.getFirstChild(); n != null; n = n.getNextSibling()) {
      if (n instanceof Element e && ns.equals(e.getNamespaceURI()) && name.equals(e.getLocalName())) out.add(e);
    }
    return out;
  }

  private static String text(Element parent, String ns, String name) {
    List<Element> found = children(parent, ns, name);
    return found.isEmpty() ? null : found.getFirst().getTextContent();
  }
}
