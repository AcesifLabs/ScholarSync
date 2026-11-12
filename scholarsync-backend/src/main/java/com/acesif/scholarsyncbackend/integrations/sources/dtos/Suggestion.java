package com.acesif.scholarsyncbackend.integrations.sources.dtos;

/** A title suggestion; {@code id} is a paper id from PaperKeys.idFor. */
public record Suggestion(String id, String title, String hint) {}
