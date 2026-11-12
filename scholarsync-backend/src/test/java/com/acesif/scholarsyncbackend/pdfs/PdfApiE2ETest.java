package com.acesif.scholarsyncbackend.pdfs;

import com.acesif.scholarsyncbackend.commons.config.properties.ExternalSourcesProperties;
import com.acesif.scholarsyncbackend.commons.config.properties.StorageProperties;
import com.acesif.scholarsyncbackend.commons.config.properties.PdfProperties;
import com.acesif.scholarsyncbackend.papers.entities.Paper;
import com.acesif.scholarsyncbackend.papers.repositories.PaperRepository;
import com.acesif.scholarsyncbackend.support.E2ETestBase;
import com.acesif.scholarsyncbackend.users.entities.User;
import io.minio.ListObjectsArgs;
import io.minio.MinioClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.stream.StreamSupport;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.assertj.core.api.Assertions.assertThat;

class PdfApiE2ETest extends E2ETestBase {

  private static final byte[] SMALL_PDF = "%PDF-1.4\n% tiny test document\n%%EOF\n".getBytes(StandardCharsets.US_ASCII);

  @Autowired
  private PaperRepository paperRepository;

  @Autowired
  private ExternalSourcesProperties externalSources;

  @Autowired
  private PdfProperties pdfProperties;

  @Autowired
  private StorageProperties storage;

  @Autowired
  private MinioClient minio;

  private String token;

  @BeforeEach
  void setUp() {
    token = tokenFor(createUser("Reader"));
  }

  /** A stored paper, saved to the reader's library so the reader may upload its PDF. */
  private String paper(String openAccessUrl) {
    String id = uniqueId("pdf");
    paperRepository.save(Paper.builder().id(id).title("PDF paper").openAccessPdfUrl(openAccessUrl).fetchedAt(Instant.now()).build());
    assertThat(status(apiPut("/api/v1/library/" + id, token, null))).isEqualTo(200);
    return id;
  }

  private long storedObjects() {
    return StreamSupport.stream(minio.listObjects(ListObjectsArgs.builder().bucket(storage.getBucket()).recursive(true).build())
            .spliterator(), false).count();
  }

  private ResponseEntity<byte[]> download(String paperId, String authToken) {
    RestClient.RequestHeadersSpec<?> spec = RestClient.create("http://localhost:" + port + "/scholarsync-api")
            .get().uri("/api/v1/papers/" + paperId + "/pdf");
    if (authToken != null) spec.header(HttpHeaders.COOKIE, "auth_token=" + authToken);
    return spec.exchange((req, res) -> ResponseEntity.status(res.getStatusCode()).headers(res.getHeaders())
            .body(res.getBody().readAllBytes()), true);
  }

  private ResponseEntity<String> upload(String paperId, String authToken, byte[] content, String filename) {
    LinkedMultiValueMap<String, Object> form = new LinkedMultiValueMap<>();
    if (content != null) {
      form.add("file", new ByteArrayResource(content) {
        @Override
        public String getFilename() {
          return filename;
        }
      });
    } else {
      form.add("other", "nothing");
    }
    RestClient.RequestBodySpec spec = RestClient.create("http://localhost:" + port + "/scholarsync-api")
            .post().uri("/api/v1/papers/" + paperId + "/pdf").contentType(MediaType.MULTIPART_FORM_DATA);
    if (authToken != null) spec.header(HttpHeaders.COOKIE, "auth_token=" + authToken);
    return spec.body(form).exchange((req, res) -> ResponseEntity.status(res.getStatusCode())
            .body(new String(res.getBody().readAllBytes())), true);
  }

  @Test
  void downloadRequiresLogin() {
    String id = paper(SOURCES.baseUrl() + "/pdfs/a.pdf");
    assertThat(download(id, null).getStatusCode().value()).isEqualTo(401);
  }

