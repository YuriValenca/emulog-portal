'use client';

import type { RankingItem } from '@/lib/dashboard';
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
  const exibirUmb = mostrarUmb && rankingUmb.length > 0;
  const exibirOperadores = mostrarOperadores && rankingOperadores.length > 0;
  const limitar = (ranking: RankingItem[]) => (modoRelatorio ? ranking : ranking.slice(0, LIMITE_RANKING));

  if (!exibirUmb && !exibirOperadores) return null;

  return (
    <div className={styles.row}>
      {exibirUmb && <RankingCard title="Fogos por UMB" items={limitar(rankingUmb)} modoRelatorio={modoRelatorio} />}
      {exibirOperadores && (
        <RankingCard title="Fogos por operador" items={limitar(rankingOperadores)} modoRelatorio={modoRelatorio} />
      )}
    </div>
  );
}
