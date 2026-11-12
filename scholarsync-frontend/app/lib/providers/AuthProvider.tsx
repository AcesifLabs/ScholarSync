'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useCurrentUser, useLogout } from '@/app/api/auth';
import type { AuthContextType } from '@/app/lib/types/auth.types';

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Retries follow the TanStackProvider default: network/5xx a few times, never a 4xx (signed out is not an error)
  const { data: user, isLoading, error, refetch } = useCurrentUser();
  const logout = useLogout();

  return (
    <AuthContext.Provider value={{ user, isLoading, error, retry: () => void refetch(), logout: async () => { await logout.mutateAsync(); } }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
