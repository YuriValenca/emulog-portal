'use client';

import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Panel } from '@/components/ui/Panel/Panel';
import { Table } from '@/components/ui/Table/Table';
import { Button } from '@/components/ui/Button/Button';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Switch } from '@/components/ui/Switch/Switch';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { useClientes } from '@/hooks/cadastro/useClientes';
import type { Cliente } from '@/schemas/cliente';
import styles from './CadastrosTab.module.scss';
import { formatCNPJ, isValidCNPJ } from '@/helpers/formatCNPJ';

interface ClientesTabProps {
  companyId: string | null;
}

export function ClientesTab({ companyId }: ClientesTabProps) {
  const { clientes, isLoading, criarCliente, isCriando, editarCliente, isEditando, excluirCliente } =
    useClientes(companyId);

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [nome, setNome] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [endereco, setEndereco] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const abrirCriacao = () => {
    setEditando(null);
    setNome('');
    setCnpj('');
    setEndereco('');
    setErro(null);
    setModalOpen(true);
  };

  const abrirEdicao = (c: Cliente) => {
    setEditando(c);
    setNome(c.nome);
    setCnpj(c.cnpj ?? '');
    setEndereco(c.endereco ?? '');
    setErro(null);
    setModalOpen(true);
  };

  const fecharModal = () => {
    setModalOpen(false);
    setEditando(null);
    setNome('');
    setCnpj('');
    setEndereco('');
    setErro(null);
  };

  const handleSalvar = async () => {
    if (!companyId) return;
    if (!nome.trim()) {
      setErro('Informe o nome do cliente.');
      return;
    }
    if (cnpj.trim() && !isValidCNPJ(cnpj)) {
      setErro('CNPJ inválido. Verifique os caracteres digitados.');
      return;
    }
    setErro(null);
    try {
      if (editando) {
        await editarCliente({
          id: editando.id,
          nome: nome.trim(),
          cnpj: cnpj.trim() || null,
          endereco: endereco.trim() || null,
        });
      } else {
        await criarCliente({
          nome: nome.trim(),
          cnpj: cnpj.trim() || null,
          endereco: endereco.trim() || null,
          companyId,
        });
      }
      fecharModal();
    } catch {
      setErro('Não foi possível salvar o cliente. Tente novamente.');
    }
  };

  const handleToggleAtivo = (c: Cliente) => {
    editarCliente({ id: c.id, ativo: !c.ativo });
  };

  const salvando = isCriando || isEditando;
  const camposInvalidos = !nome.trim();

  return (
    <Panel
      title="Clientes"
      action={
        <Button variant="accent" icon={<Plus size={16} />} onClick={abrirCriacao}>
          Novo cliente
        </Button>
      }
    >
      {isLoading ? (
        <div className={styles.loadingRow}>
          <Spinner />
        </div>
      ) : (
        <>
          <Table columns={['1fr', '1fr', '100px', '96px']}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>CNPJ</th>
                <th>Ativo</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id}>
                  <td>{c.nome}</td>
                  <td>{c.cnpj || '—'}</td>
                  <td>
                    <Switch checked={c.ativo} onCheckedChange={() => handleToggleAtivo(c)} />
                  </td>
                  <td className={styles.actionsCell}>
                    <div className={styles.actionsRow}>
                      <Button variant="ghost" onClick={() => abrirEdicao(c)}>
                        <Pencil size={14} />
                      </Button>
                      <Button variant="cancel" onClick={() => excluirCliente(c.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          {clientes.length === 0 && <p className={styles.empty}>Nenhum cliente cadastrado.</p>}
        </>
      )}

      <Modal open={modalOpen} onOpenChange={fecharModal} title={editando ? 'Editar cliente' : 'Novo cliente'}>
        <div className={styles.form}>
          <Input id="cliente-nome" label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} disabled={salvando} />
          <Input
            id="cliente-cnpj"
            label="CNPJ (opcional)"
            value={cnpj}
            onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
            disabled={salvando}
          />
          <Input
            id="cliente-endereco"
            label="Endereço (opcional)"
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            disabled={salvando}
          />
          {erro && <p className={styles.formError}>{erro}</p>}
          <Button variant="ok" onClick={handleSalvar} loading={salvando} disabled={salvando || camposInvalidos}>
            {editando ? 'Salvar alterações' : 'Cadastrar cliente'}
          </Button>
        </div>
      </Modal>
    </Panel>
  );
}
