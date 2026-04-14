package com.acesif.scholarsyncbackend.auth.services;

import com.acesif.scholarsyncbackend.auth.dtos.UserDTO;
import com.acesif.scholarsyncbackend.commons.config.properties.JsonWebToken;
import com.acesif.scholarsyncbackend.users.repositories.UserRepository;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class JwtService {

  private final JsonWebToken jwtProperties;
  private final UserRepository userRepository;
  private final SecretKey key;

  public JwtService(JsonWebToken jwtProperties, UserRepository userRepository) {
    this.key = Keys.hmacShaKeyFor(jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8));
    this.jwtProperties = jwtProperties;
    this.userRepository = userRepository;
  }

  public String generateToken(String userId) {
    long expirationMillis = Long.parseLong(jwtProperties.getExpirationMs());
    Date expiration = new Date(System.currentTimeMillis() + expirationMillis);

    return Jwts.builder()
            .signWith(key)
            .subject(userId)
            .issuedAt(new Date())
            .expiration(expiration)
            .compact();
  }

  public String extractUserId(String token) {
    return Jwts.parser()
            .verifyWith(key)
            .build()
            .parseSignedClaims(token)
            .getPayload()
            .getSubject();
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

  public UserDTO getUserFromToken(String token) {
    String userId = extractUserId(token);
    return userRepository.findById(userId)
            .map(user -> new UserDTO(
                    user.getId(),
                    user.getEmail(),
                    user.getName(),
                    user.getAvatarUrl(),
                    user.getPrimaryProvider().name(),
                    user.getOrcidId()
            ))
            .orElseThrow(() -> new RuntimeException("User not found"));
  }
}
