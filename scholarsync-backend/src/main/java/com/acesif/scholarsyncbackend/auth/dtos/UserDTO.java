package com.acesif.scholarsyncbackend.auth.dtos;

import com.acesif.scholarsyncbackend.users.enums.ERole;

public record UserDTO(Long id, String email, String name, String avatarUrl, ERole role) {}
