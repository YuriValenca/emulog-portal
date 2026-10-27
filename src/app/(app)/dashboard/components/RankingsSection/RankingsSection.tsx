'use client';

import clsx from 'clsx';
import { ordenarRanking, type MetricaRanking, type MetricasDosRankings, type RankingItem } from '@/lib/dashboard';
import { BlocoAnimado } from '@/components/painel/BlocoAnimado/BlocoAnimado';
import { RankingCard } from './RankingCard/RankingCard';
import styles from './RankingsSection.module.scss';

const LIMITE_RANKING = 5;
// Igualar a altura só disfarça a diferença de uma linha; com mais que isso, o card curto fica com um buraco
const DIFERENCA_MAXIMA_PARA_IGUALAR = 1;

function alturasParecidas(quantidades: number[]): boolean {
  return quantidades.length > 1 && Math.max(...quantidades) - Math.min(...quantidades) <= DIFERENCA_MAXIMA_PARA_IGUALAR;
}

interface RankingsSectionProps {
  rankingUmb: RankingItem[];
  mostrarUmb: boolean;
  rankingOperadores: RankingItem[];
  mostrarOperadores: boolean;
  rankingClientes: RankingItem[];
  mostrarClientes: boolean;
  metricas: MetricasDosRankings;
  onMetricasChange?: (metricas: MetricasDosRankings) => void;
  modoRelatorio?: boolean;
}

export function RankingsSection({
  rankingUmb,
  mostrarUmb,
  rankingOperadores,
  mostrarOperadores,
  rankingClientes,
  mostrarClientes,
  metricas,
  onMetricasChange,
  modoRelatorio = false,
}: RankingsSectionProps) {
  const alterarMetrica = (campo: keyof MetricasDosRankings) =>
    onMetricasChange && ((metrica: MetricaRanking) => onMetricasChange({ ...metricas, [campo]: metrica }));

  const exibirUmb = mostrarUmb && rankingUmb.length > 0;
  const exibirOperadores = mostrarOperadores && rankingOperadores.length > 0;
  const exibirClientes = mostrarClientes && rankingClientes.length > 0;

  const prepararItens = (ranking: RankingItem[], metrica: MetricaRanking) => {
    const ordenado = ordenarRanking(ranking, metrica);
    return modoRelatorio ? ordenado : ordenado.slice(0, LIMITE_RANKING);
  };

  const itensUmb = prepararItens(rankingUmb, metricas.umb);
  const itensOperadores = prepararItens(rankingOperadores, metricas.operadores);
  const itensClientes = prepararItens(rankingClientes, metricas.clientes);
  const igualarAlturas = alturasParecidas(
    [
      exibirUmb && itensUmb.length,
      exibirOperadores && itensOperadores.length,
      exibirClientes && itensClientes.length,
    ].filter((quantidade): quantidade is number => quantidade !== false)
  );

  return (
    <div className={clsx(styles.row, igualarAlturas && styles.alturasIguais)}>
      <BlocoAnimado visivel={exibirUmb}>
        <RankingCard
          entidade="UMB"
          items={itensUmb}
          metrica={metricas.umb}
          onMetricaChange={alterarMetrica('umb')}
          modoRelatorio={modoRelatorio}
        />
      </BlocoAnimado>
      <BlocoAnimado visivel={exibirOperadores}>
        <RankingCard
          entidade="operador"
          items={itensOperadores}
          metrica={metricas.operadores}
          onMetricaChange={alterarMetrica('operadores')}
          modoRelatorio={modoRelatorio}
        />
      </BlocoAnimado>
      <BlocoAnimado visivel={exibirClientes}>
        <RankingCard
          entidade="cliente"
          items={itensClientes}
          tipoDeRotulo="nomeLongo"
          metrica={metricas.clientes}
          onMetricaChange={alterarMetrica('clientes')}
          modoRelatorio={modoRelatorio}
        />
      </BlocoAnimado>
    </div>
  );
}
