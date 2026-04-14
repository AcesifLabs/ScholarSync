'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCurrentUser, logoutRequest } from '@/app/lib/auth';
import { AUTH_QUERY_KEY, AUTH_STALE_TIME } from './AuthProvider.constants';
import { AuthContextType } from './AuthProvider.types';

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: fetchCurrentUser,
    staleTime: AUTH_STALE_TIME,
    retry: false,
  });

  const logout = async () => {
    await logoutRequest();
    queryClient.setQueryData(AUTH_QUERY_KEY, null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
