package com.acesif.scholarsyncbackend.auth.services;

import com.acesif.scholarsyncbackend.auth.dtos.CustomOidcUser;
import com.acesif.scholarsyncbackend.users.entities.User;
import com.acesif.scholarsyncbackend.users.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class CustomOidcUserService extends OidcUserService {

    private final UserRepository userRepository;
    private final OAuthService oAuthService;

    @Override
    public OidcUser loadUser(OidcUserRequest userRequest) throws OAuth2AuthenticationException {
        OidcUser oidcUser = super.loadUser(userRequest);
        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        Map<String, Object> attributes = oidcUser.getAttributes();

        User user = switch (registrationId) {
            case "google" -> oAuthService.handleGoogleUser(attributes);
            case "orcid" -> oAuthService.handleOrcidUser(attributes);
            default -> throw new OAuth2AuthenticationException("Unsupported provider: " + registrationId);
        };

        return new CustomOidcUser(oidcUser, user.getId());
    }
}