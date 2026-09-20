import type { AlertaVencimento, AlertaVencimentoPorTipo, VencimentoTipo } from '@/schemas/vencimento';

export const DEFAULT_ALERTA_VENCIMENTO: AlertaVencimentoPorTipo = {
  calibracao_equipamento: { horasAlerta: 24, horasCritico: 12 },
  documento_umb: { horasAlerta: 720, horasCritico: 240 },
  certificacao_operador: { horasAlerta: 720, horasCritico: 240 },
  manual: { horasAlerta: 720, horasCritico: 240 },
};

export function alertaParaTipo(config: AlertaVencimentoPorTipo | undefined, tipo: VencimentoTipo): AlertaVencimento {
  return config?.[tipo] ?? DEFAULT_ALERTA_VENCIMENTO[tipo];
}

export type UrgenciaVencimento = 'ok' | 'alerta' | 'critico';

export function urgenciaVencimento(dataVencimento: Date, alerta: AlertaVencimento, agora: Date = new Date()): UrgenciaVencimento {
  const horasRestantes = (dataVencimento.getTime() - agora.getTime()) / 36e5;
  if (horasRestantes <= alerta.horasCritico) return 'critico';
  if (horasRestantes <= alerta.horasAlerta) return 'alerta';
  return 'ok';
}

export function formatarHorasRestantes(horas: number): string {
  if (Math.abs(horas) < 48) return `${Math.round(horas)}h`;
  return `${Math.round(horas / 24)} dias`;
}
