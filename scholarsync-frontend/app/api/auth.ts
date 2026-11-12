import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, unwrap } from '@/app/api/client';
import { BACKEND_URL } from '@/app/lib/constants/env.constants';
import { AUTH_STALE_TIME, GOOGLE_OAUTH_PATH, RETURN_TO_COOKIE, RETURN_TO_MAX_AGE_SECONDS } from '@/app/lib/constants/auth.constants';
import { QUERY_KEYS } from '@/app/lib/constants/query-keys.constants';
import type { User } from '@/app/lib/types/auth.types';

export function getGoogleAuthUrl() {
  return `${BACKEND_URL}${GOOGLE_OAUTH_PATH}`;
}

/** Starts Google sign-in; with `returnTo`, /auth/callback comes back to that path afterwards. */
export function signIn(returnTo?: string) {
  if (returnTo) {
    document.cookie = `${RETURN_TO_COOKIE}=${encodeURIComponent(returnTo)}; path=/; max-age=${RETURN_TO_MAX_AGE_SECONDS}; samesite=lax`;
  }
  window.location.href = getGoogleAuthUrl();
}

/** Signed out (401/403) resolves to null; network and server errors throw so the query retries and reports them. */
async function fetchCurrentUser(): Promise<User | null> {
  try {
    return await unwrap(api.GET('/api/v1/auth/me'));
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return null;
    throw error;
  }
}

export function useCurrentUser() {
  return useQuery({ queryKey: QUERY_KEYS.auth.me, queryFn: fetchCurrentUser, staleTime: AUTH_STALE_TIME });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(api.POST('/api/v1/auth/logout')),
    onSuccess: () => queryClient.setQueryData(QUERY_KEYS.auth.me, null),
  });
}
