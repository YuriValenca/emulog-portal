'use client';

import { useState } from 'react';
import { Flame, Weight, Gauge, AlertTriangle } from 'lucide-react';
import { FAIXA_DENSIDADE_PADRAO } from '@/lib/densidade';
import { OPCOES_PERIODO, labelPeriodo, periodoDoValor, type Periodo } from '@/lib/periodo';
import { useAppAuth } from '@/hooks/useAppAuth';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useCaminhoes } from '@/hooks/cadastro/useCaminhoes';
import { useOperadores } from '@/hooks/cadastro/useOperadores';
import { useCompanyGroup } from '@/hooks/fogos/useCompanyGroup';
import { useOcorrencias } from '@/hooks/ocorrencias/useOcorrencias';
import { Select } from '@/components/ui/Select/Select';
import { MultiSelect } from '@/components/ui/Multiselect/Multiselect';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { StatCard } from './components/StatCard/StatCard';
import { DashboardCharts } from './components/DashboardCharts/DashboardCharts';
import { RankingsSection } from './components/RankingsSection/RankingsSection';
import styles from './page.module.scss';

const OPCOES_SELECT_PERIODO = OPCOES_PERIODO.map((periodo) => ({
  value: String(periodo),
  label: labelPeriodo(periodo),
}));

export default function DashboardPage() {
  const { companyId, isSuperadmin } = useAppAuth();

  if (isSuperadmin && !companyId) {
    return (
      <div className={styles.container}>
        <p className={styles.empty}>Selecione uma empresa no topo da página para ver o painel operacional.</p>
      </div>
    );
  }

  // A `key` é load-bearing: remontar ao trocar de empresa é o que zera os filtros.
  return <PainelOperacional key={companyId ?? 'sem-empresa'} companyId={companyId} />;
}

function PainelOperacional({ companyId }: { companyId: string | null }) {
  const [periodo, setPeriodo] = useState<Periodo>(30);
  const [caminhaoId, setCaminhaoId] = useState<string[]>([]);
  const [operadorIds, setOperadorIds] = useState<string[]>([]);

  const { caminhoes } = useCaminhoes(companyId);
  const { operadores } = useOperadores(companyId);
  const { companyIds } = useCompanyGroup(companyId);
  const { ocorrencias, isLoading: isLoadingOcorrencias } = useOcorrencias(companyIds);
  const { data, isLoading, isError, isAtualizando } = useDashboardStats(
    companyId,
    periodo,
    caminhaoId.length === 0 ? null : caminhaoId[0] ?? null,
    operadorIds
  );

  const opcoesSelectUmb = (caminhoes ?? []).map((c) => ({ value: c.id, label: c.tag ?? c.placa }));
  const opcoesSelectOperador = (operadores ?? []).map((o) => ({ value: o.id, label: o.nome }));

  const periodoLabel = labelPeriodo(periodo);
  const ocorrenciasAbertas = ocorrencias.filter((o) => o.status !== 'encerrada').length;

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.grid}>
          {Array.from({ length: 4 }).map((_, i) => (
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
        <StatCard
          icon={<AlertTriangle size={22} />}
          label="Ocorrências abertas"
          value={isLoadingOcorrencias ? '—' : ocorrenciasAbertas}
          color={ocorrenciasAbertas > 0 ? 'var(--crit)' : 'var(--ok)'}
        />
      </div>
      <div className={styles.filtros}>
        <Select
          value={String(periodo)}
          onValueChange={(value) => setPeriodo(periodoDoValor(value))}
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
        {isAtualizando && (
          <span className={styles.atualizando} aria-label="Atualizando período">
            <Spinner size="sm" />
          </span>
        )}
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
