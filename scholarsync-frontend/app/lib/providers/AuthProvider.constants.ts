/**
 * Global constants for the Authentication flow
 */
export const AUTH_QUERY_KEY = ['authUser'] as const;

// Session stays fresh in cache for 5 minutes
export const AUTH_STALE_TIME = 1000 * 60 * 5;

// Routes that require an active session
export const PROTECTED_PATHS = ['/dashboard', '/profile', '/settings'];
