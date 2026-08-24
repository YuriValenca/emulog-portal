'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import { useAppAuth } from '@/hooks/useAppAuth';
import { useUsuarios } from '@/hooks/cadastro/useUsuarios';
import { useCadastroForm } from '@/hooks/cadastro/useCadastroForm';
import { CadastroPanel } from '../CadastroPanel/CadastroPanel';
import type { AppUser, UserRole } from '@/schemas/user';
import styles from './CadastrosTab.module.scss';

interface UsuariosTabProps {
  companyId: string | null;
}

interface UsuarioFormValues {
  nome: string;
  email: string;
  senha: string;
  role: UserRole;
}

const initialValues: UsuarioFormValues = { nome: '', email: '', senha: '', role: 'user' };

function roleLabel(role: UserRole) {
  if (role === 'company_admin') return 'Company Admin';
  return 'Usuário';
}

export function UsuariosTab({ companyId }: UsuariosTabProps) {
  const { appUser } = useAppAuth();
  const { usuarios, isLoading, criarUsuario, isCriando, editarUsuario, isEditando, excluirUsuario } =
    useUsuarios(companyId);

  const { modalOpen, editando, values, setValues, erro, salvando, abrir, fechar, handleSalvar } =
    useCadastroForm<AppUser, UsuarioFormValues>({
      initialValues,
      toFormValues: (u) => ({
        nome: u.nome ?? '',
        email: u.email,
        senha: '',
        role: u.role === 'company_admin' ? 'company_admin' : 'user',
      }),
      validate: (v, edit) => {
        if (edit) {
          return !v.nome.trim() || !v.email.trim() ? 'Preencha nome e e-mail.' : null;
        }
        return !v.nome.trim() || !v.email.trim() || v.senha.trim().length < 6
          ? 'Preencha nome, e-mail e uma senha com no mínimo 6 caracteres.'
          : null;
      },
      criar: (v) =>
        criarUsuario({
          nome: v.nome.trim(),
          email: v.email.trim().toLowerCase(),
          senha: v.senha,
          role: 'user',
          companyId: v.companyId,
        }),
      editar: (v) => editarUsuario({ id: v.id, nome: v.nome?.trim(), email: v.email?.trim(), role: v.role }),
      companyId,
      isCriando,
      isEditando,
      errorMessage: (edit) =>
        edit ? 'Não foi possível salvar as alterações.' : 'Não foi possível criar o usuário. Verifique o e-mail informado.',
    });

  return (
    <CadastroPanel<AppUser>
      title="Usuários"
      actionLabel="Novo usuário"
      onNovo={() => abrir(null)}
      isLoading={isLoading}
      items={usuarios}
      emptyMessage="Nenhum usuário cadastrado."
      columns={['1fr', '1fr', '160px', '96px']}
      headers={
        <>
          <th>Nome</th>
          <th>Login</th>
          <th>Perfil</th>
          <th />
        </>
      }
      renderRow={(u) => (
        <tr key={u.id}>
          <td>{u.nome ?? '—'}</td>
          <td>{u.email}</td>
          <td>{roleLabel(u.role)}</td>
          <td className={styles.actionsCell}>
            <div className={styles.actionsRow}>
              <Button variant="ghost" onClick={() => abrir(u)} disabled={u.uid === appUser?.uid}>
                <Pencil size={14} />
              </Button>
              <Button variant="cancel" onClick={() => excluirUsuario(u.id)} disabled={u.uid === appUser?.uid}>
                <Trash2 size={14} />
              </Button>
            </div>
          </td>
        </tr>
      )}
      note={
        <p className={styles.note}>
          A senha é definida na criação do acesso e não pode ser reexibida — o Firebase Auth não devolve esse dado.
        </p>
      }
      modalOpen={modalOpen}
      onModalOpenChange={fechar}
      modalTitle={editando ? 'Editar usuário' : 'Novo usuário'}
    >
      <Input
        id="usuario-nome"
        label="Nome"
        value={values.nome}
        onChange={(e) => setValues({ ...values, nome: e.target.value })}
        disabled={salvando}
      />
      <Input
        id="usuario-email"
        label="E-mail"
        type="email"
        value={values.email}
        onChange={(e) => setValues({ ...values, email: e.target.value })}
        disabled={salvando}
      />
      {!editando && (
        <Input
          id="usuario-senha"
          label="Senha"
          type="password"
          value={values.senha}
          onChange={(e) => setValues({ ...values, senha: e.target.value })}
          disabled={salvando}
        />
      )}
      <div className={styles.row}>
        <Button
          variant={values.role === 'user' ? 'brand' : 'ghost'}
          onClick={() => setValues({ ...values, role: 'user' })}
          disabled={salvando}
        >
          Usuário
        </Button>
        <Button
          variant={values.role === 'company_admin' ? 'brand' : 'ghost'}
          onClick={() => setValues({ ...values, role: 'company_admin' })}
          disabled={salvando}
        >
          Company Admin
        </Button>
      </div>
      {erro && <p className={styles.formError}>{erro}</p>}
      <Button
        variant="ok"
        onClick={handleSalvar}
        loading={salvando}
        disabled={salvando || !values.nome.trim() || !values.email.trim() || (!editando && values.senha.trim().length === 0)}
      >
        {editando ? 'Salvar alterações' : 'Cadastrar usuário'}
      </Button>
    </CadastroPanel>
  );
}
