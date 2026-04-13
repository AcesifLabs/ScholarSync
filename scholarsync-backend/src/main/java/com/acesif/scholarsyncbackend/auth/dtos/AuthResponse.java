package com.acesif.scholarsyncbackend.auth.dtos;

import com.acesif.scholarsyncbackend.users.entities.User;

public record AuthResponse(String accessToken, UserDTO user) {
  public AuthResponse(String token, User user) {
    this(token, new UserDTO(user.getId(), user.getEmail(), user.getName(), user.getAvatarUrl(), user.getRole()));
  }
}