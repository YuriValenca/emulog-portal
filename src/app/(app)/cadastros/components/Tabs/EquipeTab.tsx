'use client';

import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Panel } from '@/components/ui/Panel/Panel';
import { Table } from '@/components/ui/Table/Table';
import { Button } from '@/components/ui/Button/Button';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { useOperadores } from '@/hooks/cadastro/useOperadores';
import type { Operador } from '@/schemas/operador';
import styles from './CadastrosTab.module.scss';

interface EquipeTabProps {
  companyId: string | null;
}

export function EquipeTab({ companyId }: EquipeTabProps) {
  const { operadores, isLoading, criarOperador, isCriando, editarOperador, isEditando, excluirOperador } =
    useOperadores(companyId);

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Operador | null>(null);
  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const abrirCriacao = () => {
    setEditando(null);
    setNome('');
    setCargo('');
    setErro(null);
    setModalOpen(true);
  };

  const abrirEdicao = (o: Operador) => {
    setEditando(o);
    setNome(o.nome);
    setCargo(o.cargo ?? '');
    setErro(null);
    setModalOpen(true);
  };

  const fecharModal = () => {
    setModalOpen(false);
    setEditando(null);
    setNome('');
    setCargo('');
    setErro(null);
  };

  const handleSalvar = async () => {
    if (!companyId) return;
    if (!nome.trim()) {
      setErro('Informe o nome do membro da equipe.');
      return;
    }
    setErro(null);
    try {
      if (editando) {
        await editarOperador({ id: editando.id, nome: nome.trim(), cargo: cargo.trim() });
      } else {
        await criarOperador({ nome: nome.trim(), cargo: cargo.trim(), companyId });
      }
      fecharModal();
    } catch {
      setErro('Não foi possível salvar o membro. Tente novamente.');
    }
  };

  const salvando = isCriando || isEditando;
  const camposInvalidos = !nome.trim() || !cargo.trim();

  return (
    <Panel
      title="Equipe"
      action={
        <Button variant="accent" icon={<Plus size={16} />} onClick={abrirCriacao}>
          Novo membro
        </Button>
      }
    >
      {isLoading ? (
        <div className={styles.loadingRow}>
          <Spinner />
        </div>
      ) : (
        <>
          <Table columns={['1fr', '1fr', '96px']}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Função</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {operadores.map((o) => (
                <tr key={o.id}>
                  <td>{o.nome}</td>
                  <td>{o.cargo || '—'}</td>
                  <td className={styles.actionsCell}>
                    <div className={styles.actionsRow}>
                      <Button variant="ghost" onClick={() => abrirEdicao(o)}>
                        <Pencil size={14} />
                      </Button>
                      <Button variant="cancel" onClick={() => excluirOperador(o.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          {operadores.length === 0 && <p className={styles.empty}>Nenhum membro cadastrado.</p>}
        </>
      )}

      <Modal open={modalOpen} onOpenChange={fecharModal} title={editando ? 'Editar membro' : 'Novo membro da equipe'}>
        <div className={styles.form}>
          <Input id="equipe-nome" label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} disabled={salvando} />
          <Input id="equipe-cargo" label="Função" value={cargo} onChange={(e) => setCargo(e.target.value)} disabled={salvando} />
          {erro && <p className={styles.formError}>{erro}</p>}
          <Button variant="ok" onClick={handleSalvar} loading={salvando} disabled={salvando || camposInvalidos}>
            {editando ? 'Salvar alterações' : 'Cadastrar membro'}
          </Button>
        </div>
      </Modal>
    </Panel>
  );
}
