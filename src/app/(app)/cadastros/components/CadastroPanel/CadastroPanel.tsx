'use client';

import { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { Panel } from '@/components/ui/Panel/Panel';
import { Table } from '@/components/ui/Table/Table';
import { Button } from '@/components/ui/Button/Button';
import { Modal } from '@/components/ui/Modal/Modal';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import styles from '../Tabs/CadastrosTab.module.scss';

interface CadastroPanelProps<T> {
  title: string;
  actionLabel: string;
  onNovo: () => void;
  isLoading: boolean;
  items: T[];
  emptyMessage: string;
  columns: string[];
  headers: ReactNode;
  renderRow: (item: T) => ReactNode;
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
  note,
  modalOpen,
  onModalOpenChange,
  modalTitle,
  children,
}: CadastroPanelProps<T>) {
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
            <tbody>{items.map(renderRow)}</tbody>
          </Table>
          {items.length === 0 && <p className={styles.empty}>{emptyMessage}</p>}
        </>
      )}

      {note}

      <Modal open={modalOpen} onOpenChange={onModalOpenChange} title={modalTitle}>
        <div className={styles.form}>{children}</div>
      </Modal>
    </Panel>
  );
}
