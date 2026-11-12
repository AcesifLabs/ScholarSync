/** Cookie the backend sets after Google sign-in. The proxy only checks that it exists. */
export const AUTH_COOKIE = 'auth_token';

/** Page to return to after sign-in, read once by /auth/callback. */
export const RETURN_TO_COOKIE = 'post_login_redirect';
export const RETURN_TO_MAX_AGE_SECONDS = 600;

/** Spring Security's Google authorization endpoint, relative to BACKEND_URL. */
export const GOOGLE_OAUTH_PATH = '/oauth2/authorize/google';

export const AUTH_STALE_TIME = 5 * 60 * 1000;

/** Query flag on the home page after a signed-out visitor was sent there from a private page. */
export const SIGN_IN_REQUIRED_PARAM = 'signin';
