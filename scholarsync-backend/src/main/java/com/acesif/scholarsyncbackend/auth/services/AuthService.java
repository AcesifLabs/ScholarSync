package com.acesif.scholarsyncbackend.auth.services;

import com.acesif.scholarsyncbackend.auth.dtos.AuthResponse;
import com.acesif.scholarsyncbackend.users.entities.User;
import com.acesif.scholarsyncbackend.users.repositories.UserRepository;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

  private final UserRepository userRepository;
  private final GoogleTokenVerifier googleTokenVerifier;
  private final JwtService jwtService;

  public AuthResponse loginWithGoogle(String googleIdToken) {
    GoogleIdToken.Payload payload = googleTokenVerifier.verify(googleIdToken);

    String providerId = payload.getSubject();
    String email      = payload.getEmail();
    String name       = (String) payload.get("name");
    String avatarUrl  = (String) payload.get("picture");

    User user = userRepository
            .findByProviderAndProviderId("GOOGLE", providerId)
            .orElseGet(() -> createUser(providerId, email, name, avatarUrl));

    user.setName(name);
    user.setAvatarUrl(avatarUrl);
    userRepository.save(user);

    String jwt = jwtService.generateToken(user);

    return new AuthResponse(jwt, user);
  }

  private User createUser(String providerId, String email, String name, String avatarUrl) {
    User user = new User();
    user.setProvider("GOOGLE");
    user.setProviderId(providerId);
    user.setEmail(email);
    user.setName(name);
    user.setAvatarUrl(avatarUrl);
    return userRepository.save(user);
  }
}
