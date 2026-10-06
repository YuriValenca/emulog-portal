'use client';

import { ReactNode, useState } from 'react';
import { Plus } from 'lucide-react';
import { Panel } from '@/components/ui/Panel/Panel';
import { Table } from '@/components/ui/Table/Table';
import { Button } from '@/components/ui/Button/Button';
import { Modal } from '@/components/ui/Modal/Modal';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import ConfirmModal from '@/components/layout/ConfirmModal/ConfirmModal';
import { useToast } from '@/components/ui/Toast/Toast';
import styles from '../Tabs/CadastrosTab.module.scss';

export interface ExclusaoCadastro<T> {
  titulo: string;
  descricao: (item: T) => string;
  onConfirmar: (item: T) => Promise<unknown>;
  confirmLabel?: string;
}

export interface AcoesLinha<T> {
  pedirExclusao: (item: T) => void;
}

interface CadastroPanelProps<T> {
  title: string;
  actionLabel: string;
  onNovo: () => void;
  isLoading: boolean;
  items: T[];
  emptyMessage: string;
  columns: string[];
  headers: ReactNode;
  renderRow: (item: T, acoes: AcoesLinha<T>) => ReactNode;
  exclusao?: ExclusaoCadastro<T>;
  note?: ReactNode;
  modalOpen: boolean;
  onModalOpenChange: (open: boolean) => void;
  modalTitle: string;
  children: ReactNode;
}

export function CadastroPanel<T>({
  title,
  actionLabel,
  onNovo,
  isLoading,
  items,
  emptyMessage,
  columns,
  headers,
  renderRow,
  exclusao,
  note,
  modalOpen,
  onModalOpenChange,
  modalTitle,
  children,
}: CadastroPanelProps<T>) {
  const { toast } = useToast();
  const [itemParaExcluir, setItemParaExcluir] = useState<T | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const acoes: AcoesLinha<T> = {
    pedirExclusao: (item) => setItemParaExcluir(item),
  };

  const cancelarExclusao = () => {
    if (excluindo) return;
    setItemParaExcluir(null);
  };

  const confirmarExclusao = async () => {
    if (!itemParaExcluir || !exclusao) return;
    setExcluindo(true);
    try {
      await exclusao.onConfirmar(itemParaExcluir);
      setItemParaExcluir(null);
    } catch (erro) {
      console.error(`[${title}] falha ao excluir:`, erro);
      toast({
        title: 'Não foi possível apagar',
        description: 'O registro continua na lista. Tente novamente.',
      });
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <Panel
      title={title}
      action={
        <Button variant="accent" icon={<Plus size={16} />} onClick={onNovo}>
          {actionLabel}
        </Button>
      }
    >
      {isLoading ? (
        <div className={styles.loadingRow}>
          <Spinner />
        </div>
      ) : (
        <>
          <Table columns={columns}>
            <thead>
              <tr>{headers}</tr>
            </thead>
            <tbody>{items.map((item) => renderRow(item, acoes))}</tbody>
          </Table>
          {items.length === 0 && <p className={styles.empty}>{emptyMessage}</p>}
        </>
      )}

      {note}

      <Modal open={modalOpen} onOpenChange={onModalOpenChange} title={modalTitle}>
        <div className={styles.form}>{children}</div>
      </Modal>

      {exclusao && (
        <ConfirmModal
          open={itemParaExcluir !== null}
          title={exclusao.titulo}
          description={itemParaExcluir ? exclusao.descricao(itemParaExcluir) : undefined}
          confirmLabel={exclusao.confirmLabel ?? 'Apagar'}
          cancelLabel="Cancelar"
          tone="danger"
          isConfirming={excluindo}
          onConfirm={confirmarExclusao}
          onCancel={cancelarExclusao}
        />
      )}
    </Panel>
  );
}
