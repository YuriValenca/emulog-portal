'use client';

import { useCompanyGroup } from '@/hooks/fogos/useCompanyGroup';
import { useOcorrencias } from './useOcorrencias';

export function useOcorrenciasAbertas(companyId: string | null): number | null {
  const { companyIds } = useCompanyGroup(companyId);
  const { ocorrencias, isLoading } = useOcorrencias(companyIds);
  if (isLoading) return null;
  return ocorrencias.filter((ocorrencia) => ocorrencia.status !== 'encerrada').length;
}
