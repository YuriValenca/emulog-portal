'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { AlertaVencimentoPorTipo } from '@/schemas/vencimento';

interface SalvarAlertaInput {
  companyId: string;
  alertaVencimento: AlertaVencimentoPorTipo;
}

async function salvarAlertaVencimento(input: SalvarAlertaInput) {
  await updateDoc(doc(db, 'companies', input.companyId), {
    alertaVencimento: input.alertaVencimento,
  });
}

export function useConfigurarAlertaVencimento() {
  const queryClient = useQueryClient();

  const salvarMutation = useMutation({
    mutationFn: salvarAlertaVencimento,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['company', variables.companyId] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });

  return {
    salvarAlertaVencimento: salvarMutation.mutateAsync,
    isSalvando: salvarMutation.isPending,
  };
}
