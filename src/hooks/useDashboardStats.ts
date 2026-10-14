'use client';

import { useMemo } from 'react';
import { useProjetosPeriodo } from './useProjetosPeriodo';
import { useLicencas } from './useLicencas';
import { calcularEstatisticasDeFogos, calcularEstatisticasDeLicencas } from '@/lib/dashboard';
import type { ContextoFaixa } from '@/lib/densidade';
import { inicioDoPeriodo, type Periodo } from '@/lib/periodo';

export function useDashboardStats(
  companyId: string | null,
  periodo: Periodo,
  caminhaoIds: string[],
  operadorIds: string[],
  contextoFaixa: ContextoFaixa
) {
  const projetosQuery = useProjetosPeriodo(companyId, periodo);
  const licencasQuery = useLicencas(companyId);

  const data = useMemo(() => {
    if (!projetosQuery.data || !licencasQuery.data) return undefined;
    const agora = new Date();
    return {
      ...calcularEstatisticasDeFogos(
        projetosQuery.data,
        { inicio: inicioDoPeriodo(periodo, agora), caminhaoIds, operadorIds },
        contextoFaixa,
        agora
      ),
      ...calcularEstatisticasDeLicencas(licencasQuery.data, agora),
    };
  }, [projetosQuery.data, licencasQuery.data, periodo, contextoFaixa, caminhaoIds, operadorIds]);

  return {
    data,
    isLoading: projetosQuery.isLoading || licencasQuery.isLoading,
    isError: projetosQuery.isError || licencasQuery.isError,
    isAtualizando: projetosQuery.isPlaceholderData,
  };
}
