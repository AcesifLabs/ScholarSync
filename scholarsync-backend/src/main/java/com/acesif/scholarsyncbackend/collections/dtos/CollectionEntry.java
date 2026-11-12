package com.acesif.scholarsyncbackend.collections.dtos;

import com.acesif.scholarsyncbackend.papers.dtos.PaperSummary;

import java.time.Instant;
import java.util.List;

public record CollectionEntry(PaperSummary paper, int position, String note, List<String> tags, Instant addedAt) {}
