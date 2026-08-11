// export const OPCOES_PERIODO_DIAS = [7, 30, 60, 90, 180, 365] as const;
export const OPCOES_PERIODO_DIAS = [7, 30, 60, 90] as const;
export type PeriodoDias = typeof OPCOES_PERIODO_DIAS[number];

export const MAX_DIAS_JANELA = Math.max(...OPCOES_PERIODO_DIAS);
export const DIAS_HISTORICO_GRAFICO_MINIMO = 56;

const LABELS_PERIODO: Record<PeriodoDias, string> = {
  7: '7 dias',
  30: '30 dias',
  60: '60 dias',
  90: '90 dias',
  // 180: '180 dias',
  // 365: '1 ano',
};

export function labelPeriodo(dias: PeriodoDias): string {
  return LABELS_PERIODO[dias];
}

export function opcoesPeriodoDisponiveis(): PeriodoDias[] {
  return OPCOES_PERIODO_DIAS.filter((dias) => dias <= MAX_DIAS_JANELA);
}
