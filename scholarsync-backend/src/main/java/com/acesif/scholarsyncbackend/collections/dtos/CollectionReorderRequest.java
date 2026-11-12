package com.acesif.scholarsyncbackend.collections.dtos;

import jakarta.validation.constraints.NotNull;

import java.util.List;

/** The full list of paper ids in the new order; it must contain exactly the collection's current papers. */
public record CollectionReorderRequest(@NotNull List<@NotNull String> paperIds) {}
