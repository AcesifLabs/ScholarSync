package com.acesif.scholarsyncbackend.integrations.sources.utils;

import com.acesif.scholarsyncbackend.commons.config.properties.ExternalSourcesProperties;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.function.Consumer;

/**
 * Builds a source client's HTTP helper: RestClient with the configured connect/read timeouts, redirects followed (arXiv
 * redirects to https), and the source's throttle. HTTP/1.1 because Europe PMC's server drops the JDK client's HTTP/2
 * responses midway ("EOF reached while reading").
 */
public final class SourceHttpFactory {

  private SourceHttpFactory() {}

  /** {@code customize} adds headers such as Accept or an authorization token. */
  public static SourceHttp http(String service, ExternalSourcesProperties properties, ExternalSourcesProperties.Endpoint endpoint,
                                Consumer<RestClient.Builder> customize) {
    JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(HttpClient.newBuilder()
            .connectTimeout(properties.getConnectTimeout())
            .version(HttpClient.Version.HTTP_1_1)
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build());
    requestFactory.setReadTimeout(properties.getReadTimeout());
    RestClient.Builder builder = RestClient.builder().baseUrl(endpoint.getBaseUrl()).requestFactory(requestFactory);
    customize.accept(builder);
    SourceThrottle throttle = new SourceThrottle(service,
            properties.isThrottle() ? endpoint.getMinInterval() : Duration.ZERO, endpoint.getMaxConcurrent());
    return new SourceHttp(service, builder.build(), throttle, properties.getRetryBackoffMs());
  }

  /** Accepts JSON; most sources answer JSON only when asked. */
  public static void json(RestClient.Builder builder) {
    builder.defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE);
  }
}
