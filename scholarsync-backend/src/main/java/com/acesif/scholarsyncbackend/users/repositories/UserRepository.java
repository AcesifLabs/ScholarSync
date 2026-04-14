package com.acesif.scholarsyncbackend.users.repositories;

import com.acesif.scholarsyncbackend.users.entities.User;
import lombok.NonNull;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<@NonNull User, @NonNull String> {
  Optional<User> findByGoogleId(String googleId);
  Optional<User> findByOrcidId(String orcidId);
  Optional<User> findByEmail(String email);
}
