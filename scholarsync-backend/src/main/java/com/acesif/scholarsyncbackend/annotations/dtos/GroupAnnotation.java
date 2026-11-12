package com.acesif.scholarsyncbackend.annotations.dtos;

/** A group annotation with the title of the paper it is on, for the group's Annotations tab. */
public record GroupAnnotation(AnnotationResponse annotation, String paperTitle) {}
