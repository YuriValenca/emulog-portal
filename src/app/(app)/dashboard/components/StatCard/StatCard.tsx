import { ReactNode } from 'react';
import styles from './StatCard.module.scss';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  denominador?: number;
  color: string;
}

export function StatCard({ icon, label, value, sub, denominador, color }: StatCardProps) {
  return (
    <div className={styles.card} style={{ borderTopColor: color }}>
      <div className={styles.header}>
        <span className={styles.icon} style={{ color }}>{icon}</span>
        <span className={styles.label}>{label}</span>
      </div>
      <div className={styles.value}>
        <span className={styles.valueText}>
          {value}
          {denominador !== undefined && <span className={styles.denominador}>/{denominador}</span>}
        </span>
        {sub && <span className={styles.sub}>({sub})</span>}
      </div>
    </div>
  );
}
