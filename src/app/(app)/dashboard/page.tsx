'use client';

import { useEffect, useState } from 'react';
import { Flame, Weight, ShieldCheck, Timer, Gauge } from 'lucide-react';
import { FAIXA_DENSIDADE_PADRAO } from '@/lib/densidade';
import { opcoesPeriodoDisponiveis, labelPeriodo, type PeriodoDias } from '@/lib/periodo';
import { useAppAuth } from '@/hooks/useAppAuth';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useCaminhoes } from '@/hooks/cadastro/useCaminhoes';
import { useOperadores } from '@/hooks/cadastro/useOperadores';
import { Select } from '@/components/ui/Select/Select';
import { MultiSelect } from '@/components/ui/Multiselect/Multiselect';
import { StatCard } from './components/StatCard/StatCard';
import { DashboardCharts } from './components/DashboardCharts/DashboardCharts';
import { RankingsSection } from './components/RankingsSection/RankingsSection';
import styles from './page.module.scss';

const OPCOES_SELECT_PERIODO = opcoesPeriodoDisponiveis().map((dias) => ({
  value: String(dias),
  label: labelPeriodo(dias),
}));

export default function DashboardPage() {
  const { companyId, isSuperadmin } = useAppAuth();
  const [diasPeriodo, setDiasPeriodo] = useState<PeriodoDias>(30);
  const [caminhaoId, setCaminhaoId] = useState<string[]>([]);
  const [operadorIds, setOperadorIds] = useState<string[]>([]);

  const { caminhoes } = useCaminhoes(companyId);
  const { operadores } = useOperadores(companyId);
  const { data, isLoading, isError } = useDashboardStats(
    companyId,
    diasPeriodo,
    caminhaoId.length === 0 ? null : caminhaoId[0] ?? null,
    operadorIds
  );

  useEffect(() => {
    setCaminhaoId([]);
    setOperadorIds([]);
  }, [companyId]);

  const opcoesSelectUmb = (caminhoes ?? []).map((c) => ({ value: c.id, label: c.tag ?? c.placa }));
  const opcoesSelectOperador = (operadores ?? []).map((o) => ({ value: o.id, label: o.nome }));

  if (isSuperadmin && !companyId) {
    return (
      <div className={styles.container}>
        <p className={styles.empty}>Selecione uma empresa no topo da página para ver o painel operacional.</p>
      </div>
    );
  }

  const periodoLabel = labelPeriodo(diasPeriodo);

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
        <StatCard icon={<Flame size={22} />} label={`Fogos (${periodoLabel})`} value={data.totalFogosPeriodo} color="var(--accent)" />
        <StatCard icon={<Weight size={22} />} label={`Kg aplicados (${periodoLabel})`} value={data.kgAplicadoPeriodo.toFixed(0)} sub="kg" color="var(--data)" />
        <StatCard
          icon={<Gauge size={22} />}
          label={`Densidade média (${periodoLabel})`}
          value={data.densidadeMediaPeriodo !== null ? data.densidadeMediaPeriodo.toFixed(2) : '—'}
          sub={data.densidadeMediaPeriodo !== null ? 'g/cm³' : undefined}
          color={densidadeDentroDaFaixa ? 'var(--ok)' : 'var(--crit)'}
        />
      </div>
      <div className={styles.filtros}>
        <Select
          value={String(diasPeriodo)}
          onValueChange={(value) => setDiasPeriodo(Number(value) as PeriodoDias)}
          options={OPCOES_SELECT_PERIODO}
          size="sm"
          label='Período'
          width={150}
        />
        <MultiSelect
          values={caminhaoId}
          onValuesChange={setCaminhaoId}
          options={opcoesSelectUmb}
          placeholder="Todas"
          size="sm"
          label='UMB'
          width={150}
        />
        <MultiSelect
          values={operadorIds}
          onValuesChange={setOperadorIds}
          options={opcoesSelectOperador}
          placeholder="Todos"
          size="sm"
          label='Operadores'
          width={320}
        />
      </div>

      <RankingsSection
        rankingUmb={data.rankingUmb}
        mostrarUmb={caminhaoId.length === 0}
        rankingOperadores={data.rankingOperadores}
        mostrarOperadores={operadorIds.length === 0}
      />

      <DashboardCharts
        periodoLabel={periodoLabel}
        fogosAgrupados={data.fogosAgrupados}
        granularidadeGrafico={data.granularidadeGrafico}
        licencasAtivas={data.licencasAtivas}
        licencasExpirando={data.licencasExpirando}
        licencasDisponiveis={data.licencasDisponiveis}
        fogosConformesPeriodo={data.fogosConformesPeriodo}
        fogosAlertaPeriodo={data.fogosAlertaPeriodo}
        fogosNaoConformes={data.fogosNaoConformes}
      />
    </div>
  );
}
