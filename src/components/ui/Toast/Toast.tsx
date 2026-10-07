'use client';

import * as RadixToast from '@radix-ui/react-toast';
import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import styles from './Toast.module.scss';

interface ToastInput {
  title: string;
  description?: string;
}

interface ToastItem extends ToastInput {
  id: number;
}

interface PilhaToasts {
  altura: number;
  crescendo: boolean;
}

interface ToastContextValue {
  toast: (input: ToastInput) => void;
  pilha: PilhaToasts;
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

  const [viewport, setViewport] = useState<HTMLOListElement | null>(null);
  const pilha = useAlturaDaPilha(viewport);

  return (
    <ToastContext.Provider value={{ toast, pilha }}>
      <RadixToast.Provider swipeDirection="right" duration={4000}>
        {children}
        {toasts.map((t) => (
          <RadixToast.Root key={t.id} className={styles.root} onOpenChange={(open) => !open && remove(t.id)}>
            <RadixToast.Title className={styles.title}>{t.title}</RadixToast.Title>
            {t.description && <RadixToast.Description className={styles.description}>{t.description}</RadixToast.Description>}
          </RadixToast.Root>
        ))}
        <RadixToast.Viewport ref={setViewport} className={styles.viewport} />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}

function useAlturaDaPilha(viewport: HTMLOListElement | null): PilhaToasts {
  const [estado, setEstado] = useState<PilhaToasts>({ altura: 0, crescendo: false });

  useEffect(() => {
    if (!viewport) return;
    const observer = new ResizeObserver(([entrada]) => {
      const altura = entrada.borderBoxSize[0]?.blockSize ?? viewport.offsetHeight;
      setEstado((anterior) => (anterior.altura === altura ? anterior : { altura, crescendo: altura > anterior.altura }));
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [viewport]);

  return estado;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve ser usado dentro de ToastProvider');
  return ctx;
}
