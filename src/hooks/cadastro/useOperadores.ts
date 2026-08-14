'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDoc, collection, deleteDoc, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { operadorSchema, type Operador } from '@/schemas/operador';

interface NovoOperadorInput {
  nome: string;
  cargo: string;
  companyId: string;
}

interface EditarOperadorInput {
  id: string;
  nome: string;
  cargo: string;
}

async function fetchOperadores(companyId: string): Promise<Operador[]> {
  const q = query(collection(db, 'operadores'), where('companyId', '==', companyId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => operadorSchema.parse({ id: d.id, ...d.data() }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

async function criarOperador(input: NovoOperadorInput) {
  await addDoc(collection(db, 'operadores'), {
    nome: input.nome.trim(),
    cargo: input.cargo.trim(),
    companyId: input.companyId,
    criadoEm: new Date().toISOString(),
  });
}

async function editarOperador(input: EditarOperadorInput) {
  await updateDoc(doc(db, 'operadores', input.id), {
    nome: input.nome.trim(),
    cargo: input.cargo.trim(),
  });
}

async function excluirOperador(id: string) {
  await deleteDoc(doc(db, 'operadores', id));
}

export function useOperadores(companyId: string | null) {
  const queryClient = useQueryClient();

  const operadoresQuery = useQuery({
    queryKey: ['operadores', companyId],
    queryFn: () => fetchOperadores(companyId!),
    enabled: !!companyId,
  });

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['operadores', companyId] });

  const criarMutation = useMutation({ mutationFn: criarOperador, onSuccess: invalidar });
  const editarMutation = useMutation({ mutationFn: editarOperador, onSuccess: invalidar });
  const excluirMutation = useMutation({ mutationFn: excluirOperador, onSuccess: invalidar });

  return {
    operadores: operadoresQuery.data ?? [],
    isLoading: operadoresQuery.isLoading,
    criarOperador: criarMutation.mutateAsync,
    isCriando: criarMutation.isPending,
    editarOperador: editarMutation.mutateAsync,
    isEditando: editarMutation.isPending,
    excluirOperador: excluirMutation.mutateAsync,
  };
}
