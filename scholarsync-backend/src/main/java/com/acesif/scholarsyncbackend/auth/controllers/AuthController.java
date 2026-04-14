package com.acesif.scholarsyncbackend.auth.controllers;

import com.acesif.scholarsyncbackend.auth.dtos.UserResponse;
import com.acesif.scholarsyncbackend.auth.services.AuthService;
import com.acesif.scholarsyncbackend.auth.services.JwtService;
import com.acesif.scholarsyncbackend.commons.constants.ApiPaths;
import com.acesif.scholarsyncbackend.users.entities.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping(ApiPaths.Auth.Base)
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Authentication endpoints")
public class AuthController {

  private final AuthService authService;
  private final JwtService jwtService;

  @Operation(summary = "Get current user", description = "Returns the currently authenticated user's details")
  @GetMapping("/me")
  public ResponseEntity<@NonNull UserResponse> getCurrentUser(@AuthenticationPrincipal User user) {
    if (user == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
    }

    UserResponse response = new UserResponse(
            user.getId(),
            user.getName(),
            user.getEmail(),
            user.getAvatarUrl()
    );

    return ResponseEntity.ok(response);
  }

  @Operation(summary = "Logout", description = "Logs out the current user by clearing the auth cookie")
  @PostMapping("/logout")
  public ResponseEntity<?> logout(HttpServletResponse response) {
    ResponseCookie cookie = ResponseCookie.from("auth_token", "")
            .httpOnly(true)
            .secure(false)
            .path("/")
            .maxAge(0)
            .sameSite("Lax")
            .build();
    response.addHeader("Set-Cookie", cookie.toString());
    return ResponseEntity.ok().build();
  }
}
