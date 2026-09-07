'use client';

import { useMemo } from 'react';
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
