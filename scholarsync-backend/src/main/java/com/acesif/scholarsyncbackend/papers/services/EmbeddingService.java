package com.acesif.scholarsyncbackend.papers.services;

import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.embedding.onnx.allminilml6v2.AllMiniLmL6V2EmbeddingModel;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Locale;

/**
 * Sentence embeddings for the search cache: all-MiniLM-L6-v2 (384 dimensions) running in-process via ONNX, so no
 * network call or per-query cost. The model loads on first use (about a second) rather than at startup.
 */
@Slf4j
@Service
public class EmbeddingService {

  public static final int DIMENSIONS = 384;

  private volatile EmbeddingModel model;

  /** pgvector literal such as "[0.1,0.2,…]", or null if the model failed; callers then skip the vector layer. */
  public String embed(String text) {
    try {
      float[] vector = model().embed(text.toLowerCase(Locale.ROOT).trim()).content().vector();
      StringBuilder literal = new StringBuilder(vector.length * 12).append('[');
      for (int i = 0; i < vector.length; i++) {
        if (i > 0) literal.append(',');
        literal.append(vector[i]);
      }
      return literal.append(']').toString();
    } catch (RuntimeException | LinkageError e) {
      log.warn("Query embedding failed; similarity cache falls back to trigram matching", e);
      return null;
    }
  }

  private EmbeddingModel model() {
    EmbeddingModel loaded = model;
    if (loaded == null) {
      synchronized (this) {
        if (model == null) model = new AllMiniLmL6V2EmbeddingModel();
        loaded = model;
      }
    }
    return loaded;
  }
}
