'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { intervaloDasDatas } from '@/lib/periodo';
import type { IntervaloDigitado } from '@/helpers/dataLocal';
import type { Projeto } from '@/types';

async function fetchProjetosPeriodo(companyId: string, datas: IntervaloDigitado): Promise<Projeto[]> {
  const { inicio, fim } = intervaloDasDatas(datas);
  const filtros = [where('companyId', '==', companyId)];
  if (inicio) filtros.push(where('dataCriacao', '>=', Timestamp.fromDate(inicio)));
  if (fim) filtros.push(where('dataCriacao', '<=', Timestamp.fromDate(fim)));

  const snap = await getDocs(query(collection(db, 'projetos'), ...filtros));
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as Projeto);
}

export function useProjetosPeriodo(companyId: string | null, datas: IntervaloDigitado) {
  return useQuery({
    queryKey: ['projetosPeriodo', companyId, datas],
    queryFn: () => fetchProjetosPeriodo(companyId as string, datas),
    enabled: !!companyId,
    placeholderData: keepPreviousData,
  });
}
