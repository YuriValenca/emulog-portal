'use client';

import type { ReactNode } from 'react';
import { Modal } from '@/components/ui/Modal/Modal';
import { Button } from '@/components/ui/Button/Button';
import styles from './FormModal.module.scss';

export interface FormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  headerAction?: ReactNode;
  width?: number;
  rotuloAcao: string;
  onAcao?: () => void;
  /** Liga o botão principal a um `<form>` pelo id, em vez de usar `onAcao`. */
  formId?: string;
  salvando?: boolean;
  desabilitado?: boolean;
  erro?: ReactNode;
  /** Fica à esquerda dos botões do rodapé: dica, aviso ou ação secundária. */
  complementoRodape?: ReactNode;
  children: ReactNode;
}

export function FormModal({
  open,
  onOpenChange,
  title,
  description,
  headerAction,
  width,
  rotuloAcao,
  onAcao,
  formId,
  salvando = false,
  desabilitado = false,
  erro,
  complementoRodape,
  children,
}: FormModalProps) {
  const mudarAbertura = (aberto: boolean) => {
    if (!aberto && salvando) return;
    onOpenChange(aberto);
  };

  return (
    <Modal
      open={open}
      onOpenChange={mudarAbertura}
      title={title}
      description={description}
      headerAction={headerAction}
      width={width}
      footer={
        <div className={styles.rodape}>
          {complementoRodape && <div className={styles.complemento}>{complementoRodape}</div>}
          <div className={styles.acoes}>
            <Button type="button" variant="ghost" onClick={() => mudarAbertura(false)} disabled={salvando}>
              Cancelar
            </Button>
            <Button
              type={formId ? 'submit' : 'button'}
              form={formId}
              variant="ok"
              onClick={onAcao}
              loading={salvando}
              disabled={desabilitado}
            >
              {rotuloAcao}
            </Button>
          </div>
        </div>
      }
    >
      <div className={styles.corpo}>
        {children}
        {erro && (
          <p role="alert" className={styles.erro}>
            {erro}
          </p>
        )}
      </div>
    </Modal>
  );
}
