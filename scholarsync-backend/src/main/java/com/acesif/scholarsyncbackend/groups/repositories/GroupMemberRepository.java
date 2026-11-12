package com.acesif.scholarsyncbackend.groups.repositories;

import com.acesif.scholarsyncbackend.groups.entities.GroupMember;
import com.acesif.scholarsyncbackend.groups.entities.GroupMemberId;
import lombok.NonNull;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface GroupMemberRepository extends JpaRepository<@NonNull GroupMember, @NonNull GroupMemberId> {

  List<GroupMember> findByIdUserId(UUID userId);

  long countByIdGroupId(UUID groupId);

  @Query("select m.id.groupId, count(m) from GroupMember m where m.id.groupId in :groupIds group by m.id.groupId")
  List<Object[]> countByGroup(List<UUID> groupIds);

  @EntityGraph(attributePaths = "user")
  List<GroupMember> findByIdGroupIdOrderByJoinedAtAsc(UUID groupId);
}
