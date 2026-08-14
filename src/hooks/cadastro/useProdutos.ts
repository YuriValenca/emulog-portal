'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDoc, collection, deleteDoc, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { produtoSchema, type Produto } from '@/schemas/produto';

interface NovoProdutoInput {
  nome: string;
  densidadeMin: number;
  densidadeMax: number;
  companyId: string;
}

interface EditarProdutoInput {
  id: string;
  nome: string;
  densidadeMin: number;
  densidadeMax: number;
}

async function fetchProdutos(companyId: string): Promise<Produto[]> {
  const q = query(collection(db, 'produtos'), where('companyId', '==', companyId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => produtoSchema.parse({ id: d.id, ...d.data() }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

async function criarProduto(input: NovoProdutoInput) {
  await addDoc(collection(db, 'produtos'), {
    nome: input.nome.trim(),
    densidadeMin: input.densidadeMin,
    densidadeMax: input.densidadeMax,
    companyId: input.companyId,
    criadoEm: new Date().toISOString(),
  });
}

async function editarProduto(input: EditarProdutoInput) {
  await updateDoc(doc(db, 'produtos', input.id), {
    nome: input.nome.trim(),
    densidadeMin: input.densidadeMin,
    densidadeMax: input.densidadeMax,
  });
}

async function excluirProduto(id: string) {
  await deleteDoc(doc(db, 'produtos', id));
}

export function useProdutos(companyId: string | null) {
  const queryClient = useQueryClient();

  const produtosQuery = useQuery({
    queryKey: ['produtos', companyId],
    queryFn: () => fetchProdutos(companyId!),
    enabled: !!companyId,
  });

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['produtos', companyId] });

  const criarMutation = useMutation({ mutationFn: criarProduto, onSuccess: invalidar });
  const editarMutation = useMutation({ mutationFn: editarProduto, onSuccess: invalidar });
  const excluirMutation = useMutation({ mutationFn: excluirProduto, onSuccess: invalidar });

  return {
    produtos: produtosQuery.data ?? [],
    isLoading: produtosQuery.isLoading,
    criarProduto: criarMutation.mutateAsync,
    isCriando: criarMutation.isPending,
    editarProduto: editarMutation.mutateAsync,
    isEditando: editarMutation.isPending,
    excluirProduto: excluirMutation.mutateAsync,
  };
}
