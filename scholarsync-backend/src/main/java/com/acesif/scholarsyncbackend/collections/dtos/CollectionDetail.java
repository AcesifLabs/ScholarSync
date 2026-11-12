package com.acesif.scholarsyncbackend.collections.dtos;

import java.util.List;

public record CollectionDetail(CollectionSummary collection, List<CollectionEntry> entries) {}
