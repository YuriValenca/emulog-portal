'use client';

import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { MAX_DIAS_JANELA } from '@/lib/periodo';
import type { Projeto } from '@/types';

const MS_DIA = 1000 * 60 * 60 * 24;

async function fetchProjetosPeriodo(companyId: string): Promise<Projeto[]> {
  const inicioJanela = new Date(Date.now() - MAX_DIAS_JANELA * MS_DIA);

  const projetosQuery = query(
    collection(db, 'projetos'),
    where('companyId', '==', companyId),
    where('dataCriacao', '>=', Timestamp.fromDate(inicioJanela))
  );

  const snap = await getDocs(projetosQuery);
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as Projeto);
}

export function useProjetosPeriodo(companyId: string | null) {
  return useQuery({
    queryKey: ['projetosPeriodo', companyId, MAX_DIAS_JANELA],
    queryFn: () => fetchProjetosPeriodo(companyId as string),
    enabled: !!companyId,
  });
}
