'use client';

import { useEffect, useState } from 'react';
import { ConteudoDoPainel } from '@/components/painel/ConteudoDoPainel/ConteudoDoPainel';
import { dadosDoRelatorioDoPainelSchema, type DadosDoRelatorioDoPainel } from '@/lib/relatorios/painel';
import styles from './page.module.scss';

declare global {
  interface Window {
    __dadosDoPainel?: unknown;
    __painelPronto?: boolean;
  }
}

const esperarQuadro = () => new Promise((resolver) => requestAnimationFrame(resolver));

const esperarImagens = () =>
  Promise.all(
    Array.from(document.images)
      .filter((imagem) => !imagem.complete)
      .map(
        (imagem) =>
          new Promise((resolver) => {
            imagem.addEventListener('load', resolver);
            imagem.addEventListener('error', resolver);
          })
      )
  );

// O ResponsiveContainer do Recharts só desenha depois de medir o pai, alguns quadros após a montagem
async function esperarRenderizacaoCompleta() {
  await document.fonts.ready;
  await esperarImagens();
  for (let i = 0; i < 3; i += 1) await esperarQuadro();
}

function Cabecalho({ dados }: { dados: DadosDoRelatorioDoPainel }) {
  return (
    <header className={styles.cabecalho}>
      {/* eslint-disable-next-line @next/next/no-img-element -- base64 ou SVG local, sem otimização do next/image */}
      <img className={styles.logo} src={dados.empresa.logo ?? '/assets/emulogLogo.svg'} alt="" />
      <div className={styles.cabecalhoTextos}>
        <h1 className={styles.titulo}>Painel operacional</h1>
        <p className={styles.linha}>
          <strong>{dados.empresa.nome}</strong> · {dados.periodoDescricao}
        </p>
        {dados.filtros.length > 0 && <p className={styles.linhaSecundaria}>{dados.filtros.join(' · ')}</p>}
      </div>
    </header>
  );
}

export function ImpressaoDoPainel() {
  const [dados] = useState(() => dadosDoRelatorioDoPainelSchema.safeParse(window.__dadosDoPainel).data ?? null);

  useEffect(() => {
    if (!dados) return;
    document.documentElement.dataset.tema = dados.tema;
    let cancelado = false;
    esperarRenderizacaoCompleta().then(() => {
      if (!cancelado) window.__painelPronto = true;
    });
    return () => {
      cancelado = true;
    };
  }, [dados]);

  if (!dados) return null;

  return (
    <main className={styles.pagina}>
      <Cabecalho dados={dados} />
      <ConteudoDoPainel
        estatisticas={dados.estatisticas}
        periodoLabel={dados.periodoLabel}
        faixa={dados.faixa}
        ocorrenciasAbertas={dados.ocorrenciasAbertas}
        metricas={dados.metricas}
        blocos={dados.blocos}
        modoRelatorio
      />
    </main>
  );
}
