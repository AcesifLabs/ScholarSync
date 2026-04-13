package com.acesif.scholarsyncbackend.commons.filters;

import com.acesif.scholarsyncbackend.auth.services.JwtService;
import com.acesif.scholarsyncbackend.users.entities.User;
import com.acesif.scholarsyncbackend.users.repositories.UserRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

  private final JwtService jwtService;
  private final UserRepository userRepository;

  @Override
  protected void doFilterInternal(HttpServletRequest request,
                                  @NonNull HttpServletResponse response,
                                  @NonNull FilterChain filterChain)
          throws ServletException, IOException {

    String authHeader = request.getHeader("Authorization");

    if (authHeader == null || !authHeader.startsWith("Bearer ")) {
      filterChain.doFilter(request, response);
      return;
    }

    String token = authHeader.substring(7);

    try {
      Claims claims = jwtService.validateAndParseClaims(token);
      Long userId = Long.parseLong(claims.getSubject());

      User user = userRepository.findById(userId)
              .orElseThrow(() -> new RuntimeException("User not found"));

      UsernamePasswordAuthenticationToken auth =
              new UsernamePasswordAuthenticationToken(user, null,
                      List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())));

      SecurityContextHolder.getContext().setAuthentication(auth);

    } catch (Exception e) {
      // Invalid token — just don't set auth, let Security handle it
    }

    filterChain.doFilter(request, response);
  }
}