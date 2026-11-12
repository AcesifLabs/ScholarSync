package com.acesif.scholarsyncbackend.commons.utils;

import com.acesif.scholarsyncbackend.commons.config.properties.JwtProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
@RequiredArgsConstructor
public class AuthCookies {

  public static final String NAME = "auth_token";

  private final JwtProperties jwtConfig;

  public ResponseCookie issue(String token) {
    return build(token, Duration.ofMillis(jwtConfig.getExpirationMs()));
  }

  public ResponseCookie clear() {
    return build("", Duration.ZERO);
  }

  private ResponseCookie build(String value, Duration maxAge) {
    return ResponseCookie.from(NAME, value)
            .httpOnly(true)
            .secure(jwtConfig.isSecureCookie())
            .path("/")
            .maxAge(maxAge)
            .sameSite("Lax")
            .build();
  }
}
