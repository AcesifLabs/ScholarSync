package com.acesif.scholarsyncbackend.papers.entities;

/** One author as stored in papers.authors (jsonb). {@code id} is the OpenAlex author id (e.g. A5023888391) and may be null. */
public record PaperAuthor(String id, String name) {}
