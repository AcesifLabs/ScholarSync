package com.acesif.scholarsyncbackend.papers.services;

import com.acesif.scholarsyncbackend.papers.utils.QueryNormalizer;
import com.acesif.scholarsyncbackend.commons.config.properties.SearchProperties;
import com.acesif.scholarsyncbackend.papers.repositories.SearchCacheRepository;
import com.acesif.scholarsyncbackend.papers.repositories.SearchCacheRepository.Entry;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

/**
 * Search results cached in Postgres (ADR 0005) so repeated or similar searches by any user make no source calls.
 * Lookup order, always within the same filters and sort: exact normalized text, then trigram similarity, then
 * embedding cosine similarity; a similarity hit also needs the same numbers and symbol-bearing tokens. Every lookup logs its layer and
 * best score, which is what the thresholds are tuned from. Concurrent misses for one key share one load.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SearchCacheService {

  /** What a cache miss produced: merged paper ids in result order, and which sources answered. */
  public record Loaded(List<String> paperIds, Set<String> sourcesOk, boolean complete) {}

  private static final int CANDIDATES = 5;

  private final SearchCacheRepository repository;
  private final EmbeddingService embeddings;
  private final SearchProperties properties;
  private final Map<String, CompletableFuture<List<String>>> inFlight = new ConcurrentHashMap<>();
  /** Hits since the last flush; counting in memory keeps a cache hit free of writes. */
  private final Map<UUID, Integer> pendingHits = new ConcurrentHashMap<>();

  public List<String> find(String query, String paramsKey, Supplier<Loaded> loader) {
    String norm = QueryNormalizer.normalize(query);
    String flightKey = paramsKey + "\n" + norm;
    CompletableFuture<List<String>> mine = new CompletableFuture<>();
    CompletableFuture<List<String>> running = inFlight.putIfAbsent(flightKey, mine);
    if (running != null) return await(running);
    try {
      List<String> ids = lookupOrLoad(query, norm, paramsKey, loader);
      mine.complete(ids);
      return ids;
    } catch (RuntimeException e) {
      mine.completeExceptionally(e);
      throw e;
    } finally {
      inFlight.remove(flightKey, mine);
    }
  }

  private List<String> lookupOrLoad(String query, String norm, String paramsKey, Supplier<Loaded> loader) {
    Optional<Entry> exact = repository.findExact(paramsKey, norm);
    if (exact.isPresent()) return served("exact", query, exact.get());

    boolean similar = norm.length() >= properties.getCache().getMinSimilarLength();
    double bestTrigram = 0;
    double bestVector = 0;
    if (similar) {
      List<Entry> trigram = repository.findByTrigram(paramsKey, norm, CANDIDATES);
      bestTrigram = trigram.isEmpty() ? 0 : trigram.getFirst().score();
      Entry hit = accept(trigram, norm, properties.getCache().getTrigramThreshold());
      if (hit != null) return served("trigram", query, hit);
    }

    String embedding = embeddings.embed(query);
    if (similar && embedding != null) {
      List<Entry> nearest = repository.findByEmbedding(paramsKey, embedding, CANDIDATES);
      bestVector = nearest.isEmpty() ? 0 : nearest.getFirst().score();
      Entry hit = accept(nearest, norm, properties.getCache().getVectorThreshold());
      if (hit != null) return served("vector", query, hit);
    }

    log.info("Search cache miss for \"{}\" (best trigram {}, best vector {})", query, round(bestTrigram), round(bestVector));
    Loaded loaded = loader.get();
    Instant expires = Instant.now().plus(loaded.complete() ? properties.getCache().getTtl() : properties.getCache().getPartialTtl());
    repository.upsert(query, norm, paramsKey, embedding, loaded.paperIds(), loaded.sourcesOk(), loaded.complete(), expires);
    return loaded.paperIds();
  }

  /** Deletes expired results once a day; lookups already ignore them. */
  @Scheduled(cron = "#{@searchProperties.cache.cleanupCron}")
  public void deleteExpired() {
    int deleted = repository.deleteExpired();
    if (deleted > 0) log.info("Deleted {} expired search cache entries", deleted);
  }

  @Scheduled(fixedDelayString = "#{@searchProperties.cache.hitFlushInterval.toMillis()}")
  @PreDestroy
  public void flushHits() {
    Map<UUID, Integer> batch = new HashMap<>();
    for (UUID id : List.copyOf(pendingHits.keySet())) {
      Integer hits = pendingHits.remove(id);
      if (hits != null) batch.put(id, hits);
    }
    repository.addHits(batch);
  }

  private List<String> served(String layer, String query, Entry hit) {
    pendingHits.merge(hit.id(), 1, Integer::sum);
    log.info("Search cache {} hit for \"{}\" via \"{}\" (score {})", layer, query, hit.queryNorm(), round(hit.score()));
    return hit.paperIds();
  }

  /** Best candidate at or above {@code threshold} whose exact tokens (numbers, c++/c#) match the query's. */
  private static Entry accept(List<Entry> candidates, String norm, double threshold) {
    Set<String> numbers = QueryNormalizer.exactTokens(norm);
    return candidates.stream()
            .filter(h -> h.score() >= threshold && QueryNormalizer.exactTokens(h.queryNorm()).equals(numbers))
            .findFirst().orElse(null);
  }

  private static <T> T await(CompletableFuture<T> future) {
    try {
      return future.join();
    } catch (CompletionException e) {
      if (e.getCause() instanceof RuntimeException cause) throw cause;
      throw e;
    }
  }

  private static String round(double score) {
    return String.format(Locale.ROOT, "%.3f", score);
  }
}
