package com.acesif.scholarsyncbackend.commons.config;

import com.acesif.scholarsyncbackend.commons.config.properties.StorageProperties;
import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.EventListener;

@Slf4j
@Configuration
public class StorageConfig {

  @Bean
  public MinioClient minioClient(StorageProperties properties) {
    return MinioClient.builder()
            .endpoint(properties.getEndpoint())
            .credentials(properties.getAccessKey(), properties.getSecretKey())
            .build();
  }

  /** Creates the bucket if missing. Failure only disables uploads, so the app still starts without MinIO. */
  @EventListener(ApplicationReadyEvent.class)
  public void ensureBucket(ApplicationReadyEvent event) {
    StorageProperties properties = event.getApplicationContext().getBean(StorageProperties.class);
    MinioClient client = event.getApplicationContext().getBean(MinioClient.class);
    try {
      if (!client.bucketExists(BucketExistsArgs.builder().bucket(properties.getBucket()).build())) {
        client.makeBucket(MakeBucketArgs.builder().bucket(properties.getBucket()).build());
      }
    } catch (Exception e) {
      log.warn("Object storage unavailable at {}: PDF uploads will fail until it is reachable ({})",
              properties.getEndpoint(), e.getMessage());
    }
  }
}
