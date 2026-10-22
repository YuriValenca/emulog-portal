'use client';

import type { ReactNode } from 'react';
import * as RadixTooltip from '@radix-ui/react-tooltip';
import styles from './Tooltip.module.scss';

type LadoTooltip = 'top' | 'right' | 'bottom' | 'left';

interface TooltipProps {
  conteudo: ReactNode;
  children: ReactNode;
  lado?: LadoTooltip;
}

export function Tooltip({ conteudo, children, lado = 'top' }: TooltipProps) {
  return (
    <RadixTooltip.Provider delayDuration={200}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>
          <span className={styles.gatilho} tabIndex={0}>{children}</span>
        </RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content className={styles.conteudo} side={lado} sideOffset={6} collisionPadding={8}>
            {conteudo}
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
