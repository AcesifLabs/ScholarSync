package com.acesif.scholarsyncbackend.papers.repositories;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.support.TransactionTemplate;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;

/**
 * search_cache rows. Plain SQL rather than JPA: the lookups use pg_trgm's similarity operator and pgvector's cosine
 * distance, which have no JPQL form and no Hibernate mapping without extra modules.
 */
@Repository
@RequiredArgsConstructor
public class SearchCacheRepository {

  /** One cached result set and how close its query was to the one asked (1.0 for an exact match). */
  public record Entry(UUID id, String queryNorm, List<String> paperIds, double score) {}

  private final JdbcTemplate jdbc;
  private final TransactionTemplate transactions;

  public Optional<Entry> findExact(String paramsKey, String queryNorm) {
    return jdbc.query("""
            SELECT id, query_norm, paper_ids, 1.0 AS score FROM search_cache
            WHERE params_key = ? AND query_norm = ? AND expires_at > now()
            """, SearchCacheRepository::entry, paramsKey, queryNorm).stream().findFirst();
  }

  /** Live entries with these params whose text is trigram-similar, best first. */
  public List<Entry> findByTrigram(String paramsKey, String queryNorm, int limit) {
    return jdbc.query("""
            SELECT id, query_norm, paper_ids, similarity(query_norm, ?) AS score FROM search_cache
            WHERE params_key = ? AND expires_at > now() AND query_norm % ?
            ORDER BY score DESC LIMIT ?
            """, SearchCacheRepository::entry, queryNorm, paramsKey, queryNorm, limit);
  }

  /** Live entries with these params nearest to {@code embedding} (a pgvector literal), best first. */
  public List<Entry> findByEmbedding(String paramsKey, String embedding, int limit) {
    List<Entry> nearest = transactions.execute(status -> {
      // filtered HNSW scans otherwise stop at ef_search rows and can miss rows with this params_key
      jdbc.execute("SET LOCAL hnsw.iterative_scan = relaxed_order");
      return jdbc.query("""
              SELECT id, query_norm, paper_ids, 1 - (embedding <=> ?::vector) AS score FROM search_cache
              WHERE params_key = ? AND expires_at > now() AND embedding IS NOT NULL
              ORDER BY embedding <=> ?::vector LIMIT ?
              """, SearchCacheRepository::entry, embedding, paramsKey, embedding, limit);
    });
    // relaxed_order may return rows slightly out of order
    return nearest == null ? List.of() : nearest.stream().sorted(Comparator.comparingDouble(Entry::score).reversed()).toList();
  }

  /** Inserts or replaces the entry for these params and normalized text. */
  public void upsert(String queryText, String queryNorm, String paramsKey, String embedding, List<String> paperIds,
                     Collection<String> sourcesOk, boolean complete, Instant expiresAt) {
    jdbc.update("""
            INSERT INTO search_cache (query_text, query_norm, params_key, embedding, paper_ids, sources_ok, complete, expires_at)
            VALUES (?, ?, ?, ?::vector, ?, ?, ?, ?)
            ON CONFLICT (params_key, query_norm) DO UPDATE SET
              query_text = excluded.query_text, embedding = excluded.embedding, paper_ids = excluded.paper_ids,
              sources_ok = excluded.sources_ok, complete = excluded.complete, created_at = now(), expires_at = excluded.expires_at
            """, queryText, queryNorm, paramsKey, embedding, paperIds.toArray(String[]::new),
            sourcesOk.stream().sorted().toArray(String[]::new), complete, Timestamp.from(expiresAt));
  }

  public void addHits(Map<UUID, Integer> hits) {
    if (hits.isEmpty()) return;
    List<Object[]> rows = hits.entrySet().stream().map(e -> new Object[]{e.getValue(), e.getKey()}).toList();
    jdbc.batchUpdate("UPDATE search_cache SET hit_count = hit_count + ? WHERE id = ?", rows);
  }

  public int deleteExpired() {
    return jdbc.update("DELETE FROM search_cache WHERE expires_at <= now()");
  }

  private static Entry entry(ResultSet rs, int row) throws SQLException {
    return new Entry(rs.getObject("id", UUID.class), rs.getString("query_norm"),
            List.of((String[]) rs.getArray("paper_ids").getArray()), rs.getDouble("score"));
  }
}
