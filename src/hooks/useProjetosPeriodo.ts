'use client';

import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { inicioDoPeriodo, type Periodo } from '@/lib/periodo';
import type { Projeto } from '@/types';

async function fetchProjetosPeriodo(companyId: string, periodo: Periodo): Promise<Projeto[]> {
  const inicio = inicioDoPeriodo(periodo);
  const filtros = [where('companyId', '==', companyId)];
  if (inicio) filtros.push(where('dataCriacao', '>=', Timestamp.fromDate(inicio)));

  const snap = await getDocs(query(collection(db, 'projetos'), ...filtros));
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as Projeto);
}

export function useProjetosPeriodo(companyId: string | null, periodo: Periodo) {
  return useQuery({
    queryKey: ['projetosPeriodo', companyId, periodo],
    queryFn: () => fetchProjetosPeriodo(companyId as string, periodo),
    enabled: !!companyId,
  });
}
