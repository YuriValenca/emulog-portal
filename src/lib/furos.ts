import type { FurosEmPreenchimento } from '@/schemas/projeto';

export type NivelDesvio = 'normal' | 'alerta' | 'critico';

interface Faixas {
  alerta: number;
  critico: number;
}

// TODO: valores provisórios para calibrar na tela. Desvio relativo ao previsto (0.1 = 10%):
// a partir de `alerta` o campo fica amarelo, a partir de `critico` fica vermelho.
export const LIMIARES_DESVIO_FURO: { profundidade: Faixas; carga: Faixas } = {
  profundidade: { alerta: 0.05, critico: 0.15 },
  carga: { alerta: 0.1, critico: 0.25 },
};

export function desvioRelativo(real: number | null, previsto: number | null): number | null {
  if (real === null || previsto === null || previsto === 0) return null;
  return Math.abs(real - previsto) / previsto;
}

export function nivelDoDesvio(desvio: number | null, faixas: Faixas): NivelDesvio {
  if (desvio === null) return 'normal';
  if (desvio >= faixas.critico) return 'critico';
  if (desvio >= faixas.alerta) return 'alerta';
  return 'normal';
}

// Arredonda em 2 casas, como o app: somar decimais em ponto flutuante deixa resto (61,88 + 0,1)
export function somarCargasReais(itens: { cargaReal: number | null }[]): number {
  return Math.round(itens.reduce((total, furo) => total + (furo.cargaReal ?? 0), 0) * 100) / 100;
}

export function totalPrevistoDosFuros(furos: FurosEmPreenchimento): number | null {
  if (furos.cargaPrevista === null) return null;
  return Math.round(furos.itens.length * furos.cargaPrevista * 100) / 100;
}

export function formatarPercentual(fracao: number): string {
  return `${Math.round(fracao * 100)}%`;
}
