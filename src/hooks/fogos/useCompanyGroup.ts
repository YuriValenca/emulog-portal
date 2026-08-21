'use client';

import { useQuery } from '@tanstack/react-query';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { companySchema } from '@/schemas/company';

async function fetchCompanyGroup(companyId: string): Promise<string[]> {
  const snap = await getDoc(doc(db, 'companies', companyId));
  if (!snap.exists()) return [companyId];
  const company = companySchema.parse({ id: snap.id, ...snap.data() });
  const matrizId = company.parentCompanyId ?? company.id;
  const filiaisSnap = await getDocs(
    query(collection(db, 'companies'), where('parentCompanyId', '==', matrizId))
  );
  const filiaisIds = filiaisSnap.docs.map((d) => d.id);
  return Array.from(new Set([matrizId, ...filiaisIds]));
}

export function useCompanyGroup(companyId: string | null) {
  const groupQuery = useQuery({
    queryKey: ['companyGroup', companyId],
    queryFn: () => fetchCompanyGroup(companyId!),
    enabled: !!companyId,
  });

  return {
    companyIds: groupQuery.data ?? (companyId ? [companyId] : []),
    isLoading: groupQuery.isLoading,
  };
}
