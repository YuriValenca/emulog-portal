'use client';

import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Panel } from '@/components/ui/Panel/Panel';
import { Table } from '@/components/ui/Table/Table';
import { Button } from '@/components/ui/Button/Button';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { useProdutos } from '@/hooks/cadastro/useProdutos';
import type { Produto } from '@/schemas/produto';
import styles from './CadastrosTab.module.scss';

interface ProdutosTabProps {
  companyId: string | null;
}

export function ProdutosTab({ companyId }: ProdutosTabProps) {
  const { produtos, isLoading, criarProduto, isCriando, editarProduto, isEditando, excluirProduto } =
    useProdutos(companyId);

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Produto | null>(null);
  const [nome, setNome] = useState('');
  const [densidadeMin, setDensidadeMin] = useState('');
  const [densidadeMax, setDensidadeMax] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const abrirCriacao = () => {
    setEditando(null);
    setNome('');
    setDensidadeMin('');
    setDensidadeMax('');
    setErro(null);
    setModalOpen(true);
  };

  const abrirEdicao = (p: Produto) => {
    setEditando(p);
    setNome(p.nome);
    setDensidadeMin(String(p.densidadeMin));
    setDensidadeMax(String(p.densidadeMax));
    setErro(null);
    setModalOpen(true);
  };

  const fecharModal = () => {
    setModalOpen(false);
    setEditando(null);
    setNome('');
    setDensidadeMin('');
    setDensidadeMax('');
    setErro(null);
  };

  const handleSalvar = async () => {
    if (!companyId) return;
    const min = parseFloat(densidadeMin.replace(',', '.'));
    const max = parseFloat(densidadeMax.replace(',', '.'));
    if (!nome.trim() || isNaN(min) || isNaN(max)) {
      setErro('Preencha o nome e as densidades mínima e máxima.');
      return;
    }
    if (min > max) {
      setErro('A densidade mínima não pode ser maior que a máxima.');
      return;
    }
    setErro(null);
    try {
      if (editando) {
        await editarProduto({ id: editando.id, nome: nome.trim(), densidadeMin: min, densidadeMax: max });
      } else {
        await criarProduto({ nome: nome.trim(), densidadeMin: min, densidadeMax: max, companyId });
      }
      fecharModal();
    } catch {
      setErro('Não foi possível salvar o produto. Tente novamente.');
    }
  };

  const salvando = isCriando || isEditando;

  return (
    <Panel
      title="Produtos"
      action={
        <Button variant="accent" icon={<Plus size={16} />} onClick={abrirCriacao}>
          Novo produto
        </Button>
      }
    >
      {isLoading ? (
        <div className={styles.loadingRow}>
          <Spinner />
        </div>
      ) : (
        <>
          <Table columns={['1fr', '140px', '140px', '96px']}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Densidade mín.</th>
                <th>Densidade máx.</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {produtos.map((p) => (
                <tr key={p.id}>
                  <td>{p.nome}</td>
                  <td>{p.densidadeMin.toFixed(2)}</td>
                  <td>{p.densidadeMax.toFixed(2)}</td>
                  <td className={styles.actionsCell}>
                    <div className={styles.actionsRow}>
                      <Button variant="ghost" onClick={() => abrirEdicao(p)}>
                        <Pencil size={14} />
                      </Button>
                      <Button variant="cancel" onClick={() => excluirProduto(p.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          {produtos.length === 0 && <p className={styles.empty}>Nenhum produto cadastrado.</p>}
        </>
      )}

      <Modal open={modalOpen} onOpenChange={fecharModal} title={editando ? 'Editar produto' : 'Novo produto'}>
        <div className={styles.form}>
          <Input id="produto-nome" label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} disabled={salvando} />
          <div className={styles.row}>
            <div className={styles.rowItem}>
              <Input
                id="produto-dens-min"
                label="Densidade mín. (g/cm³)"
                value={densidadeMin}
                onChange={(e) => setDensidadeMin(e.target.value)}
                disabled={salvando}
              />
            </div>
            <div className={styles.rowItem}>
              <Input
                id="produto-dens-max"
                label="Densidade máx. (g/cm³)"
                value={densidadeMax}
                onChange={(e) => setDensidadeMax(e.target.value)}
                disabled={salvando}
              />
            </div>
          </div>
          {erro && <p className={styles.formError}>{erro}</p>}
          <Button variant="ok" onClick={handleSalvar} loading={salvando}>
            {editando ? 'Salvar alterações' : 'Cadastrar produto'}
          </Button>
        </div>
      </Modal>
    </Panel>
  );
}
