package com.acesif.scholarsyncbackend.auth.dtos;

import java.util.UUID;

public record UserResponse(UUID id, String name, String email, String avatarUrl) {}
