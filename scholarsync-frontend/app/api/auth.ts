import { BACKEND_URL } from '@/app/lib/constants/env.constants';
import { User } from '@/app/lib/types/auth.types';

export function getGoogleAuthUrl() {
  return `${BACKEND_URL}/oauth2/authorize/google`;
}

export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (res.status === 401 || res.status === 403) {
      return null;
    }

    if (!res.ok) {
      throw new Error(`Failed to fetch user: ${res.statusText}`);
    }

    return await res.json();
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
}

export async function logoutRequest(): Promise<void> {
  await fetch(`${BACKEND_URL}/api/v1/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}
