package com.acesif.scholarsyncbackend.integrations.sources.dtos;

import java.util.List;

/** A researcher as OpenAlex describes them; counts default to 0. */
public record SourceAuthorProfile(
        String id,
        String name,
        List<String> affiliations,
        int paperCount,
        int citationCount,
        int hIndex,
        String url,
        String homepage
) {}
