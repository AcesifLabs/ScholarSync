package com.acesif.scholarsyncbackend.auth.services;

import com.acesif.scholarsyncbackend.auth.principals.CustomOAuth2User;
import com.acesif.scholarsyncbackend.users.entities.User;
import com.acesif.scholarsyncbackend.users.enums.AuthProvider;
import com.acesif.scholarsyncbackend.users.repositories.UserRepository;
import com.acesif.scholarsyncbackend.users.services.UserCache;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.oauth2.client.userinfo.*;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.oidc.StandardClaimNames;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class OAuthService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {

  private final UserRepository userRepository;
  private final UserCache userCache;
  private final DefaultOAuth2UserService delegate = new DefaultOAuth2UserService();

  @Override
  public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
    OAuth2User oAuth2User = delegate.loadUser(userRequest);
    String registrationId = userRequest.getClientRegistration().getRegistrationId();

    User user = switch (registrationId) {
      case "google" -> handleGoogleUser(oAuth2User.getAttributes());
      default -> throw new OAuth2AuthenticationException("Unsupported provider: " + registrationId);
    };

    return new CustomOAuth2User(oAuth2User, user.getId());
  }

  /**
   * The user for this Google identity: matched by Google id, else an existing account with the same email is linked,
   * else a new account is created. Linking needs Google to vouch for the email (email_verified) and the account to have
   * no Google identity yet; otherwise anyone able to put a victim's address on an unverified Google profile could take
   * over the account. Refusals surface as OAuth2AuthenticationException, which the failure handler redirects.
   */
  public User handleGoogleUser(Map<String, Object> attrs) {
    String googleId = (String) attrs.get(StandardClaimNames.SUB);
    String email    = (String) attrs.get(StandardClaimNames.EMAIL);
    String name     = (String) attrs.get(StandardClaimNames.NAME);
    String avatar   = (String) attrs.get(StandardClaimNames.PICTURE);
    boolean emailVerified = Boolean.TRUE.equals(attrs.get(StandardClaimNames.EMAIL_VERIFIED))
            || "true".equals(attrs.get(StandardClaimNames.EMAIL_VERIFIED));

    Optional<User> byGoogleId = userRepository.findByGoogleId(googleId);
    if (byGoogleId.isPresent()) {
      User existing = byGoogleId.get();
      existing.setName(name);
      existing.setAvatarUrl(avatar);
      existing.setLastLoginAt(Instant.now());
      User saved = userRepository.save(existing);
      userCache.evict(saved.getId());
      return saved;
    }
    Optional<User> byEmail = userRepository.findByEmail(email);
    if (byEmail.isPresent()) {
      User existing = byEmail.get();
      if (!emailVerified || existing.getGoogleId() != null) {
        throw new OAuth2AuthenticationException(new OAuth2Error("account_link_refused"),
                "An account with this email already exists and cannot be linked to this Google account");
      }
      existing.setGoogleId(googleId);
      existing.setLastLoginAt(Instant.now());
      User saved = userRepository.save(existing);
      userCache.evict(saved.getId());
      return saved;
    }
    try {
      return userRepository.save(User.builder()
              .googleId(googleId)
              .email(email)
              .name(name)
              .avatarUrl(avatar)
              .primaryProvider(AuthProvider.GOOGLE)
              .lastLoginAt(Instant.now())
              .build());
    } catch (DataIntegrityViolationException e) {
      // a concurrent first login for the same Google account inserted it first
      return userRepository.findByGoogleId(googleId).orElseThrow(() -> e);
    }
  }
}
