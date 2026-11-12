package com.acesif.scholarsyncbackend.integrations.sources.dtos;

import java.util.List;

public record ResultPage<T>(int total, List<T> items) {}
