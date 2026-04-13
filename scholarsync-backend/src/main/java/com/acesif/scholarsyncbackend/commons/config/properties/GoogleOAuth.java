package com.acesif.scholarsyncbackend.commons.config.properties;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@Getter
@Setter
@ConfigurationProperties(prefix = "external.google")
public class GoogleOAuth {
  private String clientId;
  private String clientSecret;
}
