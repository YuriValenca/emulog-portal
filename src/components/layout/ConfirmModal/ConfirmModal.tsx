'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button/Button';
import styles from './ConfirmModal.module.scss';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  isConfirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'default',
  isConfirming = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const impedirFechamento = (event: Event) => {
    if (isConfirming) event.preventDefault();
  };

  return (
    <RadixDialog.Root
      open={open}
      onOpenChange={(proximoAberto) => {
        if (!proximoAberto && !isConfirming) onCancel();
      }}
    >
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={styles.overlay} />
        <RadixDialog.Content
          className={styles.card}
          onEscapeKeyDown={impedirFechamento}
          onPointerDownOutside={impedirFechamento}
          onInteractOutside={impedirFechamento}
        >
          {tone === 'danger' && (
            <div className={styles.iconCircle} aria-hidden="true">
              <AlertTriangle size={22} />
            </div>
          )}

          <RadixDialog.Title className={styles.title}>{title}</RadixDialog.Title>

          {description ? (
            <RadixDialog.Description className={styles.description}>{description}</RadixDialog.Description>
          ) : (
            <RadixDialog.Description className={styles.srOnly}>{title}</RadixDialog.Description>
          )}

          <div className={styles.actions}>
            <Button variant="ghost" onClick={onCancel} disabled={isConfirming}>
              {cancelLabel}
            </Button>
            <Button
              variant={tone === 'danger' ? 'cancel' : 'accent'}
              onClick={onConfirm}
              loading={isConfirming}
            >
              {confirmLabel}
            </Button>
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
