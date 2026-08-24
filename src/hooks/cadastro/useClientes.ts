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
  nome?: string;
  cnpj?: string | null;
  endereco?: string | null;
  ativo?: boolean;
}

async function fetchClientes(companyId: string): Promise<Cliente[]> {
  const snap = await getDocs(query(collection(db, 'clientes'), where('companyId', '==', companyId)));
  return snap.docs.map((d) => clienteSchema.parse({ id: d.id, ...d.data() }));
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
        cnpj: input.cnpj,
        endereco: input.endereco,
        ativo: true,
        companyId: input.companyId,
        criadoEm: new Date().toISOString(),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const editarMutation = useMutation({
    mutationFn: async (input: EditarClienteInput) => {
      const { id, ...rest } = input;
      await updateDoc(doc(db, 'clientes', id), rest);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const excluirMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'clientes', id));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    clientes: clientesQuery.data ?? [],
    isLoading: clientesQuery.isLoading,
    criarCliente: criarMutation.mutateAsync,
    isCriando: criarMutation.isPending,
    editarCliente: editarMutation.mutateAsync,
    isEditando: editarMutation.isPending,
    excluirCliente: excluirMutation.mutateAsync,
  };
}
