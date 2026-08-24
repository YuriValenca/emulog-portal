'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import { useOperadores } from '@/hooks/cadastro/useOperadores';
import { useCadastroForm } from '@/hooks/cadastro/useCadastroForm';
import { CadastroPanel } from '../CadastroPanel/CadastroPanel';
import type { Operador } from '@/schemas/operador';
import styles from './CadastrosTab.module.scss';

interface EquipeTabProps {
  companyId: string | null;
}

interface EquipeFormValues {
  nome: string;
  cargo: string;
}

const initialValues: EquipeFormValues = { nome: '', cargo: '' };

export function EquipeTab({ companyId }: EquipeTabProps) {
  const { operadores, isLoading, criarOperador, isCriando, editarOperador, isEditando, excluirOperador } =
    useOperadores(companyId);

  const { modalOpen, editando, values, setValues, erro, salvando, abrir, fechar, handleSalvar } =
    useCadastroForm<Operador, EquipeFormValues>({
      initialValues,
      toFormValues: (o) => ({ nome: o.nome, cargo: o.cargo ?? '' }),
      validate: (v) => (!v.nome.trim() || !v.cargo.trim() ? 'Informe nome e função do membro da equipe.' : null),
      criar: (v) => criarOperador({ nome: v.nome.trim(), cargo: v.cargo.trim(), companyId: v.companyId }),
      editar: (v) => editarOperador({ id: v.id, nome: v.nome?.trim(), cargo: v.cargo?.trim() }),
      companyId,
      isCriando,
      isEditando,
      errorMessage: () => 'Não foi possível salvar o membro. Tente novamente.',
    });

  return (
    <CadastroPanel<Operador>
      title="Equipe"
      actionLabel="Novo membro"
      onNovo={() => abrir(null)}
      isLoading={isLoading}
      items={operadores}
      emptyMessage="Nenhum membro cadastrado."
      columns={['1fr', '1fr', '96px']}
      headers={
        <>
          <th>Nome</th>
          <th>Função</th>
          <th />
        </>
      }
      renderRow={(o) => (
        <tr key={o.id}>
          <td>{o.nome}</td>
          <td>{o.cargo || '—'}</td>
          <td className={styles.actionsCell}>
            <div className={styles.actionsRow}>
              <Button variant="ghost" onClick={() => abrir(o)}>
                <Pencil size={14} />
              </Button>
              <Button variant="cancel" onClick={() => excluirOperador(o.id)}>
                <Trash2 size={14} />
              </Button>
            </div>
          </td>
        </tr>
      )}
      modalOpen={modalOpen}
      onModalOpenChange={fechar}
      modalTitle={editando ? 'Editar membro' : 'Novo membro da equipe'}
    >
      <Input
        id="equipe-nome"
        label="Nome"
        value={values.nome}
        onChange={(e) => setValues({ ...values, nome: e.target.value })}
        disabled={salvando}
      />
      <Input
        id="equipe-cargo"
        label="Função"
        value={values.cargo}
        onChange={(e) => setValues({ ...values, cargo: e.target.value })}
        disabled={salvando}
      />
      {erro && <p className={styles.formError}>{erro}</p>}
      <Button
        variant="ok"
        onClick={handleSalvar}
        loading={salvando}
        disabled={salvando || !values.nome.trim() || !values.cargo.trim()}
      >
        {editando ? 'Salvar alterações' : 'Cadastrar membro'}
      </Button>
    </CadastroPanel>
  );
}
