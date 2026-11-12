import type { Schemas } from '@/app/api/client';

export type User = Schemas['UserResponse'];

export type AuthContextType = {
  user: User | null | undefined; // undefined while the first fetch is in flight or after it failed
  isLoading: boolean;
  /** Set when /auth/me failed for a reason other than being signed out (network, 5xx). */
  error: unknown;
  retry: () => void;
  logout: () => Promise<void>;
};
