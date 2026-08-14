import { ReactNode } from 'react';
import styles from './Panel.module.scss';

interface PanelProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}

export function Panel({ title, action, children }: PanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.title}>{title}</span>
        {action}
      </div>
      {children}
    </div>
  );
}
