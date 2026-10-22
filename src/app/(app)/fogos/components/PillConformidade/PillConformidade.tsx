import { StatusPill } from '@/components/ui/StatusPill/StatusPill';
import { Tooltip } from '@/components/ui/Tooltip/Tooltip';
import type { StatusConformidade } from '@/lib/densidade';

const ROTULO_STATUS: Record<StatusConformidade, string> = {
  ok: 'Conforme',
  crit: 'Alerta',
  neutral: '—',
};

interface PillConformidadeProps {
  status: StatusConformidade;
  motivo: string | null;
}

export function PillConformidade({ status, motivo }: PillConformidadeProps) {
  const pill = <StatusPill label={ROTULO_STATUS[status]} tone={status} />;
  if (!motivo) return pill;
  return <Tooltip conteudo={motivo}>{pill}</Tooltip>;
}
