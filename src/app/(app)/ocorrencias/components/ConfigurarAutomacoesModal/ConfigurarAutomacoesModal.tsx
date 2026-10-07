'use client';

import { Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal/Modal';
import { Button } from '@/components/ui/Button/Button';
import type { RegraDeteccao, RegraMetrica, RegraOperador } from '@/schemas/regraDeteccao';
import styles from './ConfigurarAutomacoesModal.module.scss';

const OPERADOR_LABEL: Record<RegraOperador, string> = {
  entre: 'entre',
  maior: 'maior que',
  menor: 'menor que',
  igual: 'igual a',
};

const METRICA_LABEL: Record<RegraMetrica, string> = {
  diferenca_kg: 'Diferença Kg previsto/aplicado',
  rascunho_parado: 'Rascunho parado',
};

const METRICA_UNIDADE: Record<RegraMetrica, string> = {
  diferenca_kg: '%',
  rascunho_parado: ' dias',
};

function condicaoLabel(regra: RegraDeteccao) {
  const unidade = METRICA_UNIDADE[regra.metrica];
  if (regra.operador === 'entre') return `entre ${regra.valor1}${unidade} e ${regra.valor2}${unidade}`;
  return `${OPERADOR_LABEL[regra.operador]} ${regra.valor1}${unidade}`;
}

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
              <span className={styles.condicao}>{condicaoLabel(regra)}</span>
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
