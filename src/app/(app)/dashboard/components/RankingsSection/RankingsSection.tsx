'use client';

import { ordenarRanking, type MetricaRanking, type MetricasDosRankings, type RankingItem } from '@/lib/dashboard';
import { BlocoAnimado } from '@/components/painel/BlocoAnimado/BlocoAnimado';
import { RankingCard } from './RankingCard/RankingCard';
import styles from './RankingsSection.module.scss';

const LIMITE_RANKING = 5;

interface RankingsSectionProps {
  rankingUmb: RankingItem[];
  mostrarUmb: boolean;
  rankingOperadores: RankingItem[];
  mostrarOperadores: boolean;
  metricas: MetricasDosRankings;
  onMetricasChange?: (metricas: MetricasDosRankings) => void;
  modoRelatorio?: boolean;
}

export function RankingsSection({
  rankingUmb,
  mostrarUmb,
  rankingOperadores,
  mostrarOperadores,
  metricas,
  onMetricasChange,
  modoRelatorio = false,
}: RankingsSectionProps) {
  const alterarMetrica = (campo: keyof MetricasDosRankings) =>
    onMetricasChange && ((metrica: MetricaRanking) => onMetricasChange({ ...metricas, [campo]: metrica }));

  const exibirUmb = mostrarUmb && rankingUmb.length > 0;
  const exibirOperadores = mostrarOperadores && rankingOperadores.length > 0;

  const prepararItens = (ranking: RankingItem[], metrica: MetricaRanking) => {
    const ordenado = ordenarRanking(ranking, metrica);
    return modoRelatorio ? ordenado : ordenado.slice(0, LIMITE_RANKING);
  };

  return (
    <div className={styles.row}>
      <BlocoAnimado visivel={exibirUmb}>
        <RankingCard
          entidade="UMB"
          items={prepararItens(rankingUmb, metricas.umb)}
          metrica={metricas.umb}
          onMetricaChange={alterarMetrica('umb')}
          modoRelatorio={modoRelatorio}
        />
      </BlocoAnimado>
      <BlocoAnimado visivel={exibirOperadores}>
        <RankingCard
          entidade="operador"
          items={prepararItens(rankingOperadores, metricas.operadores)}
          metrica={metricas.operadores}
          onMetricaChange={alterarMetrica('operadores')}
          modoRelatorio={modoRelatorio}
        />
      </BlocoAnimado>
    </div>
  );
}
