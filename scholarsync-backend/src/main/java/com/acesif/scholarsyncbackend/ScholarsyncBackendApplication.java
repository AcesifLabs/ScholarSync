package com.acesif.scholarsyncbackend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableConfigurationProperties
@EnableCaching
@EnableScheduling
public class ScholarsyncBackendApplication {

  public static void main(String[] args) {
    SpringApplication.run(ScholarsyncBackendApplication.class, args);
  }

}
