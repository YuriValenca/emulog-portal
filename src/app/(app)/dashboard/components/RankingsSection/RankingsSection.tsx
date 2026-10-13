'use client';

import { useState } from 'react';
import { ordenarRanking, type MetricaRanking, type RankingItem } from '@/lib/dashboard';
import { RankingCard } from './RankingCard/RankingCard';
import styles from './RankingsSection.module.scss';

const LIMITE_RANKING = 5;

interface RankingsSectionProps {
  rankingUmb: RankingItem[];
  mostrarUmb: boolean;
  rankingOperadores: RankingItem[];
  mostrarOperadores: boolean;
  modoRelatorio?: boolean;
}

export function RankingsSection({
  rankingUmb,
  mostrarUmb,
  rankingOperadores,
  mostrarOperadores,
  modoRelatorio = false,
}: RankingsSectionProps) {
  const [metricaUmb, setMetricaUmb] = useState<MetricaRanking>('totalFogos');
  const [metricaOperadores, setMetricaOperadores] = useState<MetricaRanking>('totalFogos');

  const exibirUmb = mostrarUmb && rankingUmb.length > 0;
  const exibirOperadores = mostrarOperadores && rankingOperadores.length > 0;

  const prepararItens = (ranking: RankingItem[], metrica: MetricaRanking) => {
    const ordenado = ordenarRanking(ranking, metrica);
    return modoRelatorio ? ordenado : ordenado.slice(0, LIMITE_RANKING);
  };

  if (!exibirUmb && !exibirOperadores) return null;

  return (
    <div className={styles.row}>
      {exibirUmb && (
        <RankingCard
          entidade="UMB"
          items={prepararItens(rankingUmb, metricaUmb)}
          metrica={metricaUmb}
          onMetricaChange={setMetricaUmb}
          modoRelatorio={modoRelatorio}
        />
      )}
      {exibirOperadores && (
        <RankingCard
          entidade="operador"
          items={prepararItens(rankingOperadores, metricaOperadores)}
          metrica={metricaOperadores}
          onMetricaChange={setMetricaOperadores}
          modoRelatorio={modoRelatorio}
        />
      )}
    </div>
  );
}
