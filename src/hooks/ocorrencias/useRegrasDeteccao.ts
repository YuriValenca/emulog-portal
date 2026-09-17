'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addDoc, collection, doc, getDocs,
  query, Timestamp, where, writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { chunk } from '@/lib/chunk';
import { useOcorrenciaRescan } from '@/hooks/ocorrencias/useOcorrenciasAutoScan';
import { regraDeteccaoSchema, type RegraDeteccao, type RegraOperador } from '@/schemas/regraDeteccao';

interface CriarRegraInput {
  companyId: string;
  operador: RegraOperador;
  valor1: number;
  valor2: number | null;
}

interface ExcluirRegraInput {
  regraId: string;
  companyId: string;
}

async function fetchRegras(companyId: string): Promise<RegraDeteccao[]> {
  const snap = await getDocs(query(collection(db, 'regras_deteccao'), where('companyId', '==', companyId)));
  return snap.docs.map((d) => regraDeteccaoSchema.parse({ id: d.id, ...d.data() }));
}

async function resetarVerificacaoDeFogos(companyId: string) {
  const snap = await getDocs(query(collection(db, 'projetos'), where('companyId', '==', companyId)));
  const refsParaResetar = snap.docs.filter((d) => d.data().ocorrenciasVerificadas === true).map((d) => d.ref);
  const lotes = chunk(refsParaResetar, 400);
  await Promise.all(
    lotes.map(async (lote) => {
      const batch = writeBatch(db);
      lote.forEach((ref) => batch.update(ref, { ocorrenciasVerificadas: false }));
      await batch.commit();
    })
  );
}

async function criarRegra(input: CriarRegraInput) {
  await addDoc(collection(db, 'regras_deteccao'), {
    companyId: input.companyId,
    metrica: 'diferenca_kg',
    operador: input.operador,
    valor1: input.valor1,
    valor2: input.valor2,
    criadoEm: Timestamp.now(),
  });
  await resetarVerificacaoDeFogos(input.companyId);
}

async function buscarOcorrenciasDaRegra(companyId: string) {
  const q = query(
    collection(db, 'ocorrencias'),
    where('companyId', '==', companyId),
    where('tipo', '==', 'diferenca_kg_excedente'),
    where('origem', '==', 'automatica')
  );
  return getDocs(q);
}

async function contarOcorrenciasDaRegra(companyId: string): Promise<number> {
  const snap = await buscarOcorrenciasDaRegra(companyId);
  return snap.size;
}

async function excluirRegraComOcorrencias(input: ExcluirRegraInput) {
  const snap = await buscarOcorrenciasDaRegra(input.companyId);
  const batch = writeBatch(db);
  snap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
  batch.delete(doc(db, 'regras_deteccao', input.regraId));
  await batch.commit();
}

export function useRegrasDeteccao(companyId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ['regrasDeteccao', companyId];

  const regrasQuery = useQuery({
    queryKey,
    queryFn: () => fetchRegras(companyId!),
    enabled: !!companyId,
  });

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ['ocorrencias'] });
  };

  const criarMutation = useMutation({
    mutationFn: criarRegra,
    onSuccess: (_, variables) => {
      invalidar();
      useOcorrenciaRescan.getState().requestRescan();
    },
  });
  const excluirMutation = useMutation({ mutationFn: excluirRegraComOcorrencias, onSuccess: invalidar });

  return {
    regras: regrasQuery.data ?? [],
    isLoading: regrasQuery.isLoading,
    criarRegra: criarMutation.mutateAsync,
    isCriando: criarMutation.isPending,
    contarOcorrenciasDaRegra: () => contarOcorrenciasDaRegra(companyId!),
    excluirRegra: excluirMutation.mutateAsync,
    isExcluindo: excluirMutation.isPending,
  };
}
