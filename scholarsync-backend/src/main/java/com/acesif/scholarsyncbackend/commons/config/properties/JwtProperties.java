package com.acesif.scholarsyncbackend.commons.config.properties;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@Getter
@Setter
@ConfigurationProperties(prefix = "jwt")
public class JwtProperties {
  private String secret;
  private String issuerUrl;
  private long expirationMs;
  private String frontendUrl;
  /** Frontend routes, relative to frontendUrl, that the OAuth2 login redirects to. */
  private String callbackPath = "/auth/callback";
  private String errorPath = "/auth/error";
  private boolean secureCookie;
}
