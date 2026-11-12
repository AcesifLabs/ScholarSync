package com.acesif.scholarsyncbackend.auth;

import com.acesif.scholarsyncbackend.support.E2ETestBase;
import com.acesif.scholarsyncbackend.users.entities.User;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class AuthApiE2ETest extends E2ETestBase {

  private static final String ME = "/api/v1/auth/me";
  private static final String LOGOUT = "/api/v1/auth/logout";

  @Value("${jwt.secret}")
  private String secret;

  private String sign(String subject, String key, long expiresInMs) {
    return Jwts.builder()
            .signWith(Keys.hmacShaKeyFor(key.getBytes(StandardCharsets.UTF_8)))
            .subject(subject)
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + expiresInMs))
            .compact();
  }

  @Test
  void meWithoutCookieIs401() {
    assertThat(apiGet(ME, null).getStatusCode().value()).isEqualTo(401);
  }

  @Test
  void meWithValidCookieReturnsUser() {
    User user = createUser("Ada");

    ResponseEntity<String> res = apiGet(ME, tokenFor(user));

    assertThat(res.getStatusCode().value()).isEqualTo(200);
    assertThat(json(res).get("id").asString()).isEqualTo(user.getId().toString());
    assertThat(json(res).get("email").asString()).isEqualTo(user.getEmail());
    assertThat(json(res).get("name").asString()).isEqualTo("Ada");
  }

  @Test
  void meWithExpiredTokenIs401() {
    User user = createUser("Expired");
    assertThat(apiGet(ME, sign(user.getId().toString(), secret, -60_000)).getStatusCode().value()).isEqualTo(401);
  }

  @Test
  void meWithTokenSignedByAnotherKeyIs401() {
    User user = createUser("Forged");
    String forged = sign(user.getId().toString(), "another-secret-another-secret-another-secret-0123", 60_000);
    assertThat(apiGet(ME, forged).getStatusCode().value()).isEqualTo(401);
  }

  @Test
  void meWithGarbageTokenIs401() {
    assertThat(apiGet(ME, "not-a-jwt").getStatusCode().value()).isEqualTo(401);
  }

  @Test
  void meForUnknownUserIs401() {
    assertThat(apiGet(ME, sign(UUID.randomUUID().toString(), secret, 60_000)).getStatusCode().value()).isEqualTo(401);
  }

  @Test
  void meWithNonUuidSubjectIs401() {
    assertThat(apiGet(ME, sign("legacy-string-id", secret, 60_000)).getStatusCode().value()).isEqualTo(401);
  }

  @Test
  void meAfterUserDeletedIs401() {
    User user = createUser("Gone");
    String token = tokenFor(user);
    userRepository.delete(user);
    assertThat(apiGet(ME, token).getStatusCode().value()).isEqualTo(401);
  }

  @Test
  void logoutClearsCookie() {
    User user = createUser("Leaving");

    ResponseEntity<String> res = apiPost(LOGOUT, tokenFor(user), null);

    assertThat(res.getStatusCode().value()).isEqualTo(200);
    String setCookie = res.getHeaders().getFirst(HttpHeaders.SET_COOKIE);
    assertThat(setCookie).startsWith("auth_token=;").contains("Max-Age=0").contains("HttpOnly");
  }

  @Test
  void logoutWithoutCookieStillSucceeds() {
    assertThat(apiPost(LOGOUT, null, null).getStatusCode().value()).isEqualTo(200);
  }
}
