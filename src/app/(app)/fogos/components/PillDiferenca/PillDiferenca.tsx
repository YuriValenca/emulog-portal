import { StatusPill } from '@/components/ui/StatusPill/StatusPill';
import { diferencaKgExcedida } from '@/lib/avaliarRegra';
import type { RegraDeteccao } from '@/schemas/regraDeteccao';

interface PillDiferencaProps {
  dif: number | null;
  regras: RegraDeteccao[];
}

export function PillDiferenca({ dif, regras }: PillDiferencaProps) {
  if (dif === null) return <>—</>;
  return <StatusPill label={`${dif.toFixed(1)}%`} tone={diferencaKgExcedida(dif, regras) ? 'crit' : 'ok'} />;
}
