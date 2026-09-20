'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addDoc, collection, deleteDoc, doc, getDocs,
  query, Timestamp, updateDoc, where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { chunk } from '@/lib/chunk';
import { vencimentoSchema, type Vencimento, type VencimentoTipo } from '@/schemas/vencimento';

interface CriarVencimentoInput {
  companyId: string;
  responsavelUid: string;
  tipo: VencimentoTipo;
  tituloManual: string | null;
  caminhao: { id: string; placa: string } | null;
  operador: { id: string; nome: string } | null;
  descricao: string | null;
  dataVencimento: Date;
}

interface EditarDataVencimentoInput {
  id: string;
  dataVencimento: Date;
}

async function fetchVencimentos(companyIds: string[]): Promise<Vencimento[]> {
  const idChunks = chunk(companyIds, 30);
  const results = await Promise.all(
    idChunks.map(async (ids) => {
      const q = query(collection(db, 'vencimentos'), where('companyId', 'in', ids));
      const snap = await getDocs(q);
      return snap.docs.map((d) => vencimentoSchema.parse({ id: d.id, ...d.data() }));
    })
  );
  return results.flat().sort((a, b) => a.dataVencimento.toMillis() - b.dataVencimento.toMillis());
}

async function criarVencimento(input: CriarVencimentoInput) {
  await addDoc(collection(db, 'vencimentos'), {
    companyId: input.companyId,
    tipo: input.tipo,
    tituloManual: input.tituloManual,
    caminhao: input.caminhao,
    operador: input.operador,
    descricao: input.descricao,
    dataVencimento: Timestamp.fromDate(input.dataVencimento),
    status: 'ativo',
    responsavelUid: input.responsavelUid,
    criadoEm: Timestamp.now(),
    resolvidoEm: null,
  });
}

async function editarDataVencimento(input: EditarDataVencimentoInput) {
  await updateDoc(doc(db, 'vencimentos', input.id), {
    dataVencimento: Timestamp.fromDate(input.dataVencimento),
  });
}

async function marcarResolvido(id: string) {
  await updateDoc(doc(db, 'vencimentos', id), {
    status: 'resolvido',
    resolvidoEm: Timestamp.now(),
  });
}

async function reabrirVencimento(id: string) {
  await updateDoc(doc(db, 'vencimentos', id), {
    status: 'ativo',
    resolvidoEm: null,
  });
}

async function excluirVencimento(id: string) {
  await deleteDoc(doc(db, 'vencimentos', id));
}

export function useVencimentos(companyIds: string[]) {
  const queryClient = useQueryClient();
  const queryKey = ['vencimentos', companyIds];

  const vencimentosQuery = useQuery({
    queryKey,
    queryFn: () => fetchVencimentos(companyIds),
    enabled: companyIds.length > 0,
  });

  const invalidar = () => queryClient.invalidateQueries({ queryKey });

  const criarMutation = useMutation({ mutationFn: criarVencimento, onSuccess: invalidar });
  const editarMutation = useMutation({ mutationFn: editarDataVencimento, onSuccess: invalidar });
  const resolverMutation = useMutation({ mutationFn: marcarResolvido, onSuccess: invalidar });
  const reabrirMutation = useMutation({ mutationFn: reabrirVencimento, onSuccess: invalidar });
  const excluirMutation = useMutation({ mutationFn: excluirVencimento, onSuccess: invalidar });

  return {
    vencimentos: vencimentosQuery.data ?? [],
    isLoading: vencimentosQuery.isLoading,
    isError: vencimentosQuery.isError,
    criarVencimento: criarMutation.mutateAsync,
    isCriando: criarMutation.isPending,
    editarDataVencimento: editarMutation.mutateAsync,
    isEditando: editarMutation.isPending,
    marcarResolvido: resolverMutation.mutateAsync,
    reabrirVencimento: reabrirMutation.mutateAsync,
    excluirVencimento: excluirMutation.mutateAsync,
    isExcluindo: excluirMutation.isPending,
  };
}
