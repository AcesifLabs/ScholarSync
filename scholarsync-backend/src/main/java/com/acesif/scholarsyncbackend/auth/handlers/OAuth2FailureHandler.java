package com.acesif.scholarsyncbackend.auth.handlers;

import com.acesif.scholarsyncbackend.commons.config.properties.JsonWebToken;
import jakarta.servlet.http.*;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Component
@RequiredArgsConstructor
public class OAuth2FailureHandler extends SimpleUrlAuthenticationFailureHandler {

  private final JsonWebToken jwtConfig;

  @Override
  public void onAuthenticationFailure(
          @NonNull HttpServletRequest request,
          @NonNull HttpServletResponse response,
          AuthenticationException exception
  ) throws IOException {
    String errorMessage = URLEncoder.encode(exception.getMessage(), StandardCharsets.UTF_8);
    getRedirectStrategy().sendRedirect(
            request, response,
            jwtConfig.getFrontendUrl() + "/auth/error?reason=" + errorMessage
    );
  }
}
