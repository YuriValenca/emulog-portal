'use client';

import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { operadorSchema, type Operador } from '@/schemas/operador';

async function fetchOperadores(companyId: string): Promise<Operador[]> {
  const q = query(collection(db, 'operadores'), where('companyId', '==', companyId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => operadorSchema.parse({ id: d.id, ...d.data() }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export function useOperadores(companyId: string | null) {
  return useQuery({
    queryKey: ['operadores', companyId],
    queryFn: () => fetchOperadores(companyId!),
    enabled: !!companyId,
  });
}
