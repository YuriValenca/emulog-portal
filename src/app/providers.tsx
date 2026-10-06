'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppAuthProvider } from '@/hooks/useAppAuth';
import { ToastProvider } from '@/components/ui/Toast/Toast';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 30 * 60 * 1000,
            refetchOnWindowFocus: false,
            // Leitura do Firestore é custo direto no plano Spark, então montar um
            // componente não refaz busca. Mutation que precisa de refetch imediato
            // passa `refetchType: 'all'` no próprio invalidate, não mexe neste flag.
            refetchOnMount: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AppAuthProvider>{children}</AppAuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
