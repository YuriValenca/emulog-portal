'use client';

import { useMemo } from 'react';
import { useAppAuth } from '@/hooks/useAppAuth';
import { useProdutos } from '@/hooks/cadastro/useProdutos';
import { criarContextoFaixa, faixaDaEmpresa, type ContextoFaixa } from '@/lib/densidade';

export function useContextoFaixa(companyId: string | null): ContextoFaixa {
  const { company } = useAppAuth();
  const { itens: produtos } = useProdutos(companyId);
  const { min, max } = faixaDaEmpresa(company);

  return useMemo(() => criarContextoFaixa(produtos, { min, max }), [produtos, min, max]);
}
