package com.acesif.scholarsyncbackend.commons.config.properties;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/** S3-compatible storage (MinIO in dev) for uploaded PDFs. */
@Component
@Getter
@Setter
@ConfigurationProperties(prefix = "storage")
public class StorageProperties {
  private String endpoint;
  private String accessKey;
  private String secretKey;
  private String bucket;
}
