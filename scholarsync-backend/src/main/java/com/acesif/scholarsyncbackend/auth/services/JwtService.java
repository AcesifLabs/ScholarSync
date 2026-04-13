package com.acesif.scholarsyncbackend.auth.services;

import com.acesif.scholarsyncbackend.commons.config.properties.JsonWebToken;
import com.acesif.scholarsyncbackend.users.entities.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.Date;

@Service
@RequiredArgsConstructor
public class JwtService {

  private final JsonWebToken jwtProperties;
  private final DateFormat dateFormat = new SimpleDateFormat();

  public String generateToken(User user) {

    Date expirationMs;
    try {
      expirationMs = dateFormat.parse(System.currentTimeMillis() + jwtProperties.getExpirationMs());
    } catch (Exception e) {
      expirationMs = new Date();
      e.fillInStackTrace();
    }

    return Jwts.builder()
            .setSubject(user.getId().toString())
            .claim("email", user.getEmail())
            .claim("role", user.getRole().name())
            .setIssuedAt(new Date())
            .setExpiration(expirationMs)
            .signWith(getSigningKey(), SignatureAlgorithm.HS256)
            .compact();
  }

  public Claims validateAndParseClaims(String token) {
    return Jwts.parserBuilder()
            .setSigningKey(getSigningKey())
            .build()
            .parseClaimsJws(token)
            .getBody();
  }

  private Key getSigningKey() {
    return Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtProperties.getSecret()));
  }
}
