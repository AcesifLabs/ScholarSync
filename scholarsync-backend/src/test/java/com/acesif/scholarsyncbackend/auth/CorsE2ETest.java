package com.acesif.scholarsyncbackend.auth;

import com.acesif.scholarsyncbackend.support.E2ETestBase;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;

/** Only the configured frontend origin (jwt.frontend-url) may call the API from a browser, with credentials. */
class CorsE2ETest extends E2ETestBase {

  private ResponseEntity<String> preflight(String origin) {
    return RestClient.create("http://localhost:" + port + "/scholarsync-api").method(HttpMethod.OPTIONS).uri("/api/v1/library")
            .header(HttpHeaders.ORIGIN, origin)
            .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "PUT")
            .exchange((req, res) -> ResponseEntity.status(res.getStatusCode()).headers(res.getHeaders())
                    .body(new String(res.getBody().readAllBytes())), true);
  }

  @Test
  void theFrontendOriginIsAllowedWithCredentials() {
    ResponseEntity<String> res = preflight("http://localhost:6969");

    assertThat(status(res)).isEqualTo(200);
    assertThat(res.getHeaders().getFirst(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN)).isEqualTo("http://localhost:6969");
    assertThat(res.getHeaders().getFirst(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS)).isEqualTo("true");
    assertThat(res.getHeaders().getFirst(HttpHeaders.ACCESS_CONTROL_ALLOW_METHODS)).contains("PUT");
  }

  @Test
  void anyOtherOriginIsRejected() {
    ResponseEntity<String> res = preflight("https://evil.example");

    assertThat(status(res)).isEqualTo(403);
    assertThat(res.getHeaders().getFirst(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN)).isNull();

    ResponseEntity<String> simple = RestClient.create("http://localhost:" + port + "/scholarsync-api").get().uri("/api/v1/papers/autocomplete?q=x")
            .header(HttpHeaders.ORIGIN, "https://evil.example")
            .exchange((req, r) -> ResponseEntity.status(r.getStatusCode()).headers(r.getHeaders()).body(""), true);
    assertThat(status(simple)).isEqualTo(403);
  }
}
