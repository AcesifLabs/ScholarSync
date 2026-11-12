package com.acesif.scholarsyncbackend.users.services;

import com.acesif.scholarsyncbackend.users.entities.User;
import com.acesif.scholarsyncbackend.users.repositories.UserRepository;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

/**
 * Signed-in users by id for the JWT filter, so an authenticated request (notification polling included) does not read
 * the users table every time. Unknown ids are not cached; a profile change evicts its entry.
 */
@Component
public class UserCache {

  private final UserRepository userRepository;
  private final Cache<UUID, User> users = Caffeine.newBuilder()
          .expireAfterWrite(Duration.ofSeconds(60))
          .maximumSize(10_000)
          .build();

  public UserCache(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  public Optional<User> find(UUID id) {
    return Optional.ofNullable(users.get(id, key -> userRepository.findById(key).orElse(null)));
  }

  public void evict(UUID id) {
    users.invalidate(id);
  }
}
