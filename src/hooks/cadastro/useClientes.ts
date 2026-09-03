'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { clienteSchema, type Cliente } from '@/schemas/cliente';

interface CriarClienteInput {
  nome: string;
  cnpj: string | null;
  endereco: string | null;
  companyId: string;
}

interface EditarClienteInput {
  id: string;
  nome: string;
  cnpj: string | null;
  endereco: string | null;
  ativo?: boolean;
}

function normalizeCnpj(cnpj: unknown): string | null {
  if (typeof cnpj !== 'string') return null;
  const limpo = cnpj.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return limpo || null;
}

async function fetchClientes(companyId: string): Promise<Cliente[]> {
  const snap = await getDocs(query(collection(db, 'clientes'), where('companyId', '==', companyId)));
  const resultados: Cliente[] = [];
  for (const d of snap.docs) {
    const raw = { id: d.id, ...d.data(), cnpj: normalizeCnpj(d.data().cnpj) };
    const parsed = clienteSchema.safeParse(raw);
    if (!parsed.success) {
      console.error(`Documento clientes/${d.id} inválido:`, parsed.error.flatten(), raw);
      continue;
    }
    resultados.push(parsed.data);
  }
  return resultados;
}

export function useClientes(companyId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ['clientes', companyId];

  const clientesQuery = useQuery({
    queryKey,
    queryFn: () => fetchClientes(companyId!),
    enabled: !!companyId,
  });

  const criarMutation = useMutation({
    mutationFn: async (input: CriarClienteInput) => {
      await addDoc(collection(db, 'clientes'), {
        nome: input.nome,
        cnpj: normalizeCnpj(input.cnpj),
        endereco: input.endereco,
        ativo: true,
        companyId: input.companyId,
        criadoEm: new Date().toISOString(),
      });
    },
    onError: (err) => console.error('Erro ao criar cliente:', err),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const editarMutation = useMutation({
    mutationFn: async (input: EditarClienteInput) => {
      const { id, cnpj, ...rest } = input;
      await updateDoc(doc(db, 'clientes', id), { ...rest, cnpj: normalizeCnpj(cnpj) });
    },
    onError: (err) => console.error('Erro ao editar cliente:', err),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const excluirMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'clientes', id));
    },
    onError: (err) => console.error('Erro ao excluir cliente:', err),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    clientes: clientesQuery.data ?? [],
    isLoading: clientesQuery.isLoading,
    isError: clientesQuery.isError,
    error: clientesQuery.error,
    criarCliente: criarMutation.mutateAsync,
    isCriando: criarMutation.isPending,
    editarCliente: editarMutation.mutateAsync,
    isEditando: editarMutation.isPending,
    excluirCliente: excluirMutation.mutateAsync,
  };
}