  @Test
  void openAccessPdfIsProxied() {
    SOURCES.stubFor(get(urlPathEqualTo("/pdfs/ok.pdf")).willReturn(aResponse().withStatus(200)
            .withHeader("Content-Type", "application/octet-stream").withBody(SMALL_PDF)));
    String id = paper(SOURCES.baseUrl() + "/pdfs/ok.pdf");

    ResponseEntity<byte[]> res = download(id, token);

    assertThat(res.getStatusCode().value()).isEqualTo(200);
    assertThat(res.getHeaders().getContentType()).isEqualTo(MediaType.APPLICATION_PDF);
    assertThat(res.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION)).startsWith("inline");
    assertThat(res.getBody()).isEqualTo(SMALL_PDF);
  }

  @Test
  void redirectsAreFollowed() {
    SOURCES.stubFor(get(urlPathEqualTo("/doi/x")).willReturn(aResponse().withStatus(302).withHeader("Location", "/pdfs/final.pdf")));
    SOURCES.stubFor(get(urlPathEqualTo("/pdfs/final.pdf")).willReturn(aResponse().withStatus(200).withBody(SMALL_PDF)));
    String id = paper(SOURCES.baseUrl() + "/doi/x");

    assertThat(download(id, token).getBody()).isEqualTo(SMALL_PDF);
  }

  @Test
  void redirectLoopIs502() {
    SOURCES.stubFor(get(urlPathEqualTo("/loop")).willReturn(aResponse().withStatus(302).withHeader("Location", "/loop")));
    assertThat(download(paper(SOURCES.baseUrl() + "/loop"), token).getStatusCode().value()).isEqualTo(502);
  }

  @Test
  void publisherReturningHtmlIs502() {
    SOURCES.stubFor(get(urlPathEqualTo("/pdfs/paywall")).willReturn(aResponse().withStatus(200)
            .withHeader("Content-Type", "text/html").withBody("<html>Sign in to read</html>")));
    assertThat(download(paper(SOURCES.baseUrl() + "/pdfs/paywall"), token).getStatusCode().value()).isEqualTo(502);
  }

  @Test
  void publisherErrorIs502() {
    SOURCES.stubFor(get(urlPathEqualTo("/pdfs/gone")).willReturn(aResponse().withStatus(404)));
    assertThat(download(paper(SOURCES.baseUrl() + "/pdfs/gone"), token).getStatusCode().value()).isEqualTo(502);
  }

  @Test
  void publisherPdfOverTheLimitIs502() {
    byte[] big = new byte[4096];
    System.arraycopy(SMALL_PDF, 0, big, 0, 5);
    SOURCES.stubFor(get(urlPathEqualTo("/pdfs/big.pdf")).willReturn(aResponse().withStatus(200)
            .withHeader("Content-Length", String.valueOf(big.length)).withBody(big)));
    assertThat(download(paper(SOURCES.baseUrl() + "/pdfs/big.pdf"), token).getStatusCode().value()).isEqualTo(502);
  }

  @Test
  void chunkedPdfOverTheLimitIsCutOff() {
    byte[] big = new byte[4096];
    System.arraycopy(SMALL_PDF, 0, big, 0, 5);
    SOURCES.stubFor(get(urlPathEqualTo("/pdfs/chunked.pdf")).willReturn(aResponse().withStatus(200).withBody(big)));
    String id = paper(SOURCES.baseUrl() + "/pdfs/chunked.pdf");

    // Without Content-Length the limit trips mid-stream: the client never receives the full oversized body.
    try {
      ResponseEntity<byte[]> res = download(id, token);
      assertThat(res.getStatusCode().value() != 200 || res.getBody().length < big.length).isTrue();
    } catch (org.springframework.web.client.ResourceAccessException aborted) {
      // connection reset is also an acceptable outcome
    }
  }

  @Test
  void nonHttpUrlIs502() {
    assertThat(download(paper("file:///etc/passwd"), token).getStatusCode().value()).isEqualTo(502);
  }

  @Test
  void paperWithoutPdfIs404AndUnknownPaperIs404() {
    assertThat(download(paper(null), token).getStatusCode().value()).isEqualTo(404);
    assertThat(download(paperKey("unknown"), token).getStatusCode().value()).isEqualTo(404);
  }

  @Test
  void uploadThenDownloadReturnsTheSameBytes() {
    String id = paper(null);

    assertThat(upload(id, token, SMALL_PDF, "paper.pdf").getStatusCode().value()).isEqualTo(201);

    ResponseEntity<byte[]> res = download(id, token);
    assertThat(res.getStatusCode().value()).isEqualTo(200);
    assertThat(res.getBody()).isEqualTo(SMALL_PDF);
    assertThat(json(apiGet("/api/v1/papers/" + id, null)).get("hasPdf").asBoolean()).isTrue();
    assertThat(paperRepository.findById(id).orElseThrow().getUploadedBy()).isNotNull();
    // only the uploader is told they may remove it
    assertThat(json(apiGet("/api/v1/papers/" + id, token)).get("pdfUploadedByYou").asBoolean()).isTrue();
    assertThat(json(apiGet("/api/v1/papers/" + id, tokenFor(createUser("Other")))).get("pdfUploadedByYou").asBoolean()).isFalse();
    assertThat(json(apiGet("/api/v1/papers/" + id, null)).get("pdfUploadedByYou").asBoolean()).isFalse();
  }

  @Test
  void uploadRequiresLogin() {
    assertThat(upload(paper(null), null, SMALL_PDF, "a.pdf").getStatusCode().value()).isEqualTo(401);
  }

  @Test
  void nonPdfUploadIs415EvenWithPdfExtension() {
    String id = paper(null);
    assertThat(upload(id, token, "PK\u0003\u0004 zip file".getBytes(), "fake.pdf").getStatusCode().value()).isEqualTo(415);
    assertThat(paperRepository.findById(id).orElseThrow().getUploadedPdfKey()).isNull();
  }

  @Test
  void oversizeUploadIs413() {
    byte[] big = Arrays.copyOf(SMALL_PDF, 6 * 1024);
    assertThat(upload(paper(null), token, big, "big.pdf").getStatusCode().value()).isEqualTo(413);
  }

  @Test
  void emptyOrMissingFileIs400() {
    String id = paper(null);
    assertThat(upload(id, token, new byte[0], "empty.pdf").getStatusCode().value()).isEqualTo(400);
    assertThat(upload(id, token, null, null).getStatusCode().value()).isEqualTo(400);
  }

  @Test
  void uploadIsRejectedWhenAPdfAlreadyExists() {
    String uploaded = paper(null);
    upload(uploaded, token, SMALL_PDF, "first.pdf");
    assertThat(upload(uploaded, token, SMALL_PDF, "second.pdf").getStatusCode().value()).isEqualTo(409);
    assertThat(upload(paper(SOURCES.baseUrl() + "/pdfs/oa.pdf"), token, SMALL_PDF, "x.pdf").getStatusCode().value()).isEqualTo(409);
  }

  @Test
  void uploadForUnknownPaperIs404() {
    assertThat(upload(paperKey("nobody"), token, SMALL_PDF, "x.pdf").getStatusCode().value()).isEqualTo(404);
  }

  @Test
  void aPaperWithoutAPdfIsServedFromUnpaywallWhenEnabled() {
    String doi = TEST_DOI_PREFIX + "unpaywall-pdf-" + UUID.randomUUID();
    String id = "doi:" + doi.replace('/', '~');
    paperRepository.save(Paper.builder().id(id).doi(doi).title("Via Unpaywall").fetchedAt(Instant.now()).build());
    SOURCES.stubFor(get(urlPathEqualTo("/unpaywall/v2/" + doi)).willReturn(okJson(
            "{\"best_oa_location\":{\"url_for_pdf\":\"" + SOURCES.baseUrl() + "/pdfs/unpaywall.pdf\"}}")));
    SOURCES.stubFor(get(urlPathEqualTo("/pdfs/unpaywall.pdf")).willReturn(aResponse().withStatus(200).withBody(SMALL_PDF)));

    assertThat(download(id, token).getStatusCode().value()).isEqualTo(404);
    externalSources.getUnpaywall().setEnabled(true);
    try {
      ResponseEntity<byte[]> res = download(id, token);

      assertThat(res.getStatusCode().value()).isEqualTo(200);
      assertThat(res.getBody()).isEqualTo(SMALL_PDF);
    } finally {
      externalSources.getUnpaywall().setEnabled(false);
    }
  }

  @Test
  void uploadNeedsThePaperInYourLibraryOrAGroupWhereYouCanPost() {
    String id = uniqueId("pdf");
    paperRepository.save(Paper.builder().id(id).title("Not saved").fetchedAt(Instant.now()).build());
    assertThat(status(upload(id, token, SMALL_PDF, "a.pdf"))).isEqualTo(403);

    User owner = createUser("GroupOwner");
    User reader = createUser("GroupReader");
    String ownerT = tokenFor(owner);
    String readerT = tokenFor(reader);
    String group = "/api/v1/groups/" + json(apiPost("/api/v1/groups", ownerT, Map.of("name", "PDF club"))).get("id").asString();
    apiPost(group + "/members", ownerT, Map.of("email", reader.getEmail(), "role", "VIEWER"));
    assertThat(status(apiPost(group + "/papers", ownerT, Map.of("paperId", id)))).isEqualTo(200);

    assertThat(status(upload(id, readerT, SMALL_PDF, "a.pdf"))).as("viewer").isEqualTo(403);
    apiPatch(group + "/members/" + reader.getId(), ownerT, Map.of("role", "MEMBER"));
    assertThat(status(upload(id, readerT, SMALL_PDF, "a.pdf"))).as("member").isEqualTo(201);
    assertThat(paperRepository.findById(id).orElseThrow().getUploadedBy()).isEqualTo(reader.getId());
  }

  @Test
  void concurrentUploadsStoreExactlyOnePdf() throws Exception {
    String id = paper(null);
    long before = storedObjects();
    List<Callable<Integer>> uploads = new ArrayList<>();
    for (int i = 0; i < 4; i++) uploads.add(() -> status(upload(id, token, SMALL_PDF, "race.pdf")));
    ExecutorService pool = Executors.newFixedThreadPool(4);
    List<Integer> statuses = new ArrayList<>();
    try {
      for (Future<Integer> f : pool.invokeAll(uploads)) statuses.add(f.get());
    } finally {
      pool.shutdown();
    }

    assertThat(statuses).containsOnly(201, 409);
    assertThat(statuses).filteredOn(s -> s == 201).hasSize(1);
    // the losers' objects were deleted again
    assertThat(storedObjects()).isEqualTo(before + 1);
    assertThat(download(id, token).getBody()).isEqualTo(SMALL_PDF);
  }

  @Test
  void theUploaderCanRemoveTheirUploadUntilThePaperIsAnnotated() {
    String id = paper(null);
    String path = "/api/v1/papers/" + id + "/pdf";
    assertThat(status(apiDelete(path, token))).as("nothing uploaded").isEqualTo(404);
    long before = storedObjects();
    upload(id, token, SMALL_PDF, "mine.pdf");

    assertThat(status(apiDelete(path, null))).isEqualTo(401);
    assertThat(status(apiDelete(path, tokenFor(createUser("Stranger"))))).isEqualTo(403);
    assertThat(status(apiDelete(path, token))).isEqualTo(204);
    assertThat(download(id, token).getStatusCode().value()).isEqualTo(404);
    assertThat(storedObjects()).isEqualTo(before);

    upload(id, token, SMALL_PDF, "again.pdf");
    Map<String, Object> annotation = Map.of("visibility", "PRIVATE", "color", "YELLOW",
            "position", Map.of("pageNumber", 1, "boundingRect", Map.of("y1", 5), "rects", List.of()));
    assertThat(status(apiPost("/api/v1/papers/" + id + "/annotations", token, annotation))).isEqualTo(201);
    assertThat(status(apiDelete(path, token))).isEqualTo(409);
    assertThat(download(id, token).getBody()).isEqualTo(SMALL_PDF);
  }

  @Test
  void privateAndLoopbackPublisherUrlsAreRefused() {
    SOURCES.stubFor(get(urlPathEqualTo("/pdfs/internal.pdf")).willReturn(aResponse().withStatus(200).withBody(SMALL_PDF)));
    String id = paper(SOURCES.baseUrl() + "/pdfs/internal.pdf");
    pdfProperties.setAllowPrivateHosts(false);
    try {
      assertThat(download(id, token).getStatusCode().value()).isEqualTo(502);
      assertThat(download(paper("http://169.254.169.254/latest/meta-data"), token).getStatusCode().value()).isEqualTo(502);
      assertThat(download(paper("http://10.0.0.1/a.pdf"), token).getStatusCode().value()).isEqualTo(502);
    } finally {
      pdfProperties.setAllowPrivateHosts(true);
    }
    SOURCES.verify(0, getRequestedFor(urlPathEqualTo("/pdfs/internal.pdf")));
  }

  @Test
  void unavailableStorageIs503() {
    String uploadTarget = paper(null);
    String stored = uniqueId("pdf");
    paperRepository.save(Paper.builder().id(stored).title("Stored").uploadedPdfKey("papers/" + UUID.randomUUID() + ".pdf")
            .fetchedAt(Instant.now()).build());
    String bucket = storage.getBucket();
    storage.setBucket("missing-" + UUID.randomUUID());
    try {
      ResponseEntity<String> res = upload(uploadTarget, token, SMALL_PDF, "x.pdf");
      assertThat(status(res)).isEqualTo(503);
      assertThat(res.getBody()).contains("File storage is unavailable");
      assertThat(download(stored, token).getStatusCode().value()).isEqualTo(503);
    } finally {
      storage.setBucket(bucket);
    }
    assertThat(paperRepository.findById(uploadTarget).orElseThrow().getUploadedPdfKey()).isNull();
  }
}
