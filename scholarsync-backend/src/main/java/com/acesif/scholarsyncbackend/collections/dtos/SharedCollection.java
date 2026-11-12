package com.acesif.scholarsyncbackend.collections.dtos;

import com.acesif.scholarsyncbackend.papers.dtos.PaperSummary;

import java.util.List;

/**
 * Read-only view served at /shared/{token}: the papers in order and nothing personal. The owner's name and each entry's
 * private note and tags are left out because anyone holding the link can read this.
 */
public record SharedCollection(String name, String description, List<PaperSummary> papers) {}
