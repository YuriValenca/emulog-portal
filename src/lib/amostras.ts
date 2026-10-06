import type { AmostraItem, AmostraGrupo, AmostraManual, LegacyPesagemFlat } from '@/types';
import { paraNumero } from '@/helpers/parseNumbers';

/**
 * Peso e densidade chegam do Firestore em três formatos diferentes, dependendo
 * de quem gravou o fogo e de o documento ter passado ou não pelo Zod:
 *
 *   - `projetoSchema.parse()` converte `''` em `null` (transform do `pesoOuVazio`);
 *   - `useProjetosPeriodo` e o auto-scan fazem `as Projeto` sem parse, então `''` continua `''`;
 *   - o app mobile grava número puro.
 *
 * Todo acesso a esses campos passa por aqui pra não depender de qual caminho trouxe o dado.
 */
export type ValorBruto = string | number | null | undefined;

export function valorVazio(valor: ValorBruto): boolean {
  if (valor === null || valor === undefined) return true;
  return typeof valor === 'string' && valor.trim() === '';
}

export function numeroOuNull(valor: ValorBruto): number | null {
  if (valorVazio(valor)) return null;
  const numero = paraNumero(valor as string | number);
  return isNaN(numero) ? null : numero;
}

export function isAmostraGrupo(item: AmostraItem): item is AmostraGrupo {
  return 'pesagens' in item && Array.isArray(item.pesagens);
}

/** Amostra criada pelo portal: só densidade inicial e final, sem pesagens. */
export function isAmostraManual(item: AmostraItem): item is AmostraManual {
  return 'densidadeInicial' in item || 'densidadeFinal' in item;
}

/** Formato antigo do mobile: uma pesagem solta por item, agrupada por `grupoId`. */
export function isLegacyPesagemFlat(item: AmostraItem): item is LegacyPesagemFlat {
  return !isAmostraGrupo(item) && !isAmostraManual(item);
}

export function densidadesDaAmostraManual(amostra: AmostraManual): {
  inicial: number | null;
  final: number | null;
} {
  return {
    inicial: numeroOuNull(amostra.densidadeInicial),
    final: numeroOuNull(amostra.densidadeFinal),
  };
}
