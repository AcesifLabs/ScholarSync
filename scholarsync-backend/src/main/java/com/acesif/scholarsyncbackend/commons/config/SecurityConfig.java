package com.acesif.scholarsyncbackend.commons.config;


import com.acesif.scholarsyncbackend.auth.handlers.OAuth2FailureHandler;
import com.acesif.scholarsyncbackend.auth.handlers.OAuth2SuccessHandler;
import com.acesif.scholarsyncbackend.auth.services.CustomOidcUserService;
import com.acesif.scholarsyncbackend.auth.services.OAuthService;
import com.acesif.scholarsyncbackend.commons.config.properties.JwtProperties;
import com.acesif.scholarsyncbackend.commons.constants.ApiPaths;
import com.acesif.scholarsyncbackend.commons.filters.JwtAuthFilter;
import jakarta.servlet.DispatcherType;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.*;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.*;

import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

  private final OAuthService customOAuth2UserService;
  private final CustomOidcUserService customOidcUserService;
  private final OAuth2SuccessHandler oAuth2SuccessHandler;
  private final OAuth2FailureHandler oAuth2FailureHandler;
  private final JwtAuthFilter jwtAuthFilter;
  private final JwtProperties jwtConfig;

  @Value("${springdoc.api-docs.path}")
  private String apiDocsPath;

  @Value("${springdoc.swagger-ui.path}")
  private String swaggerUiPath;

  // Turns a mapping such as /papers/{paperId}/graph into the matcher pattern /papers/*/graph
  private static String pattern(String mapping) {
    return mapping.replaceAll("\\{[^/}]+}", "*");
  }

  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session ->
                    session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            .authorizeHttpRequests(auth -> auth
                    // Streaming responses (PDFs) finish on an ASYNC dispatch that the JWT filter skips; the original
                    // REQUEST dispatch was already authorized, so don't re-check (it would see an anonymous user).
                    .dispatcherTypeMatchers(DispatcherType.ASYNC, DispatcherType.ERROR).permitAll()
                    .requestMatchers(
                            "/login/**",
                            "/oauth2/**",
                            ApiPaths.Auth.BASE + "/**",
                            "/swagger-ui/**",
                            swaggerUiPath,
                            "/v3/api-docs/**",
                            apiDocsPath + "/**"
                    ).permitAll()
                    // Public discovery: search, paper detail, citation graph, authors
                    .requestMatchers(HttpMethod.GET,
                            ApiPaths.Papers.BASE + ApiPaths.Papers.SEARCH,
                            ApiPaths.Papers.BASE + ApiPaths.Papers.AUTOCOMPLETE,
                            pattern(ApiPaths.Papers.BASE + ApiPaths.Papers.BY_ID),
                            pattern(ApiPaths.Papers.GRAPH),
                            pattern(ApiPaths.Papers.GRAPH + ApiPaths.Papers.GRAPH_EXPAND),
                            pattern(ApiPaths.Collections.BASE + ApiPaths.Collections.SHARED),
                            ApiPaths.Authors.BASE + "/**"
                    ).permitAll()
                    .anyRequest().authenticated()
            )
            .exceptionHandling(exceptions -> exceptions
                    .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))

            .oauth2Login(oauth2 -> oauth2
                    .authorizationEndpoint(endpoint ->
                            endpoint.baseUri(ApiPaths.OAuth2.AUTHORIZATION))
                    .redirectionEndpoint(endpoint ->
                            endpoint.baseUri(ApiPaths.OAuth2.REDIRECTION))
                    .userInfoEndpoint(userInfo -> userInfo
                            .userService(customOAuth2UserService)
                            .oidcUserService(customOidcUserService))
                    .successHandler(oAuth2SuccessHandler)
                    .failureHandler(oAuth2FailureHandler)
            )

            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

    return http.build();
  }

  @Bean
  public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(List.of(jwtConfig.getFrontendUrl()));
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(List.of("*"));
    config.setAllowCredentials(true);
    config.setMaxAge(3600L);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
  }
}
