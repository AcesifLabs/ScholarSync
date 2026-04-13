package com.acesif.scholarsyncbackend.commons.config.properties;

import org.springframework.http.HttpHeaders;
import lombok.Getter;
import lombok.NonNull;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

import java.util.function.Consumer;

@Component
@Getter
@Setter
@ConfigurationProperties(prefix = "external.semantic-scholar")
public class SemanticScholar {
  private String baseUrl;
  private String apiKey;

  public Consumer<HttpHeaders> getHeaders() {
    MultiValueMap<@NonNull String, @NonNull String> headers = new LinkedMultiValueMap<>();
//    headers.add("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7");
    headers.add("Accept", "application/json");
    headers.add("Accept-Encoding", "gzip, deflate, br, zstd");
    headers.add("Accept-Language", "en-US,en;q=0.9");
    headers.add("Cache-Control", "no-cache");
    headers.add("Dnt", "1");
    headers.add("Pragma", "no-cache");
    headers.add("Priority", "u=0, i");
    headers.add("Sec-Ch-Ua", "\"Chromium\";v=\"146\", \"Not-A.Brand\";v=\"24\", \"Google Chrome\";v=\"146\"");
    headers.add("Sec-Ch-Ua-Mobile", "?0");
    headers.add("Sec-Ch-Ua-Platform", "\"Linux\"");
    headers.add("Sec-Fetch-Dest", "document");
    headers.add("Sec-Fetch-Mode", "navigate");
    headers.add("Sec-Fetch-Site", "none");
    headers.add("Sec-Fetch-User", "?1");
    headers.add("Upgrade-Insecure-Requests", "1");
    headers.add("User-Agent", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36");

    HttpHeaders httpHeaders = HttpHeaders.readOnlyHttpHeaders(headers);
    return httpHeadersConsumer -> httpHeadersConsumer.addAll(httpHeaders);
  }
}
