'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import styles from './ScanProgressCard.module.scss';

interface ScanProgressCardProps {
  total: number;
  processados: number;
}

export function ScanProgressCard({ total, processados }: ScanProgressCardProps) {
  const [fechado, setFechado] = useState(false);

  if (fechado || total === 0) return null;

  const progresso = Math.round((processados / total) * 100);

  return (
    <div className={styles.card}>
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
