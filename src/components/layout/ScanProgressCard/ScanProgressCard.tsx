'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useToast } from '@/components/ui/Toast/Toast';
import styles from './ScanProgressCard.module.scss';

interface ScanProgressCardProps {
  total: number;
  processados: number;
}

export function ScanProgressCard({ total, processados }: ScanProgressCardProps) {
  const [fechado, setFechado] = useState(false);
  const { pilha } = useToast();

  if (fechado || total === 0) return null;

  const progresso = Math.round((processados / total) * 100);

  return (
    <div
      className={styles.card}
      style={{
        bottom: pilha.altura > 0 ? `calc(var(--spacing-large) + ${pilha.altura}px + var(--spacing-xsmall))` : undefined,
        transitionDuration: pilha.crescendo ? '0.2s' : '1.2s',
      }}
    >
      <button type="button" className={styles.closeBtn} onClick={() => setFechado(true)} aria-label="Fechar">
        <X size={14} />
      </button>
      <span className={styles.label}>
        Verificando fogos pendentes — {processados}/{total}
      </span>
      <div className={styles.bar}>
        <div className={styles.fill} style={{ width: `${progresso}%` }} />
      </div>
    </div>
  );
}
