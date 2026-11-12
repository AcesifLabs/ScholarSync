package com.acesif.scholarsyncbackend.users.repositories;

import com.acesif.scholarsyncbackend.users.entities.User;
import lombok.NonNull;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<@NonNull User, @NonNull UUID> {
  Optional<User> findByGoogleId(String googleId);
  Optional<User> findByEmail(String email);
}
