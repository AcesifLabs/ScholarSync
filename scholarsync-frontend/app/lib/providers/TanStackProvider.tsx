'use client';

import { ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { QUERY_RETRY_COUNT, TANSTACK_QUERY_CACHE_STALE_TIME } from '@/app/lib/constants/tanstack.constants';
import { ApiError } from '@/app/api/client';

export function TanStackProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: TANSTACK_QUERY_CACHE_STALE_TIME,
        // A 4xx (not found, forbidden, invalid) won't change on retry; only retry network/5xx failures
        retry: (failureCount, error) => !(error instanceof ApiError && error.status < 500) && failureCount < QUERY_RETRY_COUNT,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
