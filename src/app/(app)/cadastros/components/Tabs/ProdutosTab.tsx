'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import { useProdutos } from '@/hooks/cadastro/useProdutos';
import { useCadastroForm } from '@/hooks/cadastro/useCadastroForm';
import { CadastroPanel } from '../CadastroPanel/CadastroPanel';
import { FaixaEmpresa } from '../FaixaEmpresa/FaixaEmpresa';
import { erroFaixaDigitada, lerDensidadeDigitada } from '@/lib/densidade';
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

export function ProdutosTab({ companyId }: ProdutosTabProps) {
  const { itens: produtos, isLoading, criar: criarProduto, isCriando, editar: editarProduto, isEditando, excluir: excluirProduto } =
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
        if (!v.nome.trim()) return 'Informe o nome do produto.';
        return erroFaixaDigitada(lerDensidadeDigitada(v.densidadeMin), lerDensidadeDigitada(v.densidadeMax));
      },
      criar: (v) =>
        criarProduto({
          nome: v.nome.trim(),
          densidadeMin: lerDensidadeDigitada(v.densidadeMin),
          densidadeMax: lerDensidadeDigitada(v.densidadeMax),
          companyId: v.companyId,
        }),
      editar: (v) =>
        editarProduto({
          id: v.id,
          nome: v.nome.trim(),
          densidadeMin: lerDensidadeDigitada(v.densidadeMin),
          densidadeMax: lerDensidadeDigitada(v.densidadeMax),
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
      note={<FaixaEmpresa companyId={companyId} />}
      columns={['1fr', '140px', '140px', '96px']}
      headers={
        <>
          <th>Nome</th>
          <th>Densidade mín.</th>
          <th>Densidade máx.</th>
          <th />
        </>
      }
      exclusao={{
        titulo: 'Apagar produto?',
        descricao: (p) =>
          `"${p.nome}" sai da lista. Fogos já registrados com esse produto passam a ser avaliados pela faixa da empresa.`,
        onConfirmar: (p) => excluirProduto(p.id),
      }}
      renderRow={(p, { pedirExclusao }) => (
        <tr key={p.id}>
          <td>{p.nome}</td>
          <td>{p.densidadeMin.toFixed(2)}</td>
          <td>{p.densidadeMax.toFixed(2)}</td>
          <td className={styles.actionsCell}>
            <div className={styles.actionsRow}>
              <Button variant="ghost" onClick={() => abrir(p)}>
                <Pencil size={14} />
              </Button>
              <Button variant="cancel" onClick={() => pedirExclusao(p)}>
                <Trash2 size={14} />
              </Button>
            </div>
          </td>
        </tr>
      )}
      modal={{
        open: modalOpen,
        onOpenChange: fechar,
        title: editando ? 'Editar produto' : 'Novo produto',
        rotuloAcao: editando ? 'Salvar alterações' : 'Cadastrar produto',
        onAcao: handleSalvar,
        salvando,
        erro,
      }}
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
    </CadastroPanel>
  );
}
