package com.acesif.scholarsyncbackend.groups.repositories;

import com.acesif.scholarsyncbackend.groups.entities.ReadingGroup;
import lombok.NonNull;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ReadingGroupRepository extends JpaRepository<@NonNull ReadingGroup, @NonNull UUID> {
}
