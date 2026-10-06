import type { AmostraItem, LegacyPesagemFlat } from '@/types';
import {
  isAmostraGrupo,
  isAmostraManual,
  isLegacyPesagemFlat,
  densidadesDaAmostraManual,
  numeroOuNull,
  valorVazio,
} from './amostras';

export interface FaixaDensidade {
  min: number;
  max: number;
}

export const FAIXA_DENSIDADE_PADRAO: FaixaDensidade = { min: 1.0, max: 1.1 };

export function ultimasDensidadesDoProjeto(amostras: AmostraItem[]): number[] {
  const gruposLegado = new Map<number, LegacyPesagemFlat[]>();
  const densidades: number[] = [];

  amostras.forEach((item) => {
    if (isAmostraGrupo(item)) {
      const validas = item.pesagens.filter((p) => !valorVazio(p.peso));
      const ultima = validas[validas.length - 1];
      if (ultima) {
        const valor = numeroOuNull(ultima.densidade);
        if (valor !== null) densidades.push(valor);
      }
      return;
    }

    if (isAmostraManual(item)) {
      const { inicial, final } = densidadesDaAmostraManual(item);
      const ultima = final ?? inicial;
      if (ultima !== null) densidades.push(ultima);
      return;
    }

    if (!isLegacyPesagemFlat(item)) return;

    const grupoId = item.grupoId ?? 0;
    const lista = gruposLegado.get(grupoId) ?? [];
    lista.push(item);
    gruposLegado.set(grupoId, lista);
  });

  gruposLegado.forEach((lista) => {
    const validas = lista
      .filter((p) => !valorVazio(p.peso))
      .sort((a, b) => (a.amostraId ?? 0) - (b.amostraId ?? 0));
    const ultima = validas[validas.length - 1];
    if (ultima) {
      const valor = numeroOuNull(ultima.densidade);
      if (valor !== null) densidades.push(valor);
    }
  });

  return densidades;
}

export function densidadeMediaDoProjeto(amostras: AmostraItem[]): number | null {
  const densidades = ultimasDensidadesDoProjeto(amostras);
  if (densidades.length === 0) return null;
  return densidades.reduce((soma, d) => soma + d, 0) / densidades.length;
}

export function projetoForaDaFaixa(
  amostras: AmostraItem[],
  faixa: FaixaDensidade = FAIXA_DENSIDADE_PADRAO
): boolean {
  return ultimasDensidadesDoProjeto(amostras).some((d) => d < faixa.min || d > faixa.max);
}
