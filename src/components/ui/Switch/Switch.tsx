'use client';

import * as RadixSwitch from '@radix-ui/react-switch';
import clsx from 'clsx';
import { ReactNode } from 'react';
import styles from './Switch.module.scss';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export function Switch({ checked, onCheckedChange, label, icon, disabled }: SwitchProps) {
  return (
    <label className={clsx(styles.wrapper, disabled && styles.disabled)}>
      {icon && <span className={styles.icon}>{icon}</span>}
      {label && <span className={styles.label}>{label}</span>}
      <RadixSwitch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={styles.root}
      >
        <RadixSwitch.Thumb className={styles.thumb} />
      </RadixSwitch.Root>
    </label>
  );
}
