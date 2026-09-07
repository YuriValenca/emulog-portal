'use client';

import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal/Modal';
import { Button } from '@/components/ui/Button/Button';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import styles from './ConfirmarRemocaoAutomacaoModal.module.scss';

interface ConfirmarRemocaoAutomacaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProsseguir: () => void;
  quantidadeOcorrencias: number | null;
  carregandoQuantidade: boolean;
}

export default function ConfirmarRemocaoAutomacaoModal({
  open, onOpenChange, onProsseguir, quantidadeOcorrencias, carregandoQuantidade,
}: ConfirmarRemocaoAutomacaoModalProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Remover automação?" width={380}>
      <div className={styles.content}>
        <div className={styles.alertaIcone}>
          <AlertTriangle size={20} />
        </div>

        {carregandoQuantidade ? (
          <div className={styles.loadingRow}>
            <Spinner size="sm" />
            <span>Verificando ocorrências vinculadas...</span>
          </div>
        ) : (
          <p>
            Essa automação já gerou <strong>{quantidadeOcorrencias ?? 0} ocorrência(s)</strong>.
            Ao remover a automação, todas elas serão apagadas permanentemente, mesmo as que já
            estiverem em acompanhamento.
          </p>
        )}

        <p className={styles.reversivel}>
          Se você recriar uma automação equivalente no futuro, os fogos que ainda se enquadrarem
          na condição vão gerar novas ocorrências — mas o histórico das ocorrências atuais não será recuperado.
        </p>

        <div className={styles.actions}>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="cancel" onClick={onProsseguir} disabled={carregandoQuantidade}>
            Continuar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
