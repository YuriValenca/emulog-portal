'use client';

import type { ReactNode } from 'react';
import { AlertTriangle, Flame, Gauge, Weight } from 'lucide-react';
// TODO: mover StatCard, RankingsSection e DashboardCharts para components/painel, já que três rotas usam
import { StatCard } from '@/app/(app)/dashboard/components/StatCard/StatCard';
import { RankingsSection } from '@/app/(app)/dashboard/components/RankingsSection/RankingsSection';
import { DashboardCharts } from '@/app/(app)/dashboard/components/DashboardCharts/DashboardCharts';
import type { BlocosDoPainel, EstatisticasDoPainel, MetricasDosRankings } from '@/lib/dashboard';
import type { FaixaDensidade } from '@/lib/densidade';
import { BlocoAnimado } from '../BlocoAnimado/BlocoAnimado';
import styles from './ConteudoDoPainel.module.scss';

interface CardsDoPainelProps {
  estatisticas: EstatisticasDoPainel;
  periodoLabel: string;
  faixa: FaixaDensidade;
  ocorrenciasAbertas: number | null;
  mostrarOcorrencias: boolean;
}

function CardsDoPainel({ estatisticas, periodoLabel, faixa, ocorrenciasAbertas, mostrarOcorrencias }: CardsDoPainelProps) {
  const media = estatisticas.densidadeMediaPeriodo;
  const densidadeDentroDaFaixa = media !== null && media >= faixa.min && media <= faixa.max;

  return (
    <div className={styles.cards}>
      <StatCard icon={<Flame size={22} />} label={`Fogos (${periodoLabel})`} value={estatisticas.totalFogosPeriodo} color="var(--accent)" />
      <StatCard
        icon={<Weight size={22} />}
        label={`Kg aplicados (${periodoLabel})`}
        value={estatisticas.kgAplicadoPeriodo.toFixed(0)}
        sub="kg"
        color="var(--data)"
      />
      <StatCard
        icon={<Gauge size={22} />}
        label={`Densidade média (${periodoLabel})`}
        value={media !== null ? media.toFixed(2) : '—'}
        sub={media !== null ? 'g/cm³' : undefined}
        color={densidadeDentroDaFaixa ? 'var(--ok)' : 'var(--crit)'}
      />
      <BlocoAnimado visivel={mostrarOcorrencias} className={styles.cardRecolhivel}>
        <StatCard
          icon={<AlertTriangle size={22} />}
          label="Ocorrências abertas"
          value={ocorrenciasAbertas ?? '—'}
          color={ocorrenciasAbertas ? 'var(--crit)' : 'var(--ok)'}
        />
      </BlocoAnimado>
    </div>
  );
}

interface ConteudoDoPainelProps extends Omit<CardsDoPainelProps, 'mostrarOcorrencias'> {
  metricas: MetricasDosRankings;
  onMetricasChange?: (metricas: MetricasDosRankings) => void;
  blocos: BlocosDoPainel;
  modoRelatorio?: boolean;
  entreCardsERankings?: ReactNode;
}

export function ConteudoDoPainel({
  estatisticas,
  periodoLabel,
  faixa,
  ocorrenciasAbertas,
  metricas,
  onMetricasChange,
  blocos,
  modoRelatorio = false,
  entreCardsERankings,
}: ConteudoDoPainelProps) {
  return (
    <div className={styles.conteudo}>
      <CardsDoPainel
        estatisticas={estatisticas}
        periodoLabel={periodoLabel}
        faixa={faixa}
        ocorrenciasAbertas={ocorrenciasAbertas}
        mostrarOcorrencias={blocos.ocorrencias}
      />
      {entreCardsERankings}
      <RankingsSection
        rankingUmb={estatisticas.rankingUmb}
        mostrarUmb={blocos.rankingUmb}
        rankingOperadores={estatisticas.rankingOperadores}
        mostrarOperadores={blocos.rankingOperadores}
        metricas={metricas}
        onMetricasChange={onMetricasChange}
        modoRelatorio={modoRelatorio}
      />
      <DashboardCharts
        periodoLabel={periodoLabel}
        fogosAgrupados={estatisticas.fogosAgrupados}
        granularidadeGrafico={estatisticas.granularidadeGrafico}
        licencasAtivas={estatisticas.licencasAtivas}
        licencasExpirando={estatisticas.licencasExpirando}
        licencasDisponiveis={estatisticas.licencasDisponiveis}
        fogosConformesPeriodo={estatisticas.fogosConformesPeriodo}
        fogosAlertaPeriodo={estatisticas.fogosAlertaPeriodo}
        fogosNaoConformes={estatisticas.fogosNaoConformes}
        mostrarLicencas={blocos.licencas}
        modoRelatorio={modoRelatorio}
      />
    </div>
  );
}
