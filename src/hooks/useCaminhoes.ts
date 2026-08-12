'use client';

import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { caminhaoSchema, type Caminhao } from '@/schemas/caminhao';

async function fetchCaminhoes(companyId: string): Promise<Caminhao[]> {
  const q = query(collection(db, 'caminhoes'), where('companyId', '==', companyId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => caminhaoSchema.parse({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.tag ?? a.placa).localeCompare(b.tag ?? b.placa, 'pt-BR'));
}

export function useCaminhoes(companyId: string | null) {
  return useQuery({
    queryKey: ['caminhoes', companyId],
    queryFn: () => fetchCaminhoes(companyId!),
    enabled: !!companyId,
  });
}
