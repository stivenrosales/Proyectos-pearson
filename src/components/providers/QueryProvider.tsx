'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

interface Props {
  children: ReactNode;
}

export function QueryProvider({ children }: Props) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cache data for 5 minutes before considering it stale
            staleTime: 5 * 60 * 1000,
            // Keep unused data in cache for 30 minutes
            gcTime: 30 * 60 * 1000,
            // Refetch when window regains focus (para datos frescos)
            refetchOnWindowFocus: true,
            // Refetch on mount (mejora consistencia de datos)
            refetchOnMount: true,
            // Retry 3 veces con exponential backoff (mejor para rate limiting)
            retry: 3,
            // Retry delay con exponential backoff
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
          mutations: {
            // Mutations retry 2 veces
            retry: 2,
            // Delay de 1s entre reintentos
            retryDelay: 1000,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
