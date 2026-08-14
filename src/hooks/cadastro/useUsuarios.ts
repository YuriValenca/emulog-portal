'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, deleteDoc, doc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, secondaryAuth } from '@/lib/firebase/client';
import { appUserSchema, type AppUser, type UserRole } from '@/schemas/user';

interface NovoUsuarioInput {
  nome: string;
  email: string;
  senha: string;
  role: UserRole;
  companyId: string;
}

interface EditarUsuarioInput {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
}

async function fetchUsuarios(companyId: string): Promise<AppUser[]> {
  const q = query(collection(db, 'users'), where('companyId', '==', companyId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => appUserSchema.parse({ id: d.id, ...d.data() }))
    .filter((u) => u.role !== 'superadmin')
    .sort((a, b) => (a.nome ?? '').localeCompare(b.nome ?? '', 'pt-BR'));
}

async function criarUsuario(input: NovoUsuarioInput) {
  const cred = await createUserWithEmailAndPassword(secondaryAuth, input.email, input.senha);
  await setDoc(doc(db, 'users', cred.user.uid), {
    uid: cred.user.uid,
    email: input.email,
    nome: input.nome,
    companyId: input.companyId,
    role: input.role,
    ultimoLogin: null,
  });
  await secondaryAuth.signOut();
}

async function editarUsuario(input: EditarUsuarioInput) {
  await updateDoc(doc(db, 'users', input.id), {
    nome: input.nome.trim(),
    email: input.email.trim().toLowerCase(),
    role: input.role,
  });
}

async function excluirUsuario(userId: string) {
  await deleteDoc(doc(db, 'users', userId));
}

export function useUsuarios(companyId: string | null) {
  const queryClient = useQueryClient();

  const usuariosQuery = useQuery({
    queryKey: ['usuarios', companyId],
    queryFn: () => fetchUsuarios(companyId!),
    enabled: !!companyId,
  });

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['usuarios', companyId] });

  const criarMutation = useMutation({ mutationFn: criarUsuario, onSuccess: invalidar });
  const editarMutation = useMutation({ mutationFn: editarUsuario, onSuccess: invalidar });
  const excluirMutation = useMutation({ mutationFn: excluirUsuario, onSuccess: invalidar });

  return {
    usuarios: usuariosQuery.data ?? [],
    isLoading: usuariosQuery.isLoading,
    criarUsuario: criarMutation.mutateAsync,
    isCriando: criarMutation.isPending,
    editarUsuario: editarMutation.mutateAsync,
    isEditando: editarMutation.isPending,
    excluirUsuario: excluirMutation.mutateAsync,
  };
}
