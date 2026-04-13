package com.acesif.scholarsyncbackend.auth.controllers;

import com.acesif.scholarsyncbackend.auth.services.AuthService;
import com.acesif.scholarsyncbackend.auth.dtos.AuthResponse;
import com.acesif.scholarsyncbackend.auth.dtos.GoogleAuthRequest;
import com.acesif.scholarsyncbackend.commons.constants.ApiPaths;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiPaths.Auth.Base)
@RequiredArgsConstructor
public class AuthController {

  private final AuthService authService;

  @PostMapping("/google")
  public ResponseEntity<@NonNull AuthResponse> googleLogin(@RequestBody GoogleAuthRequest request) {
    AuthResponse response = authService.loginWithGoogle(request.idToken());
    return ResponseEntity.ok(response);
  }
}
