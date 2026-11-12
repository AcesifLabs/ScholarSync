package com.acesif.scholarsyncbackend.groups.dtos;

import com.acesif.scholarsyncbackend.groups.enums.GroupRole;
import com.acesif.scholarsyncbackend.users.dtos.UserRef;

import java.time.Instant;

public record MemberResponse(UserRef user, GroupRole role, Instant joinedAt) {}
