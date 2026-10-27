'use client';

import { useMemo } from 'react';
import { useProjetosPeriodo } from './useProjetosPeriodo';
import { useLicencas } from './useLicencas';
import { useRegrasDeteccao } from './ocorrencias/useRegrasDeteccao';
import { calcularEstatisticasDeFogos, calcularEstatisticasDeLicencas } from '@/lib/dashboard';
import type { ContextoFaixa } from '@/lib/densidade';
import { intervaloDasDatas } from '@/lib/periodo';
import type { IntervaloDigitado } from '@/helpers/dataLocal';

export function useDashboardStats(
  companyId: string | null,
  datas: IntervaloDigitado,
  caminhaoIds: string[],
  operadorIds: string[],
  contextoFaixa: ContextoFaixa
) {
  const projetosQuery = useProjetosPeriodo(companyId, datas);
  const licencasQuery = useLicencas(companyId);
  const { regras } = useRegrasDeteccao(companyId);

  const data = useMemo(() => {
    if (!projetosQuery.data || !licencasQuery.data) return undefined;
    const agora = new Date();
    return {
      ...calcularEstatisticasDeFogos(
        projetosQuery.data,
        { ...intervaloDasDatas(datas), caminhaoIds, operadorIds },
        contextoFaixa,
        regras,
        agora
      ),
      ...calcularEstatisticasDeLicencas(licencasQuery.data, agora),
    };
  }, [projetosQuery.data, licencasQuery.data, datas, contextoFaixa, regras, caminhaoIds, operadorIds]);

  return {
    data,
    isLoading: projetosQuery.isLoading || licencasQuery.isLoading,
    isError: projetosQuery.isError || licencasQuery.isError,
    isAtualizando: projetosQuery.isPlaceholderData,
  };
}
