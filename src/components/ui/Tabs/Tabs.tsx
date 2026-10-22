'use client';

import * as RadixTabs from '@radix-ui/react-tabs';
import { ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Tabs.module.scss';

interface TabItem {
  value: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  items: TabItem[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  larguraTotal?: boolean;
  acaoDoCabecalho?: ReactNode;
}

export function Tabs({ items, defaultValue, value, onValueChange, larguraTotal = false, acaoDoCabecalho }: TabsProps) {
  const lista = (
    <RadixTabs.List className={clsx(styles.list, larguraTotal && styles.listLarguraTotal)}>
      {items.map((item) => (
        <RadixTabs.Trigger key={item.value} value={item.value} className={styles.trigger}>
          {item.label}
        </RadixTabs.Trigger>
      ))}
    </RadixTabs.List>
  );

  return (
    <RadixTabs.Root
      className={styles.root}
      defaultValue={defaultValue ?? items[0]?.value}
      value={value}
      onValueChange={onValueChange}
    >
      {acaoDoCabecalho ? (
        <div className={styles.cabecalho}>
          {lista}
          {acaoDoCabecalho}
        </div>
      ) : (
        lista
      )}

      {items.map((item) => (
        <RadixTabs.Content key={item.value} value={item.value} className={styles.content}>
          {item.content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  );
}
