'use client';

import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { doc, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { AppUser, Ocorrencia } from '@/types';

export function useOcorrenciasNaoVistas(ocorrencias: Ocorrencia[], appUser: AppUser | null) {
  return useMemo(() => {
    const ultimaVisita = appUser?.ultimaVisitaOcorrencias ?? null;
    return ocorrencias.some((o) => {
      if (o.status !== 'aberta') return false;
      if (!ultimaVisita) return true;
      return o.criadoEm.toMillis() > ultimaVisita.toMillis();
    });
  }, [ocorrencias, appUser]);
}

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
