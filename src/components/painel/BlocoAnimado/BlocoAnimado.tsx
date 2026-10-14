'use client';

import { useEffect, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './BlocoAnimado.module.scss';

// Mesmo valor do token --duracao-bloco, que os pais usam para fechar o espaço do bloco
const DURACAO_MS = 450;

interface BlocoAnimadoProps {
  visivel: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Some e aparece com fade, e fica montado durante a saída para o pai poder fechar o espaço dele animando
 * (o pai enxerga a fase por `data-recolhido`). Na primeira renderização não anima: o PDF captura o estado final.
 */
export function BlocoAnimado({ visivel, children, className }: BlocoAnimadoProps) {
  const [montado, setMontado] = useState(visivel);
  const [entrou, setEntrou] = useState(visivel);

  if (visivel && !montado) setMontado(true);

  useEffect(() => {
    if (visivel) {
      // Dois quadros: com um só, o navegador junta o estado recolhido e o visível na mesma pintura e não anima
      let quadro = requestAnimationFrame(() => {
        quadro = requestAnimationFrame(() => setEntrou(true));
      });
      return () => cancelAnimationFrame(quadro);
    }
    const saida = setTimeout(() => {
      setMontado(false);
      setEntrou(false);
    }, DURACAO_MS);
    return () => clearTimeout(saida);
  }, [visivel]);

  if (!montado) return null;

  const recolhido = !visivel || !entrou;
  return (
    <div
      className={clsx(styles.bloco, recolhido && styles.recolhido, className)}
      data-recolhido={recolhido || undefined}
    >
      {children}
    </div>
  );
}
