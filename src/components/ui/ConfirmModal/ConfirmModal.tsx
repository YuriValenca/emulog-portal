'use client';

import { useState, type ReactNode } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button/Button';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import styles from './ConfirmModal.module.scss';

export interface EtapaConfirmacao {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  tone?: 'default' | 'danger';
  /** Mostra o spinner no lugar da descrição e trava o botão de confirmar. */
  carregando?: boolean;
  textoCarregando?: string;
}

type ConteudoConfirmacao =
  | (EtapaConfirmacao & { etapas?: never })
  | { etapas: EtapaConfirmacao[]; title?: never };

type ConfirmModalProps = ConteudoConfirmacao & {
  open: boolean;
  cancelLabel?: string;
  isConfirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({ open, cancelLabel = 'Cancelar', isConfirming = false, onConfirm, onCancel, ...conteudo }: ConfirmModalProps) {
  const etapas = conteudo.etapas ?? [conteudo as EtapaConfirmacao];

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
        <RadixDialog.Overlay className={styles.overlay} data-overlay-modal="" />
        <RadixDialog.Content
          className={styles.card}
          data-conteudo-modal=""
          onEscapeKeyDown={impedirFechamento}
          onPointerDownOutside={impedirFechamento}
          onInteractOutside={impedirFechamento}
        >
          <Etapas
            etapas={etapas}
            cancelLabel={cancelLabel}
            isConfirming={isConfirming}
            onConfirm={onConfirm}
            onCancel={onCancel}
          />
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

interface EtapasProps {
  etapas: EtapaConfirmacao[];
  cancelLabel: string;
  isConfirming: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Vive dentro do Content, que o Radix desmonta ao fechar: reabrir sempre volta para a primeira etapa.
function Etapas({ etapas, cancelLabel, isConfirming, onConfirm, onCancel }: EtapasProps) {
  const [indice, setIndice] = useState(0);
  const etapa = etapas[indice];
  const ultima = indice === etapas.length - 1;
  const { title, description, confirmLabel = 'Confirmar', tone = 'default', carregando = false, textoCarregando } = etapa;

  const avancar = () => (ultima ? onConfirm() : setIndice(indice + 1));

  return (
    <>
      {tone === 'danger' && (
        <div className={styles.iconCircle} aria-hidden="true">
          <AlertTriangle size={22} />
        </div>
      )}

      <RadixDialog.Title className={styles.title}>{title}</RadixDialog.Title>

      {carregando ? (
        <RadixDialog.Description asChild>
          <div className={`${styles.description} ${styles.carregando}`}>
            <Spinner size="sm" />
            <span>{textoCarregando ?? 'Carregando...'}</span>
          </div>
        </RadixDialog.Description>
      ) : description ? (
        <RadixDialog.Description asChild>
          <div className={styles.description}>{description}</div>
        </RadixDialog.Description>
      ) : (
        <RadixDialog.Description className={styles.srOnly}>{title}</RadixDialog.Description>
      )}

      <div className={styles.actions}>
        <Button variant="ghost" onClick={onCancel} disabled={isConfirming}>
          {cancelLabel}
        </Button>
        <Button
          variant={tone === 'danger' ? 'cancel' : 'accent'}
          onClick={avancar}
          loading={ultima && isConfirming}
          disabled={carregando}
        >
          {confirmLabel}
        </Button>
      </div>
    </>
  );
}
