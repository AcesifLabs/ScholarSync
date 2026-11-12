package com.acesif.scholarsyncbackend.commons.constants;

/** REST paths shared by the controllers and SecurityConfig, so the two cannot drift apart. */
public final class ApiPaths {

  private ApiPaths() {}

  public static final class Auth {
    private Auth() {}
    public static final String BASE = "/api/v1/auth";
  }

  public static final class Authors {
    private Authors() {}
    public static final String BASE = "/api/v1/authors";
  }

  public static final class Collections {
    private Collections() {}
    public static final String BASE = "/api/v1/collections";
    public static final String SHARED = "/shared/{token}";
  }

  public static final class Groups {
    private Groups() {}
    public static final String BASE = "/api/v1/groups";
  }

  public static final class Library {
    private Library() {}
    public static final String BASE = "/api/v1/library";
  }

  public static final class Notifications {
    private Notifications() {}
    public static final String BASE = "/api/v1/notifications";
  }

  public static final class Papers {
    private Papers() {}
    public static final String BASE = "/api/v1/papers";
    public static final String SEARCH = "/search";
    public static final String AUTOCOMPLETE = "/autocomplete";
    public static final String BY_ID = "/{paperId}";
    public static final String GRAPH = BASE + BY_ID + "/graph";
    public static final String GRAPH_EXPAND = "/expand";
    public static final String PDF = BASE + BY_ID + "/pdf";
    public static final String ANNOTATIONS = BASE + BY_ID + "/annotations";
  }

  /** Spring Security's OAuth2 login endpoints; REDIRECTION must match the registration's redirect-uri in application.yml. */
  public static final class OAuth2 {
    private OAuth2() {}
    public static final String AUTHORIZATION = "/oauth2/authorize";
    public static final String REDIRECTION = "/login/oauth2/code/*";
  }
}
