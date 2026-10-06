'use client';

import { useEffect, useState } from 'react';

const UM_MINUTO_MS = 60 * 1000;

/**
 * "Agora" estável dentro de um render, atualizado em intervalo fixo.
 *
 * Existe porque `Date.now()` no corpo do componente torna o render impuro: o mesmo
 * estado produz saídas diferentes a cada re-render, e a contagem regressiva oscila
 * sem nada ter mudado.
 */
export function useAgora(intervaloMs: number = UM_MINUTO_MS): Date {
  const [agora, setAgora] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setAgora(new Date()), intervaloMs);
    return () => clearInterval(timer);
  }, [intervaloMs]);

  return agora;
}
