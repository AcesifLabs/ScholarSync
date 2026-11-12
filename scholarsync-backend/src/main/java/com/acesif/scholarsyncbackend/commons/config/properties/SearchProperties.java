package com.acesif.scholarsyncbackend.commons.config.properties;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.time.Duration;

/** Federated search and its result cache (ADR 0005). */
@Component
@Getter
@Setter
@ConfigurationProperties(prefix = "search")
public class SearchProperties {
  /** Results requested from each source per query; every page is then served from the merged list. */
  private int depth = 100;
  /** A source slower than this is left out of that result, which is then cached as partial. */
  private Duration sourceTimeout = Duration.ofSeconds(8);
  /** Merged paper records older than this are refreshed when opened. */
  private Duration paperTtl = Duration.ofDays(30);
  private Cache cache = new Cache();

  @Getter
  @Setter
  public static class Cache {
    private Duration ttl = Duration.ofDays(7);
    /** Lifetime of a result some source failed to contribute to, so the next search fills the gap. */
    private Duration partialTtl = Duration.ofHours(1);
    /** pg_trgm similarity needed to reuse another query's results (typos, plurals, word order). */
    private double trigramThreshold = 0.8;
    /** Embedding cosine similarity needed to reuse another query's results (paraphrases). */
    private double vectorThreshold = 0.95;
    /** Shorter normalized queries only match exactly: "gan" and "gnn" are close as strings and far as topics. */
    private int minSimilarLength = 8;
    /** When expired entries are deleted (Spring cron; "-" disables it). */
    private String cleanupCron = "0 17 3 * * *";
    /** How often in-memory hit counts are written to search_cache.hit_count. */
    private Duration hitFlushInterval = Duration.ofSeconds(60);
  }
}
