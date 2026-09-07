'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { doc, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { AppUser } from '@/types';

export function useMarcarOcorrenciasVisitadas() {
  const queryClient = useQueryClient();

  return useCallback(
    async (uid: string) => {
      const agora = Timestamp.now();
      await updateDoc(doc(db, 'users', uid), { ultimaVisitaOcorrencias: agora });
      queryClient.setQueryData<AppUser>(['appUser', uid], (old) =>
        old ? { ...old, ultimaVisitaOcorrencias: agora } : old
      );
    },
    [queryClient]
  );
}
