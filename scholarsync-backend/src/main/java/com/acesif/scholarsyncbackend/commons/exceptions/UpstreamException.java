package com.acesif.scholarsyncbackend.commons.exceptions;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** A third-party API failed. {@link #rateLimited} maps to 503 so the UI can say "try again". */
public class UpstreamException extends ResponseStatusException {

  public UpstreamException(HttpStatus status, String reason, Throwable cause) {
    super(status, reason, cause);
  }

  public static UpstreamException rateLimited(String service) {
    return new UpstreamException(HttpStatus.SERVICE_UNAVAILABLE, service + " is rate limiting requests. Try again in a minute.", null);
  }

  public static UpstreamException failed(String service, Throwable cause) {
    return new UpstreamException(HttpStatus.BAD_GATEWAY, service + " request failed.", cause);
  }
}
