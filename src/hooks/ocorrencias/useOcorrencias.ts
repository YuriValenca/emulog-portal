'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDoc, collection, deleteDoc, doc, getDocs, query, Timestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { chunk } from '@/lib/chunk';
import { ocorrenciaSchema, type Ocorrencia, type OcorrenciaStatus } from '@/schemas/ocorrencia';

interface CriarOcorrenciaManualInput {
  companyId: string;
  responsavelUid: string;
  tituloManual: string;
  descricao: string;
  valorReferencia: number | null;
  projetoId: string | null;
}

interface AtualizarStatusInput {
  id: string;
  status: OcorrenciaStatus;
}

async function fetchOcorrencias(companyIds: string[]): Promise<Ocorrencia[]> {
  const idChunks = chunk(companyIds, 30);
  const results = await Promise.all(
    idChunks.map(async (ids) => {
      const q = query(collection(db, 'ocorrencias'), where('companyId', 'in', ids));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ocorrenciaSchema.parse({ id: d.id, ...d.data() }));
    })
  );
  return results.flat().sort((a, b) => b.criadoEm.toMillis() - a.criadoEm.toMillis());
}

async function criarOcorrenciaManual(input: CriarOcorrenciaManualInput) {
  await addDoc(collection(db, 'ocorrencias'), {
    companyId: input.companyId,
    projetoId: input.projetoId,
    tipo: 'manual',
    tituloManual: input.tituloManual,
    origem: 'manual',
    status: 'aberta',
    descricao: input.descricao,
    valorReferencia: input.valorReferencia,
    responsavelUid: input.responsavelUid,
    criadoEm: Timestamp.now(),
  });
}

async function atualizarStatus(input: AtualizarStatusInput) {
  await updateDoc(doc(db, 'ocorrencias', input.id), { status: input.status });
}

async function excluirOcorrencia(id: string) {
  await deleteDoc(doc(db, 'ocorrencias', id));
}

export function useOcorrencias(companyIds: string[]) {
  const queryClient = useQueryClient();
  const queryKey = ['ocorrencias', companyIds];

  const ocorrenciasQuery = useQuery({
    queryKey,
    queryFn: () => fetchOcorrencias(companyIds),
    enabled: companyIds.length > 0,
  });

  const invalidar = () => queryClient.invalidateQueries({ queryKey });

  const criarMutation = useMutation({ mutationFn: criarOcorrenciaManual, onSuccess: invalidar });
  const atualizarStatusMutation = useMutation({ mutationFn: atualizarStatus, onSuccess: invalidar });
  const excluirMutation = useMutation({ mutationFn: excluirOcorrencia, onSuccess: invalidar });

  return {
    ocorrencias: ocorrenciasQuery.data ?? [],
    isLoading: ocorrenciasQuery.isLoading,
    isError: ocorrenciasQuery.isError,
    criarOcorrencia: criarMutation.mutateAsync,
    isCriando: criarMutation.isPending,
    atualizarStatus: atualizarStatusMutation.mutateAsync,
    excluirOcorrencia: excluirMutation.mutateAsync,
  };
}
