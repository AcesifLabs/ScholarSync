package com.acesif.scholarsyncbackend.graph.dtos;

import com.acesif.scholarsyncbackend.papers.entities.PaperAuthor;

import java.util.List;

/** {@code depth} is the hop distance from the seed paper (0 for the seed). */
public record GraphNode(String id, String title, Integer year, Integer citationCount, List<PaperAuthor> authors, int depth) {}
