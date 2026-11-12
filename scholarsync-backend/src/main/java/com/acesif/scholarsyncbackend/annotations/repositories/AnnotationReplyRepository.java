package com.acesif.scholarsyncbackend.annotations.repositories;

import com.acesif.scholarsyncbackend.annotations.entities.AnnotationReply;
import lombok.NonNull;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface AnnotationReplyRepository extends JpaRepository<@NonNull AnnotationReply, @NonNull UUID> {

  @EntityGraph(attributePaths = "author")
  List<AnnotationReply> findByAnnotationIdInOrderByCreatedAtAsc(Collection<UUID> annotationIds);
}
