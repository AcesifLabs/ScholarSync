package com.acesif.scholarsyncbackend.auth.services;

import com.acesif.scholarsyncbackend.auth.dtos.CustomOAuth2User;
import com.acesif.scholarsyncbackend.users.entities.User;
import com.acesif.scholarsyncbackend.users.enums.EAuthProvider;
import com.acesif.scholarsyncbackend.users.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import com.acesif.scholarsyncbackend.auth.dtos.CustomOidcUser;
import com.acesif.scholarsyncbackend.auth.dtos.CustomOAuth2User;
import com.acesif.scholarsyncbackend.users.entities.User;
import com.acesif.scholarsyncbackend.users.enums.EAuthProvider;
import com.acesif.scholarsyncbackend.users.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.client.userinfo.*;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class OAuthService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {

  private final UserRepository userRepository;
  private final DefaultOAuth2UserService delegate = new DefaultOAuth2UserService();

  @Override
  public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
    OAuth2User oAuth2User = delegate.loadUser(userRequest);
    String registrationId = userRequest.getClientRegistration().getRegistrationId();

    User user = switch (registrationId) {
      case "google" -> handleGoogleUser(oAuth2User.getAttributes());
      case "orcid"  -> handleOrcidUser(oAuth2User.getAttributes());
      default -> throw new OAuth2AuthenticationException("Unsupported provider: " + registrationId);
    };

    return new CustomOAuth2User(oAuth2User, user.getId());
  }

  public User handleGoogleUser(Map<String, Object> attrs) {
    String googleId = (String) attrs.get("sub");
    String email    = (String) attrs.get("email");
    String name     = (String) attrs.get("name");
    String avatar   = (String) attrs.get("picture");

    return userRepository.findByGoogleId(googleId)
            .map(existing -> {
              existing.setName(name);
              existing.setAvatarUrl(avatar);
              existing.setLastLoginAt(Instant.now());
              return userRepository.save(existing);
            })
            .orElseGet(() -> {
              return userRepository.findByEmail(email)
                      .map(existing -> {
                        existing.setGoogleId(googleId);
                        existing.setLastLoginAt(Instant.now());
                        return userRepository.save(existing);
                      })
                      .orElseGet(() -> userRepository.save(
                              User.builder()
                                      .googleId(googleId)
                                      .email(email)
                                      .name(name)
                                      .avatarUrl(avatar)
                                      .primaryProvider(EAuthProvider.GOOGLE)
                                      .lastLoginAt(Instant.now())
                                      .build()
                      ));
            });
  }

  public User handleOrcidUser(Map<String, Object> attrs) {
    String orcidId = (String) attrs.get("sub");
    String name    = (String) attrs.get("name");
    String email   = attrs.containsKey("email")
            ? (String) attrs.get("email")
            : orcidId + "@orcid.placeholder";

    return userRepository.findByOrcidId(orcidId)
            .map(existing -> {
              existing.setLastLoginAt(Instant.now());
              return userRepository.save(existing);
            })
            .orElseGet(() -> userRepository.save(
                    User.builder()
                            .orcidId(orcidId)
                            .email(email)
                            .name(name)
                            .primaryProvider(EAuthProvider.ORCID)
                            .lastLoginAt(Instant.now())
                            .build()
            ));
  }
}