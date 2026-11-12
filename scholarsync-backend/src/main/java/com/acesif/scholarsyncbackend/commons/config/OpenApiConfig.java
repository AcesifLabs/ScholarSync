package com.acesif.scholarsyncbackend.commons.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.servers.Server;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.List;

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
            .servers(List.of(new Server().url(contextPath).description("Local server")));
  }

  /**
   * Response records always serialize every component (Jackson writes nulls), so mark their properties required
   * and the generated TypeScript types drop the blanket "?". Request DTOs (named *Request) keep optional fields.
   */
  @Bean
  public OpenApiCustomizer requiredResponseProperties() {
    return openApi -> {
      if (openApi.getComponents() == null || openApi.getComponents().getSchemas() == null) return;
      openApi.getComponents().getSchemas().forEach((name, schema) -> {
        if (name.endsWith("Request") || schema.getProperties() == null) return;
        schema.setRequired(new ArrayList<>(schema.getProperties().keySet()));
      });
    };
  }
}
