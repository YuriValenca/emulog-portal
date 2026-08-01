import clsx from 'clsx';
import styles from './StatusPill.module.scss';

type StatusTone = 'ok' | 'warn' | 'crit' | 'data' | 'neutral';

interface StatusPillProps {
  label: string;
  tone: StatusTone;
}

export function StatusPill({ label, tone }: StatusPillProps) {
  return <span className={clsx(styles.pill, styles[tone])}>{label}</span>;
}