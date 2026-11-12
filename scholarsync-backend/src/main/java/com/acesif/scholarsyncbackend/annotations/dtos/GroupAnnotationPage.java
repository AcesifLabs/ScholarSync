package com.acesif.scholarsyncbackend.annotations.dtos;

import java.util.List;

public record GroupAnnotationPage(List<GroupAnnotation> items, long total, int page, int size) {}
