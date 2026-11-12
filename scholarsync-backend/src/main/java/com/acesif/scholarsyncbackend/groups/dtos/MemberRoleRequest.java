package com.acesif.scholarsyncbackend.groups.dtos;

import com.acesif.scholarsyncbackend.groups.enums.GroupRole;
import jakarta.validation.constraints.NotNull;

public record MemberRoleRequest(@NotNull GroupRole role) {}
