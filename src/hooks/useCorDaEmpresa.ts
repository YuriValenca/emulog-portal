'use client';

import { useEffect } from 'react';
import { corDaInterface } from '@/lib/corDaInterface';

export function useCorDaEmpresa(primaryColor: string | null | undefined) {
  useEffect(() => {
    const cor = corDaInterface(primaryColor);
    if (!cor) return;
    const raiz = document.documentElement;
    raiz.style.setProperty('--cor-empresa', cor);
    return () => {
      raiz.style.removeProperty('--cor-empresa');
    };
  }, [primaryColor]);
}
