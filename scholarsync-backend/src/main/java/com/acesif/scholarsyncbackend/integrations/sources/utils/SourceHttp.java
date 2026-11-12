package com.acesif.scholarsyncbackend.integrations.sources.utils;

import com.acesif.scholarsyncbackend.commons.exceptions.UpstreamException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriBuilder;

import java.net.URI;
import java.util.function.Function;
import java.util.function.Supplier;

/**
 * GET helper shared by the source clients: throttled, a 429 is retried twice with exponential backoff before surfacing
 * as 503, other failures become 502. {@link #getOrNull} returns null on 404/400 so lookups by id can say "unknown".
 */
@Slf4j
public final class SourceHttp {

  private static final int MAX_RETRIES = 2;
  /** Upstream error bodies are cut to this many characters in the log. */
  private static final int MAX_LOGGED_BODY = 300;

  private final String service;
  private final RestClient client;
  private final SourceThrottle throttle;
  private final long backoffMs;

  public SourceHttp(String service, RestClient client, SourceThrottle throttle, long backoffMs) {
    this.service = service;
    this.client = client;
    this.throttle = throttle;
    this.backoffMs = backoffMs;
  }

  /** See {@link SourceThrottle#busy()}. */
  public boolean busy() {
    return throttle.busy();
  }

  public <T> T get(Function<UriBuilder, URI> uri, Class<T> type) {
    return withRetry(() -> throttle.call(() -> client.get().uri(uri).retrieve().body(type)));
  }

  public <T> T getOrNull(Function<UriBuilder, URI> uri, Class<T> type) {
    try {
      return get(uri, type);
    } catch (UpstreamException e) {
      if (e.getCause() instanceof HttpClientErrorException.NotFound || e.getCause() instanceof HttpClientErrorException.BadRequest) {
        return null;
      }
      throw e;
    }
  }

  private <T> T withRetry(Supplier<T> call) {
    for (int attempt = 0; ; attempt++) {
      try {
        return call.get();
      } catch (HttpClientErrorException.TooManyRequests e) {
        if (attempt == MAX_RETRIES) throw UpstreamException.rateLimited(service);
        sleep(backoffMs << attempt);
      } catch (RestClientResponseException e) {
        if (!(e instanceof HttpClientErrorException.NotFound)) {
          log.warn("{} returned {}: {}", service, e.getStatusCode(), abbreviate(e.getResponseBodyAsString()));
        }
        throw UpstreamException.failed(service, e);
      } catch (RestClientException e) {
        log.warn("{} request failed: {}", service, e.getMessage());
        throw UpstreamException.failed(service, e);
      }
    }
  }

  private static String abbreviate(String body) {
    return body.length() > MAX_LOGGED_BODY ? body.substring(0, MAX_LOGGED_BODY) + "…" : body;
  }

  private void sleep(long ms) {
    try {
      Thread.sleep(ms);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw UpstreamException.rateLimited(service);
    }
  }
}
