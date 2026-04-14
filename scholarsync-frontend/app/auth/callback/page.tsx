'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { AUTH_QUERY_KEY } from '@/app/lib/providers/AuthProvider.constants';

export default function AuthCallback() {
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    // Invalidate the auth query to force a refetch of the new session
    queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY }).then(() => {
      router.replace('/');
    });
  }, [queryClient, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="animate-pulse">Signing you in...</p>
    </div>
  );
}
