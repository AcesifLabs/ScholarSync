package com.acesif.scholarsyncbackend.support;

import com.acesif.scholarsyncbackend.auth.services.JwtService;
import com.acesif.scholarsyncbackend.commons.utils.AuthCookies;
import com.acesif.scholarsyncbackend.users.entities.User;
import com.acesif.scholarsyncbackend.users.enums.AuthProvider;
import com.acesif.scholarsyncbackend.users.repositories.UserRepository;
import com.github.tomakehurst.wiremock.WireMockServer;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cache.CacheManager;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.web.client.RestClient;
import org.testcontainers.containers.MinIOContainer;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig;

/**
 * Real HTTP against a random-port server, a shared Postgres container and one WireMock server standing in for every
 * paper source, each under its own path prefix (/openalex, /crossref, /arxiv, /europepmc, /opencitations, /unpaywall),
 * and for Google's OAuth endpoints (/google).
 * Containers are started once per JVM and reused by every E2E test class.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
public abstract class E2ETestBase {

  protected static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer(
          DockerImageName.parse("pgvector/pgvector:pg16-trixie").asCompatibleSubstituteFor("postgres"));
  // Same community MinIO build as infra/docker-compose.yml (official images left Docker Hub)
  protected static final MinIOContainer MINIO = new MinIOContainer(
          DockerImageName.parse("pgsty/minio:RELEASE.2026-08-04T00-00-00Z").asCompatibleSubstituteFor("minio/minio"));
  protected static final WireMockServer SOURCES = new WireMockServer(wireMockConfig().dynamicPort());
  /** Test papers use this DOI prefix so their ids are valid paper keys. */
  protected static final String TEST_DOI_PREFIX = "10.5555/";
  protected static final JsonMapper JSON = JsonMapper.builder().build();

  static {
    POSTGRES.start();
    MINIO.start();
    SOURCES.start();
  }

  @DynamicPropertySource
  static void properties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username", POSTGRES::getUsername);
    registry.add("spring.datasource.password", POSTGRES::getPassword);
    for (String source : List.of("openalex", "crossref", "arxiv", "europepmc", "opencitations", "unpaywall")) {
      registry.add("external." + source + ".base-url", () -> SOURCES.baseUrl() + "/" + source);
    }
    // Google's OAuth endpoints, stubbed per test under /google (see OAuthLoginE2ETest)
    for (String[] endpoint : List.of(new String[]{"authorization-uri", "auth"}, new String[]{"token-uri", "token"},
            new String[]{"user-info-uri", "userinfo"}, new String[]{"jwk-set-uri", "certs"})) {
      registry.add("spring.security.oauth2.client.provider.google." + endpoint[0], () -> SOURCES.baseUrl() + "/google/" + endpoint[1]);
    }
    registry.add("storage.endpoint", MINIO::getS3URL);
    registry.add("storage.access-key", MINIO::getUserName);
    registry.add("storage.secret-key", MINIO::getPassword);
  }

  @LocalServerPort
  protected int port;

  @Autowired
  protected UserRepository userRepository;

  @Autowired
  protected JwtService jwtService;

  @Autowired
  private CacheManager cacheManager;

  @Autowired
  protected JdbcTemplate jdbc;

  /** Every source starts out answering searches with no results; tests stub what they need on top. */
  @BeforeEach
  void resetSources() {
    SOURCES.resetAll();
    clearCaches();
    jdbc.update("DELETE FROM search_cache");
    SOURCES.stubFor(get(urlPathEqualTo("/openalex/works")).atPriority(10).willReturn(okJson(SourceFixtures.openAlexPage(0))));
    SOURCES.stubFor(get(urlPathEqualTo("/crossref/works")).atPriority(10).willReturn(okJson(SourceFixtures.crossrefPage())));
    SOURCES.stubFor(get(urlPathEqualTo("/europepmc/search")).atPriority(10).willReturn(okJson(SourceFixtures.europePmcPage())));
    SOURCES.stubFor(get(urlPathEqualTo("/arxiv/query")).atPriority(10)
            .willReturn(aResponse().withHeader("Content-Type", "application/atom+xml").withBody(SourceFixtures.arxivFeed())));
  }

  protected void clearCaches() {
    cacheManager.getCacheNames().forEach(name -> cacheManager.getCache(name).clear());
  }

  protected User createUser(String name) {
    return userRepository.save(User.builder()
            .email(name.toLowerCase() + "-" + UUID.randomUUID() + "@example.com")
            .googleId(UUID.randomUUID().toString())
            .name(name)
            .primaryProvider(AuthProvider.GOOGLE)
            .lastLoginAt(Instant.now())
            .build());
  }

  protected String tokenFor(User user) {
    return jwtService.generateToken(user.getId());
  }

  /** Sends a request and returns the response for any status; {@code token} may be null for anonymous calls. */
  protected ResponseEntity<String> apiCall(HttpMethod method, String path, String token, Object body) {
    RestClient.RequestBodySpec spec = RestClient.create("http://localhost:" + port + "/scholarsync-api")
            .method(method)
            .uri(path);
    if (token != null) spec.header(HttpHeaders.COOKIE, AuthCookies.NAME + "=" + token);
    if (body != null) spec.contentType(MediaType.APPLICATION_JSON).body(body);
    return spec.exchange((req, res) -> ResponseEntity.status(res.getStatusCode())
            .headers(res.getHeaders())
            .body(new String(res.getBody().readAllBytes())), true);
  }

  protected ResponseEntity<String> apiGet(String path, String token) {
    return apiCall(HttpMethod.GET, path, token, null);
  }

  /** GET with a path and query that are already percent-encoded, sent as-is (e.g. "?q=c%2B%2B"). */
  protected ResponseEntity<String> apiGetEncoded(String encodedPathAndQuery) {
    return RestClient.create().get().uri(java.net.URI.create("http://localhost:" + port + "/scholarsync-api" + encodedPathAndQuery))
            .exchange((req, res) -> ResponseEntity.status(res.getStatusCode()).body(new String(res.getBody().readAllBytes())), true);
  }

  protected ResponseEntity<String> apiPost(String path, String token, Object body) {
    return apiCall(HttpMethod.POST, path, token, body);
  }

  protected ResponseEntity<String> apiPut(String path, String token, Object body) {
    return apiCall(HttpMethod.PUT, path, token, body);
  }

  protected ResponseEntity<String> apiPatch(String path, String token, Object body) {
    return apiCall(HttpMethod.PATCH, path, token, body);
  }

  protected ResponseEntity<String> apiDelete(String path, String token) {
    return apiCall(HttpMethod.DELETE, path, token, null);
  }

  /** A fresh paper id ("doi:10.5555~prefix-uuid") that no test has used. */
  protected static String paperKey(String prefix) {
    return "doi:" + TEST_DOI_PREFIX.replace('/', '~') + prefix + "-" + UUID.randomUUID();
  }

  /** The DOI inside a {@link #paperKey} id. */
  protected static String doiOf(String paperKey) {
    return paperKey.substring("doi:".length()).replace('~', '/');
  }

  /** The OpenAlex lookup a {@link #paperKey} id triggers. */
  protected static String openAlexPath(String paperKey) {
    return "/openalex/works/doi:" + doiOf(paperKey);
  }

  /** Lets services fetch the paper behind a {@link #paperKey} id: OpenAlex knows it, the other sources answer 404. */
  protected static void stubPaper(String paperKey, String title) {
    SOURCES.stubFor(get(urlPathEqualTo(openAlexPath(paperKey))).willReturn(okJson(
            SourceFixtures.openAlexWork("W" + (paperKey.hashCode() & 0x7fffffff), doiOf(paperKey), title, 2020, 3, "Abstract of " + title, null, "Computer Science"))));
  }

  protected static String uniqueId(String prefix) {
    return prefix + "-" + UUID.randomUUID();
  }

  protected static int status(ResponseEntity<String> response) {
    return response.getStatusCode().value();
  }

  protected static JsonNode json(ResponseEntity<String> response) {
    return JSON.readTree(response.getBody());
  }
}
