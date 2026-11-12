package com.acesif.scholarsyncbackend.auth.handlers;

import com.acesif.scholarsyncbackend.auth.principals.CustomOAuth2User;
import com.acesif.scholarsyncbackend.auth.principals.CustomOidcUser;
import com.acesif.scholarsyncbackend.auth.services.JwtService;
import com.acesif.scholarsyncbackend.commons.config.properties.JwtProperties;
import com.acesif.scholarsyncbackend.commons.utils.AuthCookies;
import jakarta.servlet.http.*;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Objects;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

  private final JwtService jwtService;
  private final JwtProperties jwtConfig;
  private final AuthCookies authCookies;

  @Override
  public void onAuthenticationSuccess(
          @NonNull HttpServletRequest request,
          @NonNull HttpServletResponse response,
          Authentication authentication
  ) throws IOException {

    Object principal = Objects.requireNonNull(authentication.getPrincipal());
    UUID userId;

    if (principal instanceof CustomOAuth2User oAuth2User) {
      userId = oAuth2User.internalUserId();
    } else if (principal instanceof CustomOidcUser oidcUser) {
      userId = oidcUser.internalUserId();
    } else {
      throw new ClassCastException("Unknown principal type: " + principal.getClass().getName());
    }

    response.addHeader(HttpHeaders.SET_COOKIE, authCookies.issue(jwtService.generateToken(userId)).toString());
    getRedirectStrategy().sendRedirect(request, response, jwtConfig.getFrontendUrl() + jwtConfig.getCallbackPath());
  }
}
