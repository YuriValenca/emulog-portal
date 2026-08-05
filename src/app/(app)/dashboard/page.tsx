'use client';

import { Flame, Weight, ShieldCheck, Timer } from 'lucide-react';
import { useAppAuth } from '@/hooks/useAppAuth';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { StatCard } from './components/StatCard/StatCard';
import { DashboardCharts } from './components/DashboardCharts/DashboardCharts';
import styles from './page.module.scss';

export default function DashboardPage() {
  const { companyId, isSuperadmin } = useAppAuth();
  const { data, isLoading, isError } = useDashboardStats(companyId);

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
  console.log(data)
  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        <StatCard icon={<Flame size={22} />} label="Fogos (30 dias)" value={data.fogosUltimos30Dias} color="var(--accent)" />
        <StatCard icon={<Weight size={22} />} label="Kg aplicados (30 dias)" value={data.kgAplicadoUltimos30Dias.toFixed(0)} sub="kg" color="var(--data)" />
        <StatCard icon={<ShieldCheck size={22} />} label="Licenças ativas" value={data.licencasAtivas} sub={`${data.licencasTotal} no total`} color="var(--ok)" />
        <StatCard icon={<Timer size={22} />} label="Expirando em 30d" value={data.licencasExpirando} color="var(--accent)" />
      </div>

      <DashboardCharts
        fogosPorSemana={data.fogosPorSemana}
        licencasAtivas={data.licencasAtivas}
        licencasExpirando={data.licencasExpirando}
        licencasDisponiveis={data.licencasDisponiveis}
      />
    </div>
  );
}
