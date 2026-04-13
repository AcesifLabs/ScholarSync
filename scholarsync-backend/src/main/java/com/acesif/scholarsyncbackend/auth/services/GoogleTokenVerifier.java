package com.acesif.scholarsyncbackend.auth.services;

import com.acesif.scholarsyncbackend.commons.config.properties.GoogleOAuth;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
@RequiredArgsConstructor
public class GoogleTokenVerifier {

  private final GoogleOAuth googleOAuth;

  public GoogleIdToken.Payload verify(String idTokenString) {
    try {
      GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
              new NetHttpTransport(),
              new GsonFactory()
      )
              .setAudience(Collections.singletonList(googleOAuth.getClientId()))
              .build();

      GoogleIdToken idToken = verifier.verify(idTokenString);

      if (idToken == null) {
        throw new RuntimeException("Invalid Google ID token");
      }

      return idToken.getPayload();

    } catch (Exception e) {
      throw new RuntimeException("Google token verification failed", e);
    }
  }
}