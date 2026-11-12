package com.acesif.scholarsyncbackend.pdfs.controllers;

import com.acesif.scholarsyncbackend.commons.config.properties.PdfProperties;
import com.acesif.scholarsyncbackend.commons.constants.ApiPaths;
import com.acesif.scholarsyncbackend.pdfs.services.PdfService;
import com.acesif.scholarsyncbackend.users.entities.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.InputStream;

@RestController
@RequestMapping(ApiPaths.Papers.PDF)
@RequiredArgsConstructor
@Tag(name = "PDFs", description = "Paper PDFs: proxied open-access copies and user uploads")
public class PdfController {

  private final PdfService pdfService;
  private final PdfProperties pdfProperties;

  @Operation(summary = "Get PDF", description = "Streams the uploaded PDF or the open-access copy")
  @GetMapping(produces = MediaType.APPLICATION_PDF_VALUE)
  public ResponseEntity<StreamingResponseBody> get(@PathVariable String paperId) {
    PdfService.PdfStream pdf = pdfService.open(paperId);
    StreamingResponseBody body = out -> {
      try (InputStream in = pdf.body()) {
        in.transferTo(out);
      }
    };
    ResponseEntity.BodyBuilder response = ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_PDF)
            .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline().filename(paperId + ".pdf").build().toString())
            .cacheControl(CacheControl.maxAge(pdfProperties.getCacheMaxAge()).cachePrivate());
    if (pdf.contentLength() != null) response.contentLength(pdf.contentLength());
    return response.body(body);
  }

  @Operation(summary = "Upload PDF",
          description = "Attach a PDF to a paper that has none; the paper must be in your library or in a group where you are a member or above")
  @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @ResponseStatus(HttpStatus.CREATED)
  public void upload(@AuthenticationPrincipal User user, @PathVariable String paperId, @RequestParam("file") MultipartFile file) {
    pdfService.upload(user, paperId, file);
  }

  @Operation(summary = "Remove uploaded PDF", description = "Uploader only, while the paper has no annotations")
  @DeleteMapping
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void removeUpload(@AuthenticationPrincipal User user, @PathVariable String paperId) {
    pdfService.removeUpload(user, paperId);
  }
}
