package com.acesif.scholarsyncbackend.integrations.sources.utils;

import tools.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;

/** Null-safe reads from source responses, where any field may be missing or null. */
public final class Json {

  private Json() {}

  public static String str(JsonNode node) {
    if (node == null || node.isMissingNode() || node.isNull()) return null;
    String s = node.asString().trim();
    return s.isEmpty() ? null : s;
  }

  public static Integer integer(JsonNode node) {
    if (node == null || node.isMissingNode() || node.isNull()) return null;
    if (node.isNumber()) return node.asInt();
    String s = str(node);
    return s != null && s.matches("-?\\d{1,9}") ? Integer.valueOf(s) : null;
  }

  /** Maps every element of an array node, dropping nulls; empty for anything that is not an array. */
  public static <T> List<T> list(JsonNode array, Function<JsonNode, T> mapper) {
    List<T> out = new ArrayList<>();
    if (array == null || !array.isArray()) return out;
    for (JsonNode element : array) {
      T value = mapper.apply(element);
      if (value != null) out.add(value);
    }
    return out;
  }
}
