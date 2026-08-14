'use client';

import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Panel } from '@/components/ui/Panel/Panel';
import { Table } from '@/components/ui/Table/Table';
import { Button } from '@/components/ui/Button/Button';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { useCaminhoes } from '@/hooks/cadastro/useCaminhoes';
import type { Caminhao } from '@/schemas/caminhao';
import styles from './CadastrosTab.module.scss';

interface UmbsTabProps {
  companyId: string | null;
}

export function UmbsTab({ companyId }: UmbsTabProps) {
  const { caminhoes, isLoading, criarCaminhao, isCriando, editarCaminhao, isEditando, excluirCaminhao } =
    useCaminhoes(companyId);

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Caminhao | null>(null);
  const [placa, setPlaca] = useState('');
  const [tag, setTag] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const abrirCriacao = () => {
    setEditando(null);
    setPlaca('');
    setTag('');
    setErro(null);
    setModalOpen(true);
  };

  const abrirEdicao = (c: Caminhao) => {
    setEditando(c);
    setPlaca(c.placa);
    setTag(c.tag ?? '');
    setErro(null);
    setModalOpen(true);
  };

  const fecharModal = () => {
    setModalOpen(false);
    setEditando(null);
    setPlaca('');
    setTag('');
    setErro(null);
  };

  const handleSalvar = async () => {
    if (!companyId) return;
    if (!placa.trim()) {
      setErro('Informe a placa da UMB.');
      return;
    }
    setErro(null);
    try {
      if (editando) {
        await editarCaminhao({ id: editando.id, placa: placa.trim(), tag: tag.trim() });
      } else {
        await criarCaminhao({ placa: placa.trim(), tag: tag.trim(), companyId });
      }
      fecharModal();
    } catch {
      setErro('Não foi possível salvar a UMB. Tente novamente.');
    }
  };

  const salvando = isCriando || isEditando;
  const camposInvalidos = !placa.trim();

  return (
    <Panel
      title="UMBs"
      action={
        <Button variant="accent" icon={<Plus size={16} />} onClick={abrirCriacao}>
          Nova UMB
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
                <th>Placa</th>
                <th>Tag</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {caminhoes.map((c) => (
                <tr key={c.id}>
                  <td>{c.placa}</td>
                  <td>{c.tag || '—'}</td>
                  <td className={styles.actionsCell}>
                    <div className={styles.actionsRow}>
                      <Button variant="ghost" onClick={() => abrirEdicao(c)}>
                        <Pencil size={14} />
                      </Button>
                      <Button variant="cancel" onClick={() => excluirCaminhao(c.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          {caminhoes.length === 0 && <p className={styles.empty}>Nenhuma UMB cadastrada.</p>}
        </>
      )}

      <Modal open={modalOpen} onOpenChange={fecharModal} title={editando ? 'Editar UMB' : 'Nova UMB'}>
        <div className={styles.form}>
          <Input
            id="umb-placa"
            label="Placa"
            value={placa}
            onChange={(e) => setPlaca(e.target.value.toUpperCase())}
            disabled={salvando}
          />
          <Input
            id="umb-tag"
            label="Tag (opcional)"
            placeholder="Ex: UMB-03"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            disabled={salvando}
          />
          {erro && <p className={styles.formError}>{erro}</p>}
          <Button variant="ok" onClick={handleSalvar} loading={salvando} disabled={salvando || camposInvalidos}>
            {editando ? 'Salvar alterações' : 'Cadastrar UMB'}
          </Button>
        </div>
      </Modal>
    </Panel>
  );
}
