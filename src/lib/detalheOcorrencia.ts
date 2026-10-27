import type { AmostraItem, FurosEmPreenchimento } from '@/schemas/projeto';
import type { Ocorrencia } from '@/schemas/ocorrencia';
import { numeroDaAmostra } from './amostras';
import type { FaixaDensidade } from './densidade';
import { densidadesAmostra } from './fogoUtils';
import { LIMIARES_DESVIO_FURO, desvioRelativo, nivelDoDesvio, type NivelDesvio } from './furos';

const TIPOS_COM_DETALHE = new Set<Ocorrencia['tipo']>(['densidade_fora_da_faixa', 'diferenca_kg_excedente']);
const MAXIMO_DE_FUROS_DESTACADOS = 5;
// Com poucos furos a carga do fogo costuma ir toda no primeiro, e o desvio por furo vira ruído
const MINIMO_DE_FUROS_PARA_DESTACAR = 10;

export interface AmostraAvaliada {
  numero: number;
  inicial: number | null;
  final: number | null;
  /** Distância da densidade final até a borda da faixa: positiva acima, negativa abaixo, `null` dentro. */
  foraDaFaixa: number | null;
}

export interface FuroDestacado {
  numero: number;
  cargaReal: number;
  /** Fração com sinal em relação à carga prevista (0.25 = 25% acima). */
  desvio: number;
  nivel: NivelDesvio;
}

export function temDetalhe(ocorrencia: Ocorrencia): boolean {
  return ocorrencia.projetoId !== null && TIPOS_COM_DETALHE.has(ocorrencia.tipo);
}

export function distanciaDaFaixa(valor: number, faixa: FaixaDensidade): number | null {
  if (valor > faixa.max) return valor - faixa.max;
  if (valor < faixa.min) return valor - faixa.min;
  return null;
}

export function avaliarAmostras(amostras: AmostraItem[], faixa: FaixaDensidade): AmostraAvaliada[] {
  return amostras.map((amostra, indice) => {
    const { inicial, final } = densidadesAmostra(amostra);
    return {
      numero: numeroDaAmostra(amostra, indice),
      inicial,
      final,
      foraDaFaixa: final === null ? null : distanciaDaFaixa(final, faixa),
    };
  });
}

export function furosComMaiorDesvio(furos: FurosEmPreenchimento): FuroDestacado[] {
  const { cargaPrevista } = furos;
  if (!cargaPrevista || furos.itens.length < MINIMO_DE_FUROS_PARA_DESTACAR) return [];

  return furos.itens
    .flatMap((furo, indice) => {
      if (furo.cargaReal === null) return [];
      const nivel = nivelDoDesvio(desvioRelativo(furo.cargaReal, cargaPrevista), LIMIARES_DESVIO_FURO.carga);
      if (nivel === 'normal') return [];
      return [{ numero: indice + 1, cargaReal: furo.cargaReal, desvio: (furo.cargaReal - cargaPrevista) / cargaPrevista, nivel }];
    })
    .sort((a, b) => Math.abs(b.desvio) - Math.abs(a.desvio))
    .slice(0, MAXIMO_DE_FUROS_DESTACADOS);
}
