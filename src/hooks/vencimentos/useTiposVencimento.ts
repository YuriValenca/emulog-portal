'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { chunk } from '@/lib/chunk';
import type { AlertaVencimentoPorTipo, TipoVencimentoPersonalizado } from '@/schemas/vencimento';

const OPERACOES_POR_LOTE = 400;

interface EscopoDoTipo {
  companyId: string;
  tipoId: string;
}

interface ExcluirTipoInput extends EscopoDoTipo {
  tiposAtuais: TipoVencimentoPersonalizado[];
  alertaAtual: AlertaVencimentoPorTipo | undefined;
}

async function buscarVencimentosDoTipo({ companyId, tipoId }: EscopoDoTipo) {
  const snap = await getDocs(
    query(collection(db, 'vencimentos'), where('companyId', '==', companyId), where('tipoPersonalizado.id', '==', tipoId))
  );
  return snap.docs;
}

export async function contarVencimentosDoTipo(escopo: EscopoDoTipo): Promise<number> {
  return (await buscarVencimentosDoTipo(escopo)).length;
}

function semAChave(alerta: AlertaVencimentoPorTipo | undefined, chave: string): AlertaVencimentoPorTipo {
  const resto = { ...alerta };
  delete resto[chave];
  return resto;
}

// O tipo sai da empresa no último lote: se algum lote anterior falhar, o tipo continua lá e dá pra tentar de novo
async function excluirTipoComVencimentos({ companyId, tipoId, tiposAtuais, alertaAtual }: ExcluirTipoInput) {
  const refs = (await buscarVencimentosDoTipo({ companyId, tipoId })).map((docSnap) => docSnap.ref);
  const lotes = chunk(refs, OPERACOES_POR_LOTE);
  const anteriores = lotes.slice(0, -1);
  const ultimo = lotes.at(-1) ?? [];

  for (const lote of anteriores) {
    const batch = writeBatch(db);
    lote.forEach((ref) => batch.delete(ref));
    await batch.commit();
  }

  const batch = writeBatch(db);
  ultimo.forEach((ref) => batch.delete(ref));
  batch.update(doc(db, 'companies', companyId), {
    tiposVencimento: tiposAtuais.filter((tipo) => tipo.id !== tipoId),
    alertaVencimento: semAChave(alertaAtual, tipoId),
  });
  await batch.commit();
}

export function useTiposVencimento() {
  const queryClient = useQueryClient();

  const excluirMutation = useMutation({
    mutationFn: excluirTipoComVencimentos,
    onSuccess: (_, { companyId }) => {
      queryClient.invalidateQueries({ queryKey: ['company', companyId] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['vencimentos'] });
    },
  });

  return {
    excluirTipo: excluirMutation.mutateAsync,
    isExcluindo: excluirMutation.isPending,
  };
}
