package com.acesif.scholarsyncbackend.groups.services;

import com.acesif.scholarsyncbackend.commons.utils.Tokens;
import com.acesif.scholarsyncbackend.groups.events.GroupEvents;

import com.acesif.scholarsyncbackend.users.dtos.UserRef;
import com.acesif.scholarsyncbackend.groups.dtos.*;
import com.acesif.scholarsyncbackend.groups.entities.GroupInvite;
import com.acesif.scholarsyncbackend.groups.entities.GroupMember;
import com.acesif.scholarsyncbackend.groups.entities.GroupMemberId;
import com.acesif.scholarsyncbackend.groups.entities.ReadingGroup;
import com.acesif.scholarsyncbackend.groups.enums.GroupRole;
import com.acesif.scholarsyncbackend.groups.repositories.GroupInviteRepository;
import com.acesif.scholarsyncbackend.groups.repositories.GroupMemberRepository;
import com.acesif.scholarsyncbackend.groups.repositories.ReadingGroupRepository;
import com.acesif.scholarsyncbackend.users.entities.User;
import com.acesif.scholarsyncbackend.users.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Roles: OWNER (one per group, deletes it), ADMIN (manages members, invites, removes papers), MEMBER (adds papers,
 * comments, annotates), VIEWER (read-only). Nobody can be granted OWNER and the owner's role cannot be changed. Only
 * the owner can demote or remove an admin. A member who leaves, is removed or loses ADMIN has their invite links revoked.
 */
@Service
@RequiredArgsConstructor
public class GroupService {


  private final ReadingGroupRepository groupRepository;
  private final GroupMemberRepository memberRepository;
  private final GroupInviteRepository inviteRepository;
  private final UserRepository userRepository;
  private final GroupAccessService groupAccess;
  private final ApplicationEventPublisher events;
  private final TransactionTemplate tx;

  @Transactional(readOnly = true)
  public List<GroupSummary> mine(User user) {
    List<GroupMember> memberships = memberRepository.findByIdUserId(user.getId());
    if (memberships.isEmpty()) return List.of();
    List<UUID> ids = memberships.stream().map(m -> m.getId().getGroupId()).toList();
    Map<UUID, ReadingGroup> groups = groupRepository.findAllById(ids).stream()
            .collect(Collectors.toMap(ReadingGroup::getId, Function.identity()));
    Map<UUID, Long> counts = memberRepository.countByGroup(ids).stream()
            .collect(Collectors.toMap(row -> (UUID) row[0], row -> (Long) row[1]));
    return memberships.stream()
            .map(m -> summary(groups.get(m.getId().getGroupId()), m.getRole(), counts.getOrDefault(m.getId().getGroupId(), 0L)))
            .sorted(Comparator.comparing(GroupSummary::createdAt).reversed())
            .toList();
  }

  @Transactional
  public GroupSummary create(User user, GroupCreateRequest request) {
    ReadingGroup group = groupRepository.save(ReadingGroup.builder()
            .name(request.name().strip())
            .description(blankToNull(request.description()))
            .tags(tags(request.tags()))
            .ownerId(user.getId())
            .createdAt(Instant.now())
            .build());
    memberRepository.save(GroupMember.builder()
            .id(new GroupMemberId(group.getId(), user.getId())).user(user).role(GroupRole.OWNER).joinedAt(Instant.now()).build());
    return summary(group, GroupRole.OWNER);
  }

  @Transactional(readOnly = true)
  public GroupSummary get(User user, UUID groupId) {
    GroupMember me = groupAccess.require(groupId, user, GroupRole.VIEWER);
    return summary(group(groupId), me.getRole());
  }

  @Transactional
  public GroupSummary update(User user, UUID groupId, GroupUpdateRequest request) {
    GroupMember me = groupAccess.require(groupId, user, GroupRole.ADMIN);
    ReadingGroup group = group(groupId);
    if (request.name() != null) group.setName(request.name().strip());
    if (request.description() != null) group.setDescription(blankToNull(request.description()));
    if (request.tags() != null) group.setTags(tags(request.tags()));
    return summary(group, me.getRole());
  }

  @Transactional
  public void delete(User user, UUID groupId) {
    groupAccess.require(groupId, user, GroupRole.OWNER);
    groupRepository.deleteById(groupId);
  }

  @Transactional(readOnly = true)
  public List<MemberResponse> members(User user, UUID groupId) {
    groupAccess.require(groupId, user, GroupRole.VIEWER);
    return memberRepository.findByIdGroupIdOrderByJoinedAtAsc(groupId).stream()
            .map(m -> new MemberResponse(UserRef.of(m.getUser()), m.getRole(), m.getJoinedAt())).toList();
  }

  /**
   * Adds an existing ScholarSync user; no email is sent. The outcome is the same whether or not the address has an
   * account (or is already a member), so the endpoint cannot be used to probe which emails are registered.
   */
  @Transactional
  public void addMember(User user, UUID groupId, MemberAddRequest request) {
    groupAccess.require(groupId, user, GroupRole.ADMIN);
    requireGrantable(request.role());
    Optional<User> invitee = userRepository.findByEmail(request.email().strip().toLowerCase(Locale.ROOT))
            .or(() -> userRepository.findByEmail(request.email().strip()));
    if (invitee.isEmpty() || groupAccess.membership(groupId, invitee.get()).isPresent()) return;
    join(groupId, invitee.get(), request.role());
    events.publishEvent(new GroupEvents.MemberAdded(groupId, invitee.get(), user));
  }

