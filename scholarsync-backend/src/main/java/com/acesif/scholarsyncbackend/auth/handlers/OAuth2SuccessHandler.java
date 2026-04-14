package com.acesif.scholarsyncbackend.auth.handlers;

import com.acesif.scholarsyncbackend.auth.dtos.CustomOAuth2User;
import com.acesif.scholarsyncbackend.auth.dtos.CustomOidcUser;
import com.acesif.scholarsyncbackend.auth.services.JwtService;
import com.acesif.scholarsyncbackend.commons.config.properties.JsonWebToken;
import jakarta.servlet.http.*;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Objects;

@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

  private final JwtService jwtUtils;
  private final JsonWebToken jwtConfig;

  @Override
  public void onAuthenticationSuccess(
          @NonNull HttpServletRequest request,
          @NonNull HttpServletResponse response,
          Authentication authentication
  ) throws IOException {

    Object principal = Objects.requireNonNull(authentication.getPrincipal());
    String userId;

    if (principal instanceof CustomOAuth2User oAuth2User) {
      userId = oAuth2User.internalUserId();
    } else if (principal instanceof CustomOidcUser oidcUser) {
      userId = oidcUser.internalUserId();
    } else {
      throw new ClassCastException("Unknown principal type: " + principal.getClass().getName());
    }

    String token = jwtUtils.generateToken(userId);

    ResponseCookie cookie = ResponseCookie.from("auth_token", token)
            .httpOnly(true)
            .secure(false)
            .path("/")
            .maxAge(Integer.parseInt(jwtConfig.getExpirationMs()) / 1000)
            .sameSite("Lax")
            .build();

    response.addHeader("Set-Cookie", cookie.toString());

    getRedirectStrategy().sendRedirect(request, response, jwtConfig.getFrontendUrl() + "/auth/callback");
  }
}
