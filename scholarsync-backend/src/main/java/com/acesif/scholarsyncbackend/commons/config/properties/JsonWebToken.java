package com.acesif.scholarsyncbackend.commons.config.properties;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@Getter
@Setter
@ConfigurationProperties(prefix = "jwt")
public class JsonWebToken {
  private String secret;
  private String issuerUrl;
  private String expirationMs;
}
