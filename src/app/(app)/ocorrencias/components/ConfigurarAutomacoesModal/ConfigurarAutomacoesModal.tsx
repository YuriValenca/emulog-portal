'use client';

import { Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal/Modal';
import { Button } from '@/components/ui/Button/Button';
import { condicaoDaRegra } from '@/lib/avaliarRegra';
import type { RegraDeteccao, RegraMetrica } from '@/schemas/regraDeteccao';
import styles from './ConfigurarAutomacoesModal.module.scss';

const METRICA_LABEL: Record<RegraMetrica, string> = {
  diferenca_kg: 'Diferença Kg previsto/aplicado',
  rascunho_parado: 'Rascunho parado',
};

interface ConfigurarAutomacoesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  regras: RegraDeteccao[];
  onSolicitarExclusao: (regra: RegraDeteccao) => void;
}

export default function ConfigurarAutomacoesModal({ open, onOpenChange, regras, onSolicitarExclusao }: ConfigurarAutomacoesModalProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Automações configuradas" width={460}>
      <div className={styles.lista}>
        {regras.map((regra) => (
          <div key={regra.id} className={styles.item}>
            <div>
              <span className={styles.metrica}>{METRICA_LABEL[regra.metrica]}</span>
              <span className={styles.condicao}>{condicaoDaRegra(regra)}</span>
            </div>
            <Button variant="cancel" onClick={() => onSolicitarExclusao(regra)}>
              <Trash2 size={14} />
            </Button>
          </div>
        ))}

        {regras.length === 0 && <p className={styles.empty}>Nenhuma automação configurada.</p>}
      </div>
    </Modal>
  );
}
