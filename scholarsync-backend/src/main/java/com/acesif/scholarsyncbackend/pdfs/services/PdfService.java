package com.acesif.scholarsyncbackend.pdfs.services;

import com.acesif.scholarsyncbackend.commons.config.properties.StorageProperties;
import com.acesif.scholarsyncbackend.commons.config.properties.PdfProperties;
import com.acesif.scholarsyncbackend.commons.exceptions.UpstreamException;
import com.acesif.scholarsyncbackend.groups.repositories.GroupPaperRepository;
import com.acesif.scholarsyncbackend.library.entities.LibraryItemId;
import com.acesif.scholarsyncbackend.library.repositories.LibraryItemRepository;
import com.acesif.scholarsyncbackend.papers.entities.Paper;
import com.acesif.scholarsyncbackend.papers.repositories.PaperRepository;
import com.acesif.scholarsyncbackend.papers.services.PaperService;
import com.acesif.scholarsyncbackend.users.entities.User;
import io.minio.GetObjectArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import jakarta.annotation.PostConstruct;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.UUID;

/**
 * Serves a paper's PDF (ADR 0003): an uploaded copy from object storage, else the open-access URL from the merged
 * source metadata (Unpaywall, OpenAlex, Europe PMC, arXiv). The URL never comes from the client. Redirects are followed by hand so every hop is checked against
 * private/loopback addresses.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PdfService {

  private static final byte[] PDF_MAGIC = "%PDF-".getBytes(StandardCharsets.US_ASCII);
  private static final int MAX_REDIRECTS = 5;
  private static final String UPLOAD_PREFIX = "papers/";

  private final PaperService paperService;
  private final PaperRepository paperRepository;
  private final MinioClient minioClient;
  private final StorageProperties storage;
  private final PdfProperties pdfProperties;
  private final LibraryItemRepository libraryItemRepository;
  private final GroupPaperRepository groupPaperRepository;
  private HttpClient http;

  @PostConstruct
  void createClient() {
    http = HttpClient.newBuilder().connectTimeout(pdfProperties.getConnectTimeout()).followRedirects(HttpClient.Redirect.NEVER).build();
  }

  /** An open PDF stream that already passed the magic-byte check. The caller must close it. */
  public record PdfStream(InputStream body, Long contentLength) {}

  public PdfStream open(String paperId) {
    Paper paper = paperService.withUnpaywallPdf(paperService.findOrFetch(paperId));
    if (paper.getUploadedPdfKey() != null) return fromStorage(paper.getUploadedPdfKey());
    if (paper.getOpenAccessPdfUrl() != null) return fromPublisher(paper.getOpenAccessPdfUrl());
    throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No PDF is available for this paper");
  }

  /**
   * Allowed only when the paper has no PDF yet (replacing one would break existing annotation positions), and only for
   * a paper in the uploader's library or in a group library where the uploader is a MEMBER or above: the upload becomes
   * every user's PDF for that paper, so it must come from someone who is reading it. Not one transaction: the upload
   * to storage can take a while and must not hold a database connection meanwhile. Two uploads racing for the same
   * paper are settled by a conditional update; the loser's object is deleted again.
   */
  public void upload(User user, String paperId, MultipartFile file) {
    Paper paper = paperService.findOrFetch(paperId);
    if (!libraryItemRepository.existsById(new LibraryItemId(user.getId(), paper.getId()))
            && !groupPaperRepository.sharedWithWriter(paper.getId(), user.getId())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN,
              "Save the paper to your library or to a group you can post in before uploading its PDF");
    }
    if (paper.getUploadedPdfKey() != null || paper.getOpenAccessPdfUrl() != null) throw alreadyHasPdf();
    if (file.isEmpty()) throw new IllegalArgumentException("The file is empty");
    if (file.getSize() > pdfProperties.getMaxBytes()) {
      throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "PDF exceeds the size limit");
    }

    String key = UPLOAD_PREFIX + UUID.randomUUID() + ".pdf";
    try (InputStream in = new BufferedInputStream(file.getInputStream())) {
      requirePdf(in, HttpStatus.UNSUPPORTED_MEDIA_TYPE);
      minioClient.putObject(PutObjectArgs.builder()
              .bucket(storage.getBucket())
              .object(key)
              .stream(in, file.getSize(), -1)
              .contentType(MediaType.APPLICATION_PDF_VALUE)
              .build());
    } catch (ResponseStatusException e) {
      throw e;
    } catch (Exception e) {
      log.error("PDF upload to object storage failed", e);
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "File storage is unavailable", e);
    }
    if (paperRepository.attachUpload(paper.getId(), key, user.getId()) == 0) {
      removeObject(key);
      throw alreadyHasPdf();
    }
  }

  /**
   * The uploader may take their upload back while nobody has annotated the paper: annotations are positioned on that
   * document, so once there are any the PDF stays.
   */
  public void removeUpload(User user, String paperId) {
    Paper paper = paperService.findOrFetch(paperId);
    String key = paper.getUploadedPdfKey();
    if (key == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "This paper has no uploaded PDF");
    if (!user.getId().equals(paper.getUploadedBy())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the user who uploaded the PDF can remove it");
    }
    if (paperRepository.detachUpload(paper.getId(), key, user.getId()) == 0) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "The PDF has annotations and can no longer be removed");
    }
    removeObject(key);
  }

  /** Best effort: a leftover object only costs storage, so a failure here must not fail the request. */
  private void removeObject(String key) {
    try {
      minioClient.removeObject(RemoveObjectArgs.builder().bucket(storage.getBucket()).object(key).build());
    } catch (Exception e) {
      log.warn("Could not delete {} from object storage: {}", key, e.getMessage());
    }
  }

  private static ResponseStatusException alreadyHasPdf() {
    return new ResponseStatusException(HttpStatus.CONFLICT, "This paper already has a PDF");
  }

  private PdfStream fromStorage(String key) {
    try {
      InputStream in = new BufferedInputStream(minioClient.getObject(GetObjectArgs.builder().bucket(storage.getBucket()).object(key).build()));
      return new PdfStream(in, null);
    } catch (Exception e) {
      log.error("Reading {} from object storage failed", key, e);
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "File storage is unavailable", e);
    }
  }

  private PdfStream fromPublisher(String url) {
    URI uri = URI.create(url);
    try {
      for (int hop = 0; hop <= MAX_REDIRECTS; hop++) {
        requirePublicHttpUri(uri);
        HttpResponse<InputStream> response = http.send(
                HttpRequest.newBuilder(uri).timeout(pdfProperties.getReadTimeout())
                        .header(HttpHeaders.ACCEPT, MediaType.APPLICATION_PDF_VALUE).GET().build(),
                HttpResponse.BodyHandlers.ofInputStream());
        int status = response.statusCode();
        if (status >= 300 && status < 400 && response.headers().firstValue(HttpHeaders.LOCATION).isPresent()) {
          response.body().close();
          uri = uri.resolve(response.headers().firstValue(HttpHeaders.LOCATION).get());
          continue;
        }
        if (status != 200) {
          response.body().close();
          throw new UpstreamException(HttpStatus.BAD_GATEWAY, "The publisher did not return the PDF (HTTP " + status + ")", null);
        }
        long length = response.headers().firstValueAsLong(HttpHeaders.CONTENT_LENGTH).orElse(-1);
        if (length > pdfProperties.getMaxBytes()) {
          response.body().close();
          throw new UpstreamException(HttpStatus.BAD_GATEWAY, "The publisher's PDF exceeds the size limit", null);
        }
        InputStream in = new BufferedInputStream(response.body());
        requirePdf(in, HttpStatus.BAD_GATEWAY);
        return new PdfStream(new LimitedInputStream(in, pdfProperties.getMaxBytes()), length < 0 ? null : length);
      }
      throw new UpstreamException(HttpStatus.BAD_GATEWAY, "Too many redirects fetching the PDF", null);
    } catch (ResponseStatusException e) {
      throw e;
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new UpstreamException(HttpStatus.BAD_GATEWAY, "Fetching the PDF was interrupted", e);
    } catch (IOException | IllegalArgumentException e) {
      log.warn("Fetching PDF from {} failed: {}", uri, e.getMessage());
      throw new UpstreamException(HttpStatus.BAD_GATEWAY, "Could not fetch the PDF from the publisher", e);
    }
  }

  /** Peeks at the first bytes without consuming them. */
  private static void requirePdf(InputStream in, HttpStatus failure) throws IOException {
    in.mark(PDF_MAGIC.length);
    byte[] head = in.readNBytes(PDF_MAGIC.length);
    in.reset();
    if (!Arrays.equals(head, PDF_MAGIC)) {
      if (failure == HttpStatus.BAD_GATEWAY) in.close();
      throw new ResponseStatusException(failure, failure == HttpStatus.BAD_GATEWAY
              ? "The publisher returned something other than a PDF" : "Only PDF files can be uploaded");
    }
  }

  /**
   * Rejects URLs that resolve to an internal address. The HTTP client resolves the host again when it connects, but
   * the JVM caches lookups (networkaddress.cache.ttl, 30 s by default) and ignores the record's own TTL, so both
   * lookups normally return the same address and a short-TTL DNS rebinding answer is not picked up in between.
   * shortcut: a cache expiry falling exactly between check and connect is not covered; pinning the checked address
   * would need a client with a pluggable resolver.
   */
  private void requirePublicHttpUri(URI uri) throws UnknownHostException {
    if (!"https".equalsIgnoreCase(uri.getScheme()) && !"http".equalsIgnoreCase(uri.getScheme())) {
      throw new IllegalArgumentException("Unsupported PDF URL scheme");
    }
    if (pdfProperties.isAllowPrivateHosts()) return;
    for (InetAddress address : InetAddress.getAllByName(uri.getHost())) {
      if (address.isLoopbackAddress() || address.isSiteLocalAddress() || address.isLinkLocalAddress()
              || address.isAnyLocalAddress() || address.isMulticastAddress() || isOtherPrivate(address)) {
        throw new IllegalArgumentException("PDF URL points to a private address");
      }
    }
  }

  /** Ranges InetAddress does not flag: 0.0.0.0/8, carrier-grade NAT 100.64.0.0/10 and IPv6 unique-local fc00::/7. */
  static boolean isOtherPrivate(InetAddress address) {
    byte[] b = address.getAddress();
    if (b.length == 4) return b[0] == 0 || (b[0] == 100 && (b[1] & 0xC0) == 0x40);
    return (b[0] & 0xFE) == 0xFC;
  }

  /** Fails the stream once more than {@code max} bytes have been read (for responses without Content-Length). */
  private static final class LimitedInputStream extends java.io.FilterInputStream {
    private long remaining;

    LimitedInputStream(InputStream in, long max) {
      super(in);
      this.remaining = max;
    }

    @Override
    public int read() throws IOException {
      int b = super.read();
      if (b >= 0 && --remaining < 0) throw new IOException("PDF exceeds the size limit");
      return b;
    }

    @Override
    public int read(byte[] buffer, int off, int len) throws IOException {
      int n = super.read(buffer, off, len);
      if (n > 0 && (remaining -= n) < 0) throw new IOException("PDF exceeds the size limit");
      return n;
    }
  }
}
