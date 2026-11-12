package com.acesif.scholarsyncbackend.graph.controllers;

import com.acesif.scholarsyncbackend.commons.constants.Limits;
import com.acesif.scholarsyncbackend.commons.constants.ApiPaths;
import com.acesif.scholarsyncbackend.graph.dtos.CitationGraph;
import com.acesif.scholarsyncbackend.graph.enums.GraphDirection;
import com.acesif.scholarsyncbackend.graph.services.GraphService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(ApiPaths.Papers.GRAPH)
@RequiredArgsConstructor
@Tag(name = "Citation graph", description = "Citation network around a paper (public)")
public class GraphController {

  private final GraphService graphService;

  @Operation(summary = "Citation graph", description = "Nodes and cites-links within depth hops of the paper")
  @GetMapping
  public CitationGraph graph(
          @PathVariable @Size(max = Limits.MAX_PAPER_ID_LENGTH) String paperId,
          @RequestParam(defaultValue = "both") String direction,
          @RequestParam(defaultValue = "1") @Min(1) @Max(GraphService.MAX_DEPTH) int depth,
          @RequestParam(defaultValue = "" + GraphService.MAX_NODES) @Min(1) @Max(GraphService.MAX_NODES) int limit
  ) {
    return graphService.build(paperId, GraphDirection.parse(direction), depth, limit);
  }

  @Operation(summary = "Expand node", description = "One hop around a paper, merged into an existing graph by the client")
  @GetMapping(ApiPaths.Papers.GRAPH_EXPAND)
  public CitationGraph expand(
          @PathVariable @Size(max = Limits.MAX_PAPER_ID_LENGTH) String paperId,
          @RequestParam(defaultValue = "both") String direction,
          @RequestParam(defaultValue = "40") @Min(1) @Max(GraphService.MAX_NODES) int limit
  ) {
    return graphService.expand(paperId, GraphDirection.parse(direction), limit);
  }
}
