'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import { useProdutos } from '@/hooks/cadastro/useProdutos';
import { useCadastroForm } from '@/hooks/cadastro/useCadastroForm';
import { CadastroPanel } from '../CadastroPanel/CadastroPanel';
import type { Produto } from '@/schemas/produto';
import styles from './CadastrosTab.module.scss';

interface ProdutosTabProps {
  companyId: string | null;
}

interface ProdutoFormValues {
  nome: string;
  densidadeMin: string;
  densidadeMax: string;
}

const initialValues: ProdutoFormValues = { nome: '', densidadeMin: '', densidadeMax: '' };

function parseDensidade(valor: string) {
  return parseFloat(valor.replace(',', '.'));
}

export function ProdutosTab({ companyId }: ProdutosTabProps) {
  const { produtos, isLoading, criarProduto, isCriando, editarProduto, isEditando, excluirProduto } =
    useProdutos(companyId);

  const { modalOpen, editando, values, setValues, erro, salvando, abrir, fechar, handleSalvar } =
    useCadastroForm<Produto, ProdutoFormValues>({
      initialValues,
      toFormValues: (p) => ({
        nome: p.nome,
        densidadeMin: String(p.densidadeMin),
        densidadeMax: String(p.densidadeMax),
      }),
      validate: (v) => {
        const min = parseDensidade(v.densidadeMin);
        const max = parseDensidade(v.densidadeMax);
        if (!v.nome.trim() || isNaN(min) || isNaN(max)) return 'Preencha o nome e as densidades mínima e máxima.';
        if (min > max) return 'A densidade mínima não pode ser maior que a máxima.';
        return null;
      },
      criar: (v) =>
        criarProduto({
          nome: v.nome.trim(),
          densidadeMin: parseDensidade(v.densidadeMin),
          densidadeMax: parseDensidade(v.densidadeMax),
          companyId: v.companyId,
        }),
      editar: (v) =>
        editarProduto({
          id: v.id,
          nome: v.nome?.trim(),
          densidadeMin: v.densidadeMin !== undefined ? parseDensidade(v.densidadeMin) : undefined,
          densidadeMax: v.densidadeMax !== undefined ? parseDensidade(v.densidadeMax) : undefined,
        }),
      companyId,
      isCriando,
      isEditando,
      errorMessage: () => 'Não foi possível salvar o produto. Tente novamente.',
    });

  return (
    <CadastroPanel<Produto>
      title="Produtos"
      actionLabel="Novo produto"
      onNovo={() => abrir(null)}
      isLoading={isLoading}
      items={produtos}
      emptyMessage="Nenhum produto cadastrado."
      columns={['1fr', '140px', '140px', '96px']}
      headers={
        <>
          <th>Nome</th>
          <th>Densidade mín.</th>
          <th>Densidade máx.</th>
          <th />
        </>
      }
      renderRow={(p) => (
        <tr key={p.id}>
          <td>{p.nome}</td>
          <td>{p.densidadeMin.toFixed(2)}</td>
          <td>{p.densidadeMax.toFixed(2)}</td>
          <td className={styles.actionsCell}>
            <div className={styles.actionsRow}>
              <Button variant="ghost" onClick={() => abrir(p)}>
                <Pencil size={14} />
              </Button>
              <Button variant="cancel" onClick={() => excluirProduto(p.id)}>
                <Trash2 size={14} />
              </Button>
            </div>
          </td>
        </tr>
      )}
      modalOpen={modalOpen}
      onModalOpenChange={fechar}
      modalTitle={editando ? 'Editar produto' : 'Novo produto'}
    >
      <Input
        id="produto-nome"
        label="Nome"
        value={values.nome}
        onChange={(e) => setValues({ ...values, nome: e.target.value })}
        disabled={salvando}
      />
      <div className={styles.row}>
        <div className={styles.rowItem}>
          <Input
            id="produto-dens-min"
            label="Densidade mín. (g/cm³)"
            value={values.densidadeMin}
            onChange={(e) => setValues({ ...values, densidadeMin: e.target.value })}
            disabled={salvando}
          />
        </div>
        <div className={styles.rowItem}>
          <Input
            id="produto-dens-max"
            label="Densidade máx. (g/cm³)"
            value={values.densidadeMax}
            onChange={(e) => setValues({ ...values, densidadeMax: e.target.value })}
            disabled={salvando}
          />
        </div>
      </div>
      {erro && <p className={styles.formError}>{erro}</p>}
      <Button variant="ok" onClick={handleSalvar} loading={salvando}>
        {editando ? 'Salvar alterações' : 'Cadastrar produto'}
      </Button>
    </CadastroPanel>
  );
}
