'use client';

import { useQuery } from '@tanstack/react-query';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { License } from '@/types';

async function fetchLicencas(companyId: string): Promise<License[]> {
  const snap = await getDocs(collection(db, 'companies', companyId, 'licenses'));
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as License);
}

export function useLicencas(companyId: string | null) {
  return useQuery({
    queryKey: ['licencas', companyId],
    queryFn: () => fetchLicencas(companyId as string),
    enabled: !!companyId,
  });
}
