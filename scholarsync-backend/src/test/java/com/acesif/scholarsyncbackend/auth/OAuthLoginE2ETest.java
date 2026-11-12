package com.acesif.scholarsyncbackend.auth;

import com.acesif.scholarsyncbackend.support.E2ETestBase;
import com.acesif.scholarsyncbackend.users.entities.User;
import com.acesif.scholarsyncbackend.users.enums.AuthProvider;
import io.jsonwebtoken.Jwts;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.math.BigInteger;
import java.net.URLDecoder;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.NoSuchAlgorithmException;
import java.security.interfaces.RSAPublicKey;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * The real Google sign-in flow (authorization code + OIDC) against WireMock standing in for Google: /oauth2/authorize
 * stores the request in the session and redirects, the callback exchanges the code for an ID token signed by a test key,
 * and OAuthService decides which account the Google identity maps to. Success ends in the auth cookie and a redirect to
 * the frontend's /auth/callback; a refusal ends in a redirect to /auth/error.
 */
class OAuthLoginE2ETest extends E2ETestBase {

  private static final KeyPair KEYS = rsaKeys();
  private static final String KEY_ID = "test-key";
  private static final String FRONTEND = "http://localhost:6969";

  private record Started(String state, String nonce, String session) {}

  private RestClient client() {
    // redirects are asserted, not followed
    return RestClient.builder().baseUrl("http://localhost:" + port + "/scholarsync-api")
            .requestFactory(new JdkClientHttpRequestFactory(HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NEVER).build()))
            .build();
  }

  private ResponseEntity<String> exchange(RestClient.RequestHeadersSpec<?> spec) {
    return spec.exchange((req, res) -> ResponseEntity.status(res.getStatusCode()).headers(res.getHeaders())
            .body(new String(res.getBody().readAllBytes())), true);
  }

  private Started startLogin() {
    ResponseEntity<String> res = exchange(client().get().uri("/oauth2/authorize/google"));
    assertThat(status(res)).isEqualTo(302);
    String location = res.getHeaders().getFirst(HttpHeaders.LOCATION);
    assertThat(location).startsWith(SOURCES.baseUrl() + "/google/auth");
    var query = UriComponentsBuilder.fromUriString(location).build().getQueryParams();
    String session = res.getHeaders().get(HttpHeaders.SET_COOKIE).stream()
            .filter(c -> c.startsWith("JSESSIONID=")).findFirst().orElseThrow().split(";")[0];
    return new Started(decode(query.getFirst("state")), decode(query.getFirst("nonce")), session);
  }

  /** Google answers the code exchange with an ID token (and userinfo) carrying {@code claims}. */
  private ResponseEntity<String> finishLogin(Started started, Map<String, Object> claims) {
    String code = "code-" + UUID.randomUUID();
    String accessToken = "at-" + code;
    String idToken = Jwts.builder().header().keyId(KEY_ID).and()
            .issuer("https://accounts.google.com")
            .subject((String) claims.get("sub"))
            .audience().add("test-client-id").and()
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + 300_000))
            .claims(claims)
            .claim("nonce", started.nonce())
            .signWith(KEYS.getPrivate(), Jwts.SIG.RS256)
            .compact();
    SOURCES.stubFor(get(urlPathEqualTo("/google/certs")).willReturn(okJson(jwks())));
    SOURCES.stubFor(post(urlPathEqualTo("/google/token")).withRequestBody(containing("code=" + code)).willReturn(okJson(
            JSON.writeValueAsString(Map.of("access_token", accessToken, "token_type", "Bearer", "expires_in", 3600,
                    "scope", "openid email profile", "id_token", idToken)))));
    SOURCES.stubFor(get(urlPathEqualTo("/google/userinfo")).withHeader(HttpHeaders.AUTHORIZATION, equalTo("Bearer " + accessToken))
            .willReturn(okJson(JSON.writeValueAsString(claims))));
    return exchange(client().get().uri("/login/oauth2/code/google?code={code}&state={state}", code, started.state())
            .header(HttpHeaders.COOKIE, started.session()));
  }

  private ResponseEntity<String> login(Map<String, Object> claims) {
    return finishLogin(startLogin(), claims);
  }

  private static Map<String, Object> claims(String sub, String email, boolean verified, String name) {
    return Map.of("sub", sub, "email", email, "email_verified", verified, "name", name, "picture", "https://example.com/a.png");
  }

  private static String authCookie(ResponseEntity<String> res) {
    List<String> cookies = res.getHeaders().getOrDefault(HttpHeaders.SET_COOKIE, List.of());
    return cookies.stream().filter(c -> c.startsWith("auth_token=")).findFirst()
            .map(c -> c.substring("auth_token=".length(), c.indexOf(';'))).orElse(null);
  }

  private static void assertSignedIn(ResponseEntity<String> res) {
    assertThat(status(res)).as(res.getHeaders().toString()).isEqualTo(302);
    assertThat(res.getHeaders().getFirst(HttpHeaders.LOCATION)).isEqualTo(FRONTEND + "/auth/callback");
    assertThat(authCookie(res)).isNotBlank();
    assertThat(res.getHeaders().get(HttpHeaders.SET_COOKIE).stream().filter(c -> c.startsWith("auth_token="))
            .findFirst().orElseThrow()).contains("HttpOnly").contains("SameSite=Lax");
  }

  private static void assertRefused(ResponseEntity<String> res) {
    assertThat(status(res)).isEqualTo(302);
    assertThat(res.getHeaders().getFirst(HttpHeaders.LOCATION)).startsWith(FRONTEND + "/auth/error?reason=");
    assertThat(authCookie(res)).isNull();
  }

  private User saveUser(String googleId, String email) {
    return userRepository.save(User.builder().googleId(googleId).email(email).name("Existing")
            .primaryProvider(AuthProvider.GOOGLE).lastLoginAt(Instant.now()).build());
  }

  private static String email() {
    return "oauth-" + UUID.randomUUID() + "@example.com";
  }

  @Test
  void firstLoginCreatesTheAccountSetsTheCookieAndRedirectsToTheFrontend() {
    String sub = "g-" + UUID.randomUUID();
    String email = email();

    ResponseEntity<String> res = login(claims(sub, email, true, "New Person"));

    assertSignedIn(res);
    User created = userRepository.findByGoogleId(sub).orElseThrow();
    assertThat(created.getEmail()).isEqualTo(email);
    assertThat(json(apiGet("/api/v1/auth/me", authCookie(res))).get("name").asString()).isEqualTo("New Person");
  }

  @Test
  void returningUserIsMatchedByGoogleIdAndTheProfileIsRefreshed() {
    String sub = "g-" + UUID.randomUUID();
    User existing = saveUser(sub, email());
    // a signed-in request caches the user; the login must evict it so /me shows the new name at once
    assertThat(json(apiGet("/api/v1/auth/me", tokenFor(existing))).get("name").asString()).isEqualTo("Existing");

    ResponseEntity<String> res = login(claims(sub, existing.getEmail(), true, "Renamed"));

    assertSignedIn(res);
    assertThat(json(apiGet("/api/v1/auth/me", authCookie(res))).get("id").asString()).isEqualTo(existing.getId().toString());
    assertThat(json(apiGet("/api/v1/auth/me", tokenFor(existing))).get("name").asString()).isEqualTo("Renamed");
  }

  @Test
  void aVerifiedEmailLinksAnAccountThatHasNoGoogleIdYet() {
    User existing = saveUser(null, email());
    String sub = "g-" + UUID.randomUUID();

    assertSignedIn(login(claims(sub, existing.getEmail(), true, "Linked")));

    assertThat(userRepository.findById(existing.getId()).orElseThrow().getGoogleId()).isEqualTo(sub);
  }

  @Test
  void anUnverifiedEmailCannotTakeOverAnExistingAccount() {
    User existing = saveUser(null, email());
    String sub = "g-" + UUID.randomUUID();

    assertRefused(login(claims(sub, existing.getEmail(), false, "Attacker")));

    assertThat(userRepository.findById(existing.getId()).orElseThrow().getGoogleId()).isNull();
    assertThat(userRepository.findByGoogleId(sub)).isEmpty();
  }

  @Test
  void anEmailAlreadyLinkedToAnotherGoogleAccountIsRefused() {
    String original = "g-" + UUID.randomUUID();
    User existing = saveUser(original, email());

    assertRefused(login(claims("g-" + UUID.randomUUID(), existing.getEmail(), true, "Other")));

    assertThat(userRepository.findById(existing.getId()).orElseThrow().getGoogleId()).isEqualTo(original);
  }

  @Test
  void concurrentFirstLoginsOfOneGoogleAccountBothSucceedWithOneAccount() throws Exception {
    String sub = "g-" + UUID.randomUUID();
    Map<String, Object> claims = claims(sub, email(), true, "Twice");
    List<Started> started = List.of(startLogin(), startLogin(), startLogin());
    ExecutorService pool = Executors.newFixedThreadPool(started.size());
    try {
      List<Future<ResponseEntity<String>>> results = new ArrayList<>();
      for (Started s : started) results.add(pool.submit(() -> finishLogin(s, claims)));
      for (Future<ResponseEntity<String>> r : results) assertSignedIn(r.get());
    } finally {
      pool.shutdown();
    }
    assertThat(jdbc.queryForObject("SELECT count(*) FROM users WHERE google_id = ?", Long.class, sub)).isEqualTo(1);
  }

  @Test
  void aCallbackWithoutAStartedLoginIsRefused() {
    ResponseEntity<String> res = exchange(client().get().uri("/login/oauth2/code/google?code=x&state=forged"));
    assertRefused(res);
  }

  private static String decode(String value) {
    return URLDecoder.decode(value, StandardCharsets.UTF_8);
  }

  private static String jwks() {
    RSAPublicKey key = (RSAPublicKey) KEYS.getPublic();
    return JSON.writeValueAsString(Map.of("keys", List.of(Map.of("kty", "RSA", "kid", KEY_ID, "use", "sig", "alg", "RS256",
            "n", base64Url(key.getModulus()), "e", base64Url(key.getPublicExponent())))));
  }

  private static String base64Url(BigInteger value) {
    byte[] bytes = value.toByteArray();
    if (bytes.length > 1 && bytes[0] == 0) bytes = Arrays.copyOfRange(bytes, 1, bytes.length);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }

  private static KeyPair rsaKeys() {
    try {
      KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
      generator.initialize(2048);
      return generator.generateKeyPair();
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }
}
