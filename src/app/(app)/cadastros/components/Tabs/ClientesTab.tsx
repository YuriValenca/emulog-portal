'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/Input/Input';
import { Switch } from '@/components/ui/Switch/Switch';
import { Button } from '@/components/ui/Button/Button';
import { useClientes } from '@/hooks/cadastro/useClientes';
import { useCadastroForm } from '@/hooks/cadastro/useCadastroForm';
import { CadastroPanel } from '../CadastroPanel/CadastroPanel';
import type { Cliente } from '@/schemas/cliente';
import styles from './CadastrosTab.module.scss';

interface ClientesTabProps {
  companyId: string | null;
}

interface ClienteFormValues {
  nome: string;
  cnpj: string;
  endereco: string;
}

const initialValues: ClienteFormValues = { nome: '', cnpj: '', endereco: '' };

export function ClientesTab({ companyId }: ClientesTabProps) {
  const { clientes, isLoading, criarCliente, isCriando, editarCliente, isEditando, excluirCliente } =
    useClientes(companyId);

  const { modalOpen, editando, values, setValues, erro, salvando, abrir, fechar, handleSalvar } =
    useCadastroForm<Cliente, ClienteFormValues>({
      initialValues,
      toFormValues: (c) => ({ nome: c.nome, cnpj: c.cnpj ?? '', endereco: c.endereco ?? '' }),
      validate: (v) => (!v.nome.trim() ? 'Informe o nome do cliente.' : null),
      criar: (v) =>
        criarCliente({
          nome: v.nome.trim(),
          cnpj: v.cnpj.trim() || null,
          endereco: v.endereco.trim() || null,
          companyId: v.companyId,
        }),
      editar: (v) =>
        editarCliente({
          id: v.id,
          nome: v.nome?.trim(),
          cnpj: v.cnpj !== undefined ? v.cnpj.trim() || null : undefined,
          endereco: v.endereco !== undefined ? v.endereco.trim() || null : undefined,
        }),
      companyId,
      isCriando,
      isEditando,
      errorMessage: () => 'Não foi possível salvar o cliente. Tente novamente.',
    });

  const handleToggleAtivo = (c: Cliente) => {
    editarCliente({ id: c.id, ativo: !c.ativo });
  };

  return (
    <CadastroPanel<Cliente>
      title="Clientes"
      actionLabel="Novo cliente"
      onNovo={() => abrir(null)}
      isLoading={isLoading}
      items={clientes}
      emptyMessage="Nenhum cliente cadastrado."
      columns={['1fr', '1fr', '100px', '96px']}
      headers={
        <>
          <th>Nome</th>
          <th>CNPJ</th>
          <th>Ativo</th>
          <th />
        </>
      }
      renderRow={(c) => (
        <tr key={c.id}>
          <td>{c.nome}</td>
          <td>{c.cnpj || '—'}</td>
          <td>
            <Switch checked={c.ativo} onCheckedChange={() => handleToggleAtivo(c)} />
          </td>
          <td className={styles.actionsCell}>
            <div className={styles.actionsRow}>
              <Button variant="ghost" onClick={() => abrir(c)}>
                <Pencil size={14} />
              </Button>
              <Button variant="cancel" onClick={() => excluirCliente(c.id)}>
                <Trash2 size={14} />
              </Button>
            </div>
          </td>
        </tr>
      )}
      modalOpen={modalOpen}
      onModalOpenChange={fechar}
      modalTitle={editando ? 'Editar cliente' : 'Novo cliente'}
    >
      <Input
        id="cliente-nome"
        label="Nome"
        value={values.nome}
        onChange={(e) => setValues({ ...values, nome: e.target.value })}
        disabled={salvando}
      />
      <Input
        id="cliente-cnpj"
        label="CNPJ (opcional)"
        value={values.cnpj}
        onChange={(e) => setValues({ ...values, cnpj: e.target.value })}
        disabled={salvando}
      />
      <Input
        id="cliente-endereco"
        label="Endereço (opcional)"
        value={values.endereco}
        onChange={(e) => setValues({ ...values, endereco: e.target.value })}
        disabled={salvando}
      />
      {erro && <p className={styles.formError}>{erro}</p>}
      <Button variant="ok" onClick={handleSalvar} loading={salvando} disabled={salvando || !values.nome.trim()}>
        {editando ? 'Salvar alterações' : 'Cadastrar cliente'}
      </Button>
    </CadastroPanel>
  );
}
