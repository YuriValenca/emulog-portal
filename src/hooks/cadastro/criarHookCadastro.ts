'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addDoc, collection, deleteDoc, doc, getDocs, query, updateDoc, where,
  type DocumentData,
} from 'firebase/firestore';
import type { z } from 'zod';
import { db } from '@/lib/firebase/client';

type ComCompanyId = { companyId: string };
type ComId = { id: string };

type ConfigCriacao<N extends ComCompanyId> =
  | { paraNovoDoc: (input: N) => DocumentData; criar?: never }
  | { criar: (input: N) => Promise<unknown>; paraNovoDoc?: never };

type ConfigCadastro<T, N extends ComCompanyId, E extends ComId> = ConfigCriacao<N> & {
  colecao: string;
  /** Prefixo da query key, quando difere do nome da coleção. */
  chave?: string;
  schema: z.ZodType<T>;
  ordenar: (a: T, b: T) => number;
  normalizarDoc?: (dados: DocumentData) => DocumentData;
  filtrar?: (item: T) => boolean;
  paraEdicao: (input: E) => DocumentData;
};

function lerDocsValidos<T>(
  colecao: string,
  docs: { id: string; data: () => DocumentData }[],
  schema: z.ZodType<T>,
  normalizarDoc: (dados: DocumentData) => DocumentData
): T[] {
  const validos: T[] = [];
  for (const d of docs) {
    const bruto = normalizarDoc({ id: d.id, ...d.data() });
    const parsed = schema.safeParse(bruto);
    if (!parsed.success) {
      console.error(`Documento ${colecao}/${d.id} inválido:`, parsed.error.flatten(), bruto);
      continue;
    }
    validos.push(parsed.data);
  }
  return validos;
}

/**
 * Os cadastros só diferem na coleção, no schema e no formato do documento gravado.
 * `companyId` e `criadoEm` entram em todo doc novo porque as rules exigem `companyId == mine`.
 */
export function criarHookCadastro<T, N extends ComCompanyId, E extends ComId>(config: ConfigCadastro<T, N, E>) {
  const {
    colecao,
    chave = colecao,
    schema,
    ordenar,
    normalizarDoc = (dados) => dados,
    filtrar = () => true,
    paraEdicao,
  } = config;

  async function buscar(companyId: string): Promise<T[]> {
    const snap = await getDocs(query(collection(db, colecao), where('companyId', '==', companyId)));
    return lerDocsValidos(colecao, snap.docs, schema, normalizarDoc).filter(filtrar).sort(ordenar);
  }

  async function criar(input: N) {
    if (config.criar) return config.criar(input);
    await addDoc(collection(db, colecao), {
      ...config.paraNovoDoc(input),
      companyId: input.companyId,
      criadoEm: new Date().toISOString(),
    });
  }

  async function editar(input: E) {
    await updateDoc(doc(db, colecao, input.id), paraEdicao(input));
  }

  async function excluir(id: string) {
    await deleteDoc(doc(db, colecao, id));
  }

  return function useCadastro(companyId: string | null) {
    const queryClient = useQueryClient();
    const queryKey = [chave, companyId];

    const itensQuery = useQuery({
      queryKey,
      queryFn: () => buscar(companyId!),
      enabled: !!companyId,
    });

    const invalidar = () => queryClient.invalidateQueries({ queryKey });
    const logarErro = (acao: string) => (erro: unknown) => console.error(`Erro ao ${acao} em ${colecao}:`, erro);

    const criarMutation = useMutation({ mutationFn: criar, onSuccess: invalidar, onError: logarErro('criar') });
    const editarMutation = useMutation({ mutationFn: editar, onSuccess: invalidar, onError: logarErro('editar') });
    const excluirMutation = useMutation({ mutationFn: excluir, onSuccess: invalidar, onError: logarErro('excluir') });

    return {
      itens: itensQuery.data ?? [],
      isLoading: itensQuery.isLoading,
      isError: itensQuery.isError,
      criar: criarMutation.mutateAsync,
      isCriando: criarMutation.isPending,
      editar: editarMutation.mutateAsync,
      isEditando: editarMutation.isPending,
      excluir: excluirMutation.mutateAsync,
    };
  };
}

export function porNome<T extends { nome: string | null }>(a: T, b: T): number {
  return (a.nome ?? '').localeCompare(b.nome ?? '', 'pt-BR');
}
