import { ReactNode } from 'react';
import styles from './Table.module.scss';

interface TableProps {
  columns?: string[];
  children: ReactNode;
}

export function Table({ columns, children }: TableProps) {
  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        {columns && (
          <colgroup>
            {columns.map((width, index) => (
              <col key={index} style={{ width }} />
            ))}
          </colgroup>
        )}
        {children}
      </table>
    </div>
  );
}
