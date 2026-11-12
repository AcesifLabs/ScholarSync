package com.acesif.scholarsyncbackend.auth.services;

import com.acesif.scholarsyncbackend.commons.config.properties.JwtProperties;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

  private final JwtProperties jwtProperties;
  private final SecretKey key;

  public JwtService(JwtProperties jwtProperties) {
    this.key = Keys.hmacShaKeyFor(jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8));
    this.jwtProperties = jwtProperties;
  }

  public String generateToken(UUID userId) {
    long expirationMillis = jwtProperties.getExpirationMs();
    Date expiration = new Date(System.currentTimeMillis() + expirationMillis);

    return Jwts.builder()
            .signWith(key)
            .subject(userId.toString())
            .issuedAt(new Date())
            .expiration(expiration)
            .compact();
  }

  public UUID extractUserId(String token) {
    return UUID.fromString(Jwts.parser()
            .verifyWith(key)
            .build()
            .parseSignedClaims(token)
            .getPayload()
            .getSubject());
  }

  public boolean isValid(String token) {
    try {
      Jwts.parser()
              .verifyWith(key)
              .build()
              .parseSignedClaims(token);
      return true;
    } catch (JwtException | IllegalArgumentException e) {
      return false;
    }
  }

}
