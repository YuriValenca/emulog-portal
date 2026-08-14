'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDoc, collection, deleteDoc, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { caminhaoSchema, type Caminhao } from '@/schemas/caminhao';

interface NovaUmbInput {
  placa: string;
  tag: string;
  companyId: string;
}

interface EditarUmbInput {
  id: string;
  placa: string;
  tag: string;
}

async function fetchCaminhoes(companyId: string): Promise<Caminhao[]> {
  const q = query(collection(db, 'caminhoes'), where('companyId', '==', companyId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => caminhaoSchema.parse({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.tag ?? a.placa).localeCompare(b.tag ?? b.placa, 'pt-BR'));
}

async function criarCaminhao(input: NovaUmbInput) {
  const placa = input.placa.trim().toUpperCase();
  await addDoc(collection(db, 'caminhoes'), {
    placa,
    tag: input.tag.trim(),
    descricao: `Caminhão — ${placa}`,
    companyId: input.companyId,
    criadoEm: new Date().toISOString(),
  });
}

async function editarCaminhao(input: EditarUmbInput) {
  const placa = input.placa.trim().toUpperCase();
  await updateDoc(doc(db, 'caminhoes', input.id), {
    placa,
    tag: input.tag.trim(),
    descricao: `Caminhão — ${placa}`,
  });
}

async function excluirCaminhao(id: string) {
  await deleteDoc(doc(db, 'caminhoes', id));
}

export function useCaminhoes(companyId: string | null) {
  const queryClient = useQueryClient();

  const caminhoesQuery = useQuery({
    queryKey: ['caminhoes', companyId],
    queryFn: () => fetchCaminhoes(companyId!),
    enabled: !!companyId,
  });

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['caminhoes', companyId] });

  const criarMutation = useMutation({ mutationFn: criarCaminhao, onSuccess: invalidar });
  const editarMutation = useMutation({ mutationFn: editarCaminhao, onSuccess: invalidar });
  const excluirMutation = useMutation({ mutationFn: excluirCaminhao, onSuccess: invalidar });

  return {
    caminhoes: caminhoesQuery.data ?? [],
    isLoading: caminhoesQuery.isLoading,
    criarCaminhao: criarMutation.mutateAsync,
    isCriando: criarMutation.isPending,
    editarCaminhao: editarMutation.mutateAsync,
    isEditando: editarMutation.isPending,
    excluirCaminhao: excluirMutation.mutateAsync,
  };
}
