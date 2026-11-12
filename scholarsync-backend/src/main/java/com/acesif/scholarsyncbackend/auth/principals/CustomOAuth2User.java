package com.acesif.scholarsyncbackend.auth.principals;

import lombok.NonNull;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.user.OAuth2User;

import java.util.*;

public record CustomOAuth2User(OAuth2User delegate, UUID internalUserId) implements OAuth2User {

  @Override
  public Map<String, Object> getAttributes() {
    return delegate.getAttributes();
  }

  @Override
  public Collection<? extends GrantedAuthority> getAuthorities() {
    return delegate.getAuthorities();
  }

  @Override
  @NonNull
  public String getName() {
    return delegate.getName();
  }
}
