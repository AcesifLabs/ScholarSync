package com.acesif.scholarsyncbackend.commons.config.properties;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.time.Duration;

/** Base URLs, credentials and rate limits of the paper sources (ADR 0005). */
@Component
@Getter
@Setter
@ConfigurationProperties(prefix = "external")
public class ExternalSourcesProperties {
  /** Sent to Crossref (mailto), Unpaywall (email) and OpenAlex (mailto) as the operator contact. */
  private String contactEmail;
  /** Base delay before retrying a 429; doubles per attempt. */
  private long retryBackoffMs = 1000;
  /** Spaces calls to each source by its min-interval; tests turn it off. */
  private boolean throttle = true;
  private Duration connectTimeout = Duration.ofSeconds(10);
  private Duration readTimeout = Duration.ofSeconds(30);
  private Endpoint openalex = new Endpoint();
  private Endpoint crossref = new Endpoint();
  private Endpoint arxiv = new Endpoint();
  private Endpoint europepmc = new Endpoint();
  private Endpoint opencitations = new Endpoint();
  private Endpoint unpaywall = new Endpoint();

  @Getter
  @Setter
  public static class Endpoint {
    private String baseUrl;
    /** OpenAlex api_key or OpenCitations access token; optional elsewhere. */
    private String apiKey;
    /** Only Unpaywall reads this: its commercial terms are unconfirmed, so it is off by default. */
    private boolean enabled = true;
    /** Least time between two calls, from the source's published rate limit. */
    private Duration minInterval = Duration.ofMillis(200);
    private int maxConcurrent = 2;
  }
}
