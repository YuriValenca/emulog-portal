'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { AlertaVencimentoPorTipo, TipoVencimentoPersonalizado } from '@/schemas/vencimento';

interface SalvarConfiguracaoInput {
  companyId: string;
  alertaVencimento: AlertaVencimentoPorTipo;
  tiposVencimento: TipoVencimentoPersonalizado[];
}

async function salvarConfiguracao(input: SalvarConfiguracaoInput) {
  await updateDoc(doc(db, 'companies', input.companyId), {
    alertaVencimento: input.alertaVencimento,
    tiposVencimento: input.tiposVencimento,
  });
}

export function useConfigurarAlertaVencimento() {
  const queryClient = useQueryClient();

  const salvarMutation = useMutation({
    mutationFn: salvarConfiguracao,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['company', variables.companyId] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });

  return {
    salvarConfiguracao: salvarMutation.mutateAsync,
    isSalvando: salvarMutation.isPending,
  };
}
