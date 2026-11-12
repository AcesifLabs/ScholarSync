package com.acesif.scholarsyncbackend.users.dtos;

import com.acesif.scholarsyncbackend.users.entities.User;

import java.util.UUID;

/** Public face of a user shown next to their annotations, replies and comments. */
public record UserRef(UUID id, String name, String avatarUrl) {
  public static UserRef of(User user) {
    return new UserRef(user.getId(), user.getName(), user.getAvatarUrl());
  }
}
