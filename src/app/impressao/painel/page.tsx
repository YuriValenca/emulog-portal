'use client';

import dynamic from 'next/dynamic';

// Os dados chegam por `window`, injetados pelo Puppeteer antes da carga: sem SSR, não há o que hidratar
const ImpressaoDoPainel = dynamic(() => import('./ImpressaoDoPainel').then((modulo) => modulo.ImpressaoDoPainel), {
  ssr: false,
});

export default function PaginaDeImpressaoDoPainel() {
  return <ImpressaoDoPainel />;
}
