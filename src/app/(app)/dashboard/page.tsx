'use client';

import { Flame, Weight, ShieldCheck, Timer, Gauge } from 'lucide-react';
import { FAIXA_DENSIDADE_PADRAO } from '@/lib/densidade';
import { useAppAuth } from '@/hooks/useAppAuth';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { StatCard } from './components/StatCard/StatCard';
import { DashboardCharts } from './components/DashboardCharts/DashboardCharts';
import styles from './page.module.scss';

const DIAS_PERIODO_PADRAO = 30;
const EMPRESA_FOUNDING_ID = 'explog-founding';

export default function DashboardPage() {
  const { companyId, isSuperadmin } = useAppAuth();
  const { data, isLoading, isError } = useDashboardStats(companyId, DIAS_PERIODO_PADRAO);

  if (isSuperadmin && !companyId) {
    return (
      <div className={styles.container}>
        <p className={styles.empty}>Selecione uma empresa no topo da página para ver o painel operacional.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.grid}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard} />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className={styles.container}>
        <p className={styles.empty}>Não foi possível carregar os dados do painel.</p>
      </div>
    );
  }

  const densidadeDentroDaFaixa =
    data.densidadeMediaPeriodo !== null &&
    data.densidadeMediaPeriodo >= FAIXA_DENSIDADE_PADRAO.min &&
    data.densidadeMediaPeriodo <= FAIXA_DENSIDADE_PADRAO.max;

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        <StatCard icon={<Flame size={22} />} label={`Fogos (${DIAS_PERIODO_PADRAO} dias)`} value={data.totalFogosPeriodo} color="var(--accent)" />
        <StatCard icon={<Weight size={22} />} label={`Kg aplicados (${DIAS_PERIODO_PADRAO} dias)`} value={data.kgAplicadoPeriodo.toFixed(0)} sub="kg" color="var(--data)" />
        {companyId !== EMPRESA_FOUNDING_ID && (
          <>
            <StatCard icon={<ShieldCheck size={22} />} label="Licenças ativas" value={data.licencasAtivas} sub={`${data.licencasTotal} no total`} color="var(--ok)" />
            <StatCard icon={<Timer size={22} />} label="Expirando em 30d" value={data.licencasExpirando} color="var(--accent)" />
          </>
        )}
        <StatCard
          icon={<Gauge size={22} />}
          label={`Densidade média (${DIAS_PERIODO_PADRAO} dias)`}
          value={data.densidadeMediaPeriodo !== null ? data.densidadeMediaPeriodo.toFixed(2) : '—'}
          sub={data.densidadeMediaPeriodo !== null ? 'g/cm³' : undefined}
          color={densidadeDentroDaFaixa ? 'var(--ok)' : 'var(--crit)'}
        />
      </div>

      <DashboardCharts
        periodoLabel={`${DIAS_PERIODO_PADRAO} dias`}
        fogosPorSemana={data.fogosPorSemana}
        licencasAtivas={data.licencasAtivas}
        licencasExpirando={data.licencasExpirando}
        licencasDisponiveis={data.licencasDisponiveis}
        fogosConformesPeriodo={data.fogosConformesPeriodo}
        fogosAlertaPeriodo={data.fogosAlertaPeriodo}
      />
    </div>
  );
}
