'use client';

import * as RadixToast from '@radix-ui/react-toast';
import { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import styles from './Toast.module.scss';

interface ToastInput {
  title: string;
  description?: string;
}

interface ToastItem extends ToastInput {
  id: number;
}

interface ToastContextValue {
  toast: (input: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((input: ToastInput) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, ...input }]);
  }, []);

  const remove = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      <RadixToast.Provider swipeDirection="right" duration={4000}>
        {children}
        {toasts.map((t) => (
          <RadixToast.Root key={t.id} className={styles.root} onOpenChange={(open) => !open && remove(t.id)}>
            <RadixToast.Title className={styles.title}>{t.title}</RadixToast.Title>
            {t.description && <RadixToast.Description className={styles.description}>{t.description}</RadixToast.Description>}
          </RadixToast.Root>
        ))}
        <RadixToast.Viewport className={styles.viewport} />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve ser usado dentro de ToastProvider');
  return ctx;
}
