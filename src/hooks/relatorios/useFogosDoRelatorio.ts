'use client';

import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, Timestamp, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { projetoSchema, type Projeto } from '@/schemas/projeto';
import { buscarMidias, urlDaMidia } from '@/hooks/fogos/useMidias';
import type { FogoDoRelatorio } from '@/lib/relatorios/pdf/DocumentoDeFogos';
import type { TipoRelatorioDeFogo } from '@/lib/relatorios/fogo';

export interface IntervaloDoRelatorio {
  inicio: string;
  fim: string;
}

export const inicioDoDia = (data: string) => {
  const [ano, mes, dia] = data.split('-').map(Number);
  return new Date(ano, mes - 1, dia, 0, 0, 0);
};

export const fimDoDia = (data: string) => {
  const [ano, mes, dia] = data.split('-').map(Number);
  return new Date(ano, mes - 1, dia, 23, 59, 59, 999);
};

async function buscarFogosDoIntervalo(companyId: string, { inicio, fim }: IntervaloDoRelatorio): Promise<Projeto[]> {
  const snap = await getDocs(
    query(
      collection(db, 'projetos'),
      where('companyId', '==', companyId),
      where('dataCriacao', '>=', Timestamp.fromDate(inicioDoDia(inicio))),
      where('dataCriacao', '<=', Timestamp.fromDate(fimDoDia(fim)))
    )
  );

  const projetos: Projeto[] = [];
  for (const docSnap of snap.docs) {
    const parsed = projetoSchema.safeParse({ id: docSnap.id, ...docSnap.data() });
    if (parsed.success) projetos.push(parsed.data);
    else console.error('[useFogosDoRelatorio] projeto com formato inválido:', docSnap.id, parsed.error.flatten());
  }
  return projetos.sort((a, b) => b.dataCriacao.toMillis() - a.dataCriacao.toMillis());
}

export function useFogosDoRelatorio(companyId: string | null, intervalo: IntervaloDoRelatorio) {
  const intervaloValido = Boolean(intervalo.inicio && intervalo.fim && intervalo.inicio <= intervalo.fim);
  const fogosQuery = useQuery({
    queryKey: ['fogosDoRelatorio', companyId, intervalo.inicio, intervalo.fim],
    queryFn: () => buscarFogosDoIntervalo(companyId!, intervalo),
    enabled: !!companyId && intervaloValido,
  });

  return {
    fogos: fogosQuery.data ?? [],
    isLoading: fogosQuery.isLoading,
    isError: fogosQuery.isError,
    intervaloValido,
  };
}

// As fotos só entram no relatório do fogo e são buscadas na hora de gerar, só para os fogos escolhidos
export async function montarFogosDoRelatorio(projetos: Projeto[], tipos: TipoRelatorioDeFogo[]): Promise<FogoDoRelatorio[]> {
  if (!tipos.includes('fogo')) return projetos.map((projeto) => ({ projeto, fotos: [] }));
  return Promise.all(
    projetos.map(async (projeto) => {
      const midias = await buscarMidias(projeto.id, projeto.companyId);
      return { projeto, fotos: midias.map(urlDaMidia) };
    })
  );
}
