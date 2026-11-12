package com.acesif.scholarsyncbackend.groups.dtos;

import com.acesif.scholarsyncbackend.groups.enums.GroupRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record MemberAddRequest(@NotBlank @Email String email, @NotNull GroupRole role) {}
