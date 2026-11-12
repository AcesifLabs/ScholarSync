package com.acesif.scholarsyncbackend.groups.services;

import com.acesif.scholarsyncbackend.groups.entities.GroupMember;
import com.acesif.scholarsyncbackend.groups.entities.GroupMemberId;
import com.acesif.scholarsyncbackend.groups.enums.GroupRole;
import com.acesif.scholarsyncbackend.groups.repositories.GroupMemberRepository;
import com.acesif.scholarsyncbackend.groups.repositories.ReadingGroupRepository;
import com.acesif.scholarsyncbackend.users.entities.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/** The single place group permissions are checked: unknown group → 404, not a member or role too low → 403. */
@Service
@RequiredArgsConstructor
public class GroupAccessService {

  private final ReadingGroupRepository groupRepository;
  private final GroupMemberRepository memberRepository;

  public GroupMember require(UUID groupId, User user, GroupRole minRole) {
    if (!groupRepository.existsById(groupId)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found");
    }
    GroupMember member = membership(groupId, user)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not a member of this group"));
    if (!member.getRole().atLeast(minRole)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This action needs the " + minRole.name().toLowerCase() + " role or higher");
    }
    return member;
  }

  public Optional<GroupMember> membership(UUID groupId, User user) {
    return memberRepository.findById(new GroupMemberId(groupId, user.getId()));
  }

  public boolean hasRole(UUID groupId, User user, GroupRole minRole) {
    return membership(groupId, user).map(m -> m.getRole().atLeast(minRole)).orElse(false);
  }

  public Set<UUID> groupIdsOf(User user) {
    return memberRepository.findByIdUserId(user.getId()).stream().map(m -> m.getId().getGroupId()).collect(Collectors.toSet());
  }
}
