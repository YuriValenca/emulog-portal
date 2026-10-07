export const OPCOES_PERIODO = [7, 30, 60, 90, 180, 365, 'tudo'] as const;
export type Periodo = typeof OPCOES_PERIODO[number];

const MS_DIA = 1000 * 60 * 60 * 24;

const LABELS_PERIODO: Record<Periodo, string> = {
  7: '7 dias',
  30: '30 dias',
  60: '60 dias',
  90: '90 dias',
  180: '6 meses',
  365: '1 ano',
  tudo: 'desde o início',
};

export function labelPeriodo(periodo: Periodo): string {
  return LABELS_PERIODO[periodo];
}

/** `null` quando o período não tem começo: "desde o início". */
export function inicioDoPeriodo(periodo: Periodo, agora: Date = new Date()): Date | null {
  if (periodo === 'tudo') return null;
  return new Date(agora.getTime() - periodo * MS_DIA);
}

export function periodoDoValor(valor: string): Periodo {
  return valor === 'tudo' ? 'tudo' : (Number(valor) as Periodo);
}
