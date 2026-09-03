'use client';

import { useEffect, useRef, useState } from 'react';
import { MoreVertical } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '../Button/Button';
import styles from './ActionMenu.module.scss';

export interface ActionsMenuItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

interface ActionsMenuProps {
  items: ActionsMenuItem[];
  ariaLabel?: string;
}

export function ActionsMenu({ items, ariaLabel = 'Ações' }: ActionsMenuProps) {
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;

    function handleClickFora(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setAberto(false);
      }
    }

    function handleEsc(event: KeyboardEvent) {
      if (event.key === 'Escape') setAberto(false);
    }

    document.addEventListener('mousedown', handleClickFora);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickFora);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [aberto]);

  return (
    <div className={styles.container} ref={containerRef}>
      <Button
        variant="ghost"
        className={styles.trigger}
        icon={<MoreVertical size={16} />}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={aberto}
        onClick={(e) => {
          e.stopPropagation();
          setAberto((v) => !v);
        }}
      />

      {aberto && (
        <div className={styles.menu} role="menu" onClick={(e) => e.stopPropagation()}>
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              className={clsx(styles.menuItem, item.variant === 'danger' && styles.menuItemDanger)}
              disabled={item.disabled}
              onClick={() => {
                setAberto(false);
                item.onClick();
              }}
            >
              <span className={styles.menuItemIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
