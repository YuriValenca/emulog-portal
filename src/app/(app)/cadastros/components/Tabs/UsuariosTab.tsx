'use client';

import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Panel } from '@/components/ui/Panel/Panel';
import { Table } from '@/components/ui/Table/Table';
import { Button } from '@/components/ui/Button/Button';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { useAppAuth } from '@/hooks/useAppAuth';
import { useUsuarios } from '@/hooks/cadastro/useUsuarios';
import type { AppUser, UserRole } from '@/schemas/user';
import styles from './CadastrosTab.module.scss';

interface UsuariosTabProps {
  companyId: string | null;
}

function roleLabel(role: UserRole) {
  if (role === 'company_admin') return 'Company Admin';
  return 'Usuário';
}

export function UsuariosTab({ companyId }: UsuariosTabProps) {
  const { appUser } = useAppAuth();
  const { usuarios, isLoading, criarUsuario, isCriando, editarUsuario, isEditando, excluirUsuario } =
    useUsuarios(companyId);

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<AppUser | null>(null);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [erro, setErro] = useState<string | null>(null);

  const abrirCriacao = () => {
    setEditando(null);
    setNome('');
    setEmail('');
    setSenha('');
    setRole('user');
    setErro(null);
    setModalOpen(true);
  };

  const abrirEdicao = (u: AppUser) => {
    setEditando(u);
    setNome(u.nome ?? '');
    setEmail(u.email);
    setRole(u.role === 'company_admin' ? 'company_admin' : 'user');
    setErro(null);
    setModalOpen(true);
  };

  const fecharModal = () => {
    setModalOpen(false);
    setEditando(null);
    setNome('');
    setEmail('');
    setSenha('');
    setRole('user');
    setErro(null);
  };

  const handleSalvar = async () => {
    if (!companyId) return;

    if (editando) {
      if (!nome.trim() || !email.trim()) {
        setErro('Preencha nome e e-mail.');
        return;
      }
      setErro(null);
      try {
        await editarUsuario({ id: editando.id, nome: nome.trim(), email: email.trim(), role });
        fecharModal();
      } catch {
        setErro('Não foi possível salvar as alterações.');
      }
      return;
    }

    if (!nome.trim() || !email.trim() || senha.trim().length < 6) {
      setErro('Preencha nome, e-mail e uma senha com no mínimo 6 caracteres.');
      return;
    }
    setErro(null);
    try {
      await criarUsuario({ nome: nome.trim(), email: email.trim().toLowerCase(), senha, role: 'user', companyId });
      fecharModal();
    } catch {
      setErro('Não foi possível criar o usuário. Verifique o e-mail informado.');
    }
  };

  const salvando = isCriando || isEditando;
  const camposInvalidos = !nome.trim() || !email.trim() || (!editando && senha.trim().length === 0);

  return (
    <Panel
      title="Usuários"
      action={
        <Button variant="accent" icon={<Plus size={16} />} onClick={abrirCriacao}>
          Novo usuário
        </Button>
      }
    >
      {isLoading ? (
        <div className={styles.loadingRow}>
          <Spinner />
        </div>
      ) : (
        <>
          <Table columns={['1fr', '1fr', '160px', '96px']}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Login</th>
                <th>Perfil</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td>{u.nome ?? '—'}</td>
                  <td>{u.email}</td>
                  <td>{roleLabel(u.role)}</td>
                  <td className={styles.actionsCell}>
                    <div className={styles.actionsRow}>
                      <Button variant="ghost" onClick={() => abrirEdicao(u)} disabled={u.uid === appUser?.uid}>
                        <Pencil size={14} />
                      </Button>
                      <Button variant="cancel" onClick={() => excluirUsuario(u.id)} disabled={u.uid === appUser?.uid}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          {usuarios.length === 0 && <p className={styles.empty}>Nenhum usuário cadastrado.</p>}
        </>
      )}

      <p className={styles.note}>
        A senha é definida na criação do acesso e não pode ser reexibida — o Firebase Auth não devolve esse dado.
      </p>

      <Modal open={modalOpen} onOpenChange={fecharModal} title={editando ? 'Editar usuário' : 'Novo usuário'}>
        <div className={styles.form}>
          <Input id="usuario-nome" label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} disabled={salvando} />
          <Input
            id="usuario-email"
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={salvando}
          />
          {!editando && (
            <Input
              id="usuario-senha"
              label="Senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              disabled={salvando}
            />
          )}
          <div className={styles.row}>
            <Button
              variant={role === 'user' ? 'brand' : 'ghost'}
              onClick={() => setRole('user')}
              disabled={salvando}
            >
              Usuário
            </Button>
            <Button
              variant={role === 'company_admin' ? 'brand' : 'ghost'}
              onClick={() => setRole('company_admin')}
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
            disabled={salvando || camposInvalidos}
          >
            {editando ? 'Salvar alterações' : 'Cadastrar usuário'}
          </Button>
        </div>
      </Modal>
    </Panel>
  );
}
