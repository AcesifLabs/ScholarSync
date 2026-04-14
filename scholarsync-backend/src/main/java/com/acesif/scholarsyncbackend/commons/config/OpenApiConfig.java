package com.acesif.scholarsyncbackend.commons.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

  @Value("${server.servlet.context-path:}")
  private String contextPath;

  @Bean
  public OpenAPI customOpenAPI() {
    return new OpenAPI()
            .info(new Info()
                    .title("ScholarSync API")
                    .version("1.0.0")
                    .description("API for ScholarSync application"))
            .servers(java.util.List.of(
                    new Server().url(contextPath).description("Local server")
            ));
  }
}