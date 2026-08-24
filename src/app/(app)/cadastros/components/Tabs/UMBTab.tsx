'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import { useCaminhoes } from '@/hooks/cadastro/useCaminhoes';
import { useCadastroForm } from '@/hooks/cadastro/useCadastroForm';
import { CadastroPanel } from '../CadastroPanel/CadastroPanel';
import type { Caminhao } from '@/schemas/caminhao';
import styles from './CadastrosTab.module.scss';

interface UmbsTabProps {
  companyId: string | null;
}

interface UmbFormValues {
  placa: string;
  tag: string;
}

const initialValues: UmbFormValues = { placa: '', tag: '' };

export function UmbsTab({ companyId }: UmbsTabProps) {
  const { caminhoes, isLoading, criarCaminhao, isCriando, editarCaminhao, isEditando, excluirCaminhao } =
    useCaminhoes(companyId);

  const { modalOpen, editando, values, setValues, erro, salvando, abrir, fechar, handleSalvar } =
    useCadastroForm<Caminhao, UmbFormValues>({
      initialValues,
      toFormValues: (c) => ({ placa: c.placa, tag: c.tag ?? '' }),
      validate: (v) => (!v.placa.trim() ? 'Informe a placa da UMB.' : null),
      criar: (v) => criarCaminhao({ placa: v.placa.trim(), tag: v.tag.trim(), companyId: v.companyId }),
      editar: (v) => editarCaminhao({ id: v.id, placa: v.placa?.trim(), tag: v.tag?.trim() }),
      companyId,
      isCriando,
      isEditando,
      errorMessage: () => 'Não foi possível salvar a UMB. Tente novamente.',
    });

  return (
    <CadastroPanel<Caminhao>
      title="UMBs"
      actionLabel="Nova UMB"
      onNovo={() => abrir(null)}
      isLoading={isLoading}
      items={caminhoes}
      emptyMessage="Nenhuma UMB cadastrada."
      columns={['1fr', '1fr', '96px']}
      headers={
        <>
          <th>Placa</th>
          <th>Tag</th>
          <th />
        </>
      }
      renderRow={(c) => (
        <tr key={c.id}>
          <td>{c.placa}</td>
          <td>{c.tag || '—'}</td>
          <td className={styles.actionsCell}>
            <div className={styles.actionsRow}>
              <Button variant="ghost" onClick={() => abrir(c)}>
                <Pencil size={14} />
              </Button>
              <Button variant="cancel" onClick={() => excluirCaminhao(c.id)}>
                <Trash2 size={14} />
              </Button>
            </div>
          </td>
        </tr>
      )}
      modalOpen={modalOpen}
      onModalOpenChange={fechar}
      modalTitle={editando ? 'Editar UMB' : 'Nova UMB'}
    >
      <Input
        id="umb-placa"
        label="Placa"
        value={values.placa}
        onChange={(e) => setValues({ ...values, placa: e.target.value.toUpperCase() })}
        disabled={salvando}
      />
      <Input
        id="umb-tag"
        label="Tag (opcional)"
        placeholder="Ex: UMB-03"
        value={values.tag}
        onChange={(e) => setValues({ ...values, tag: e.target.value })}
        disabled={salvando}
      />
      {erro && <p className={styles.formError}>{erro}</p>}
      <Button
        variant="ok"
        onClick={handleSalvar}
        loading={salvando}
        disabled={salvando || !values.placa.trim()}
      >
        {editando ? 'Salvar alterações' : 'Cadastrar UMB'}
      </Button>
    </CadastroPanel>
  );
}
