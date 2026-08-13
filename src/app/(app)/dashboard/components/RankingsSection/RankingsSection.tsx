'use client';

import type { RankingItem } from '@/hooks/useDashboardStats';
import { RankingCard } from './RankingCard/RankingCard';
import styles from './RankingsSection.module.scss';

interface RankingsSectionProps {
  rankingUmb: RankingItem[];
  mostrarUmb: boolean;
  rankingOperadores: RankingItem[];
  mostrarOperadores: boolean;
}

export function RankingsSection({ rankingUmb, mostrarUmb, rankingOperadores, mostrarOperadores }: RankingsSectionProps) {
  const exibirUmb = mostrarUmb && rankingUmb.length > 0;
  const exibirOperadores = mostrarOperadores && rankingOperadores.length > 0;

  if (!exibirUmb && !exibirOperadores) return null;

  return (
    <div className={styles.row}>
      {exibirUmb && <RankingCard title="Fogos por UMB" items={rankingUmb} />}
      {exibirOperadores && <RankingCard title="Fogos por operador" items={rankingOperadores} />}
    </div>
  );
}
