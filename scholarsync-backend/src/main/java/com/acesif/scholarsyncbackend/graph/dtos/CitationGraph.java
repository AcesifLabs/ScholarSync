package com.acesif.scholarsyncbackend.graph.dtos;

import java.util.List;

public record CitationGraph(String rootId, List<GraphNode> nodes, List<GraphLink> links) {}
