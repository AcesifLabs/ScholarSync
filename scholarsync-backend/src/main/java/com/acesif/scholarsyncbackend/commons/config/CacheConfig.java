package com.acesif.scholarsyncbackend.commons.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.boot.cache.autoconfigure.CacheManagerCustomizer;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.util.List;

/**
 * spring.cache.caffeine.spec sizes the caches of single records. Caches whose values are whole result lists (works with
 * abstracts, DOI lists) get a smaller entry limit so they cannot take a large share of the heap.
 */
@Configuration
public class CacheConfig {

  private static final List<String> LIST_CACHES = List.of("openalex-citing", "openalex-by-ids", "openalex-by-dois",
          "openalex-author-works", "openalex-author-search", "opencitations-references", "opencitations-citations");
  private static final int LIST_CACHE_SIZE = 500;
  private static final Duration LIST_CACHE_TTL = Duration.ofHours(1);

  @Bean
  public CacheManagerCustomizer<CaffeineCacheManager> listCaches() {
    return manager -> LIST_CACHES.forEach(name -> manager.registerCustomCache(name,
            Caffeine.newBuilder().maximumSize(LIST_CACHE_SIZE).expireAfterWrite(LIST_CACHE_TTL).build()));
  }
}
