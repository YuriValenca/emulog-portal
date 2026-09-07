'use client';

import { Modal } from '@/components/ui/Modal/Modal';
import { Button } from '@/components/ui/Button/Button';

interface ConfirmarRemocaoFinalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmar: () => void;
  confirmando?: boolean;
}

export default function ConfirmarRemocaoFinalModal({ open, onOpenChange, onConfirmar, confirmando = false }: ConfirmarRemocaoFinalModalProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Confirmar exclusão definitiva"
      description="Essa ação não pode ser desfeita."
      width={360}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={confirmando}>
            Cancelar
          </Button>
          <Button variant="cancel" onClick={onConfirmar} loading={confirmando} disabled={confirmando}>
            Remover automação e ocorrências
          </Button>
        </>
      }
    >
      <p>Tem certeza que deseja remover essa automação e todas as ocorrências geradas por ela?</p>
    </Modal>
  );
}