  @Transactional
  public MemberResponse changeRole(User user, UUID groupId, UUID memberId, GroupRole role) {
    GroupMember me = groupAccess.require(groupId, user, GroupRole.ADMIN);
    requireGrantable(role);
    GroupMember member = member(groupId, memberId);
    if (member.getRole() == GroupRole.OWNER) throw new IllegalArgumentException("The owner's role cannot be changed");
    requireOutranks(me, member);
    if (!role.atLeast(GroupRole.ADMIN)) revokeInvitesOf(groupId, memberId);
    member.setRole(role);
    return new MemberResponse(UserRef.of(member.getUser()), member.getRole(), member.getJoinedAt());
  }

  @Transactional
  public void removeMember(User user, UUID groupId, UUID memberId) {
    GroupMember me = groupAccess.require(groupId, user, GroupRole.ADMIN);
    GroupMember member = member(groupId, memberId);
    if (member.getRole() == GroupRole.OWNER) throw new IllegalArgumentException("The owner cannot be removed");
    requireOutranks(me, member);
    revokeInvitesOf(groupId, memberId);
    memberRepository.delete(member);
  }

  @Transactional
  public void leave(User user, UUID groupId) {
    GroupMember me = groupAccess.require(groupId, user, GroupRole.VIEWER);
    if (me.getRole() == GroupRole.OWNER) throw new IllegalArgumentException("The owner cannot leave; delete the group instead");
    revokeInvitesOf(groupId, user.getId());
    memberRepository.delete(me);
  }

  /** Admins manage members and viewers; only the owner manages admins. */
  private static void requireOutranks(GroupMember me, GroupMember target) {
    if (target.getRole() == GroupRole.ADMIN && me.getRole() != GroupRole.OWNER) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the owner can change or remove an admin");
    }
  }

  private void revokeInvitesOf(UUID groupId, UUID userId) {
    inviteRepository.revokeCreatedBy(groupId, userId, Instant.now());
  }

  @Transactional
  public InviteResponse createInvite(User user, UUID groupId, InviteCreateRequest request) {
    groupAccess.require(groupId, user, GroupRole.ADMIN);
    requireGrantable(request.role());
    Instant now = Instant.now();
    GroupInvite invite = inviteRepository.save(GroupInvite.builder()
            .groupId(groupId).token(Tokens.newUrlToken()).role(request.role())
            .expiresAt(now.plus(Duration.ofHours(request.expiresInHours())))
            .createdBy(user.getId()).createdAt(now).build());
    return toInvite(invite);
  }

  @Transactional(readOnly = true)
  public List<InviteResponse> invites(User user, UUID groupId) {
    groupAccess.require(groupId, user, GroupRole.ADMIN);
    return inviteRepository.findByGroupIdAndRevokedAtIsNullAndExpiresAtAfterOrderByCreatedAtDesc(groupId, Instant.now())
            .stream().map(GroupService::toInvite).toList();
  }

  @Transactional
  public void revokeInvite(User user, UUID groupId, UUID inviteId) {
    groupAccess.require(groupId, user, GroupRole.ADMIN);
    GroupInvite invite = inviteRepository.findById(inviteId).filter(i -> i.getGroupId().equals(groupId))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invite not found"));
    if (invite.getRevokedAt() == null) invite.setRevokedAt(Instant.now());
  }

  /**
   * Idempotent for existing members (their role is kept), also when the same user joins twice at once. Expired or
   * revoked links answer 410.
   */
  public GroupSummary joinByToken(User user, String token) {
    try {
      return tx.execute(status -> join(user, token));
    } catch (DataIntegrityViolationException e) {
      return tx.execute(status -> join(user, token));
    }
  }

  private GroupSummary join(User user, String token) {
    GroupInvite invite = inviteRepository.findByToken(token)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invite link not found"));
    if (!invite.isUsable(Instant.now())) throw new ResponseStatusException(HttpStatus.GONE, "This invite link has expired or was revoked");
    Optional<GroupMember> existing = groupAccess.membership(invite.getGroupId(), user);
    GroupMember member = existing.orElseGet(() -> {
      GroupMember joined = join(invite.getGroupId(), user, invite.getRole());
      events.publishEvent(new GroupEvents.MemberAdded(invite.getGroupId(), user, null));
      return joined;
    });
    return summary(group(invite.getGroupId()), member.getRole());
  }

  private GroupMember join(UUID groupId, User user, GroupRole role) {
    return memberRepository.saveAndFlush(GroupMember.builder()
            .id(new GroupMemberId(groupId, user.getId())).user(user).role(role).joinedAt(Instant.now()).build());
  }

  private GroupMember member(UUID groupId, UUID userId) {
    return memberRepository.findById(new GroupMemberId(groupId, userId))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Member not found"));
  }

  private ReadingGroup group(UUID groupId) {
    return groupRepository.findById(groupId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found"));
  }

  private GroupSummary summary(ReadingGroup g, GroupRole myRole) {
    return summary(g, myRole, memberRepository.countByIdGroupId(g.getId()));
  }

  private static GroupSummary summary(ReadingGroup g, GroupRole myRole, long members) {
    return new GroupSummary(g.getId(), g.getName(), g.getDescription(), g.getTags(), myRole, members, g.getCreatedAt());
  }

  private static void requireGrantable(GroupRole role) {
    if (role == GroupRole.OWNER) throw new IllegalArgumentException("The owner role cannot be granted");
  }

  private static InviteResponse toInvite(GroupInvite i) {
    return new InviteResponse(i.getId(), i.getToken(), i.getRole(), i.getExpiresAt(), i.getCreatedAt());
  }

  private static List<String> tags(List<String> tags) {
    return tags == null ? new ArrayList<>() : new ArrayList<>(tags.stream().map(String::strip).distinct().toList());
  }

  private static String blankToNull(String s) {
    return s == null || s.isBlank() ? null : s.strip();
  }
}
