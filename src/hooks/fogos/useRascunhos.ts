'use client';

import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { projetoRascunhoSchema, type ProjetoRascunho } from '@/schemas/projetoRascunho';

async function fetchRascunhos(companyId: string): Promise<ProjetoRascunho[]> {
  let snap;
  try {
    snap = await getDocs(
      query(collection(db, 'projetos_rascunho'), where('companyId', '==', companyId))
    );
  } catch (erro) {
    console.error('[useRascunhos] falha ao consultar projetos_rascunho', {
      companyId,
      codigo: (erro as { code?: string })?.code,
      mensagem: (erro as { message?: string })?.message,
      erro,
    });
    throw erro;
  }

  console.info('[useRascunhos] documentos retornados:', snap.size);

  const rascunhos: ProjetoRascunho[] = [];
  for (const docSnap of snap.docs) {
    const parsed = projetoRascunhoSchema.safeParse({ id: docSnap.id, ...docSnap.data() });
    if (!parsed.success) {
      console.error('[useRascunhos] rascunho com formato inválido:', docSnap.id, parsed.error.flatten());
      continue;
    }
    rascunhos.push(parsed.data);
  }

  return rascunhos.sort((a, b) => b.dataAtualizacao.toMillis() - a.dataAtualizacao.toMillis());
}

export function useRascunhos(companyId: string | null) {
  const rascunhosQuery = useQuery({
    queryKey: ['projetosRascunho', companyId],
    queryFn: () => fetchRascunhos(companyId!),
    enabled: !!companyId,
  });

  return {
    rascunhos: rascunhosQuery.data ?? [],
    isLoading: rascunhosQuery.isLoading,
    isError: rascunhosQuery.isError,
    error: rascunhosQuery.error,
  };
}
