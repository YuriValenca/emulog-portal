'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { FaixaDensidade } from '@/lib/densidade';

interface SalvarFaixaInput {
  companyId: string;
  faixaDensidade: FaixaDensidade;
}

async function salvarFaixaDensidade({ companyId, faixaDensidade }: SalvarFaixaInput) {
  await updateDoc(doc(db, 'companies', companyId), { faixaDensidade });
}

export function useFaixaDensidadeEmpresa() {
  const queryClient = useQueryClient();

  const salvarMutation = useMutation({
    mutationFn: salvarFaixaDensidade,
    onSuccess: (_, { companyId }) => {
      queryClient.invalidateQueries({ queryKey: ['company', companyId] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
    onError: (erro) => console.error('Erro ao salvar faixa de densidade da empresa:', erro),
  });

  return {
    salvarFaixaDensidade: salvarMutation.mutateAsync,
    isSalvando: salvarMutation.isPending,
  };
}
