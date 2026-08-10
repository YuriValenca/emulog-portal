import type { AmostraItem, AmostraGrupo, LegacyPesagemFlat } from '@/types';
import { parseFloatAuto, paraNumero } from '@/helpers/parseNumbers';

export interface FaixaDensidade {
  min: number;
  max: number;
}

export const FAIXA_DENSIDADE_PADRAO: FaixaDensidade = { min: 1.0, max: 1.1 };

function isAmostraGrupo(item: AmostraItem): item is AmostraGrupo {
  return 'pesagens' in item;
}

export function ultimasDensidadesDoProjeto(amostras: AmostraItem[]): number[] {
  const gruposLegado = new Map<number, LegacyPesagemFlat[]>();
  const densidades: number[] = [];

  amostras.forEach((item) => {
    if (isAmostraGrupo(item)) {
      const validas = item.pesagens.filter((p) => p.peso !== '');
      const ultima = validas[validas.length - 1];
      if (ultima) {
        const valor = parseFloatAuto(ultima.densidade);
        if (!isNaN(valor)) densidades.push(valor);
      }
      return;
    }
    const grupoId = item.grupoId ?? 0;
    const lista = gruposLegado.get(grupoId) ?? [];
    lista.push(item);
    gruposLegado.set(grupoId, lista);
  });

  gruposLegado.forEach((lista) => {
    const validas = lista
      .filter((p) => String(p.peso) !== '')
      .sort((a, b) => (a.amostraId ?? 0) - (b.amostraId ?? 0));
    const ultima = validas[validas.length - 1];
    if (ultima) {
      const valor = paraNumero(ultima.densidade);
      if (!isNaN(valor)) densidades.push(valor);
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
