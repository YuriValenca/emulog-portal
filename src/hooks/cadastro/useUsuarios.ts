import { doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, secondaryAuth } from '@/lib/firebase/client';
import { appUserSchema, type AppUser, type UserRole } from '@/schemas/user';
import { criarHookCadastro, porNome } from './criarHookCadastro';

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

// Instância secundária do Auth: criar pela principal deslogaria o admin. A conta no Auth
// continua existindo se o doc for apagado depois (ver README, limitações).
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

export const useUsuarios = criarHookCadastro<AppUser, NovoUsuarioInput, EditarUsuarioInput>({
  colecao: 'users',
  chave: 'usuarios',
  schema: appUserSchema,
  ordenar: porNome,
  filtrar: (u) => u.role !== 'superadmin',
  criar: criarUsuario,
  paraEdicao: (input) => ({
    nome: input.nome.trim(),
    email: input.email.trim().toLowerCase(),
    role: input.role,
  }),
});
