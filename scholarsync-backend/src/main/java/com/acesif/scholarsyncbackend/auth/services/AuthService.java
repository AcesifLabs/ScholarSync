package com.acesif.scholarsyncbackend.auth.services;

import com.acesif.scholarsyncbackend.users.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

  private final UserRepository userRepository;
  private final OAuthService oAuthService;
  private final JwtService jwtService;


}
