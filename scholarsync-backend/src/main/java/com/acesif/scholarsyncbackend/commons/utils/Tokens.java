package com.acesif.scholarsyncbackend.commons.utils;

import java.security.SecureRandom;
import java.util.Base64;

/** Unguessable tokens for share links and group invites. */
public final class Tokens {

  /** 192 bits of randomness; 32 characters once URL-safe base64 encoded. */
  private static final int TOKEN_BYTES = 24;
  private static final SecureRandom RANDOM = new SecureRandom();

  private Tokens() {}

  public static String newUrlToken() {
    byte[] bytes = new byte[TOKEN_BYTES];
    RANDOM.nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }
}
