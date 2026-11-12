package com.acesif.scholarsyncbackend.commons.config.properties;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
@Getter
@Setter
@ConfigurationProperties(prefix = "pdf")
public class PdfProperties {
  /** Largest PDF we proxy or accept as an upload. */
  private long maxBytes = 50L * 1024 * 1024;
  /** Only for tests, where the fake publisher runs on localhost. Never enable in a deployment (SSRF). */
  private boolean allowPrivateHosts = false;
  /** Fetching an open-access PDF from its publisher. */
  private Duration connectTimeout = Duration.ofSeconds(10);
  private Duration readTimeout = Duration.ofSeconds(60);
  /** How long the browser may cache a served PDF (private cache only). */
  private Duration cacheMaxAge = Duration.ofHours(1);
}
