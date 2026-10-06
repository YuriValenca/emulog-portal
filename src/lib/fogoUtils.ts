import type { AmostraItem, Projeto, Produto } from '@/types';
import {
  isAmostraGrupo,
  isAmostraManual,
  densidadesDaAmostraManual,
  numeroOuNull,
  type ValorBruto,
} from './amostras';

interface DensidadeAmostra {
  inicial: number | null;
  final: number | null;
}

export function densidadesAmostra(amostra: AmostraItem): DensidadeAmostra {
  if (isAmostraManual(amostra)) {
    return densidadesDaAmostraManual(amostra);
  }

  const pesagens: { densidade: ValorBruto }[] = isAmostraGrupo(amostra) ? amostra.pesagens : [amostra];

  const valores = pesagens
    .map((p) => numeroOuNull(p.densidade))
    .filter((d): d is number => d !== null && d > 0);

  if (valores.length === 0) return { inicial: null, final: null };
  return { inicial: valores[0], final: valores[valores.length - 1] };
}

export function densidadeInicialFinalMedia(projeto: Projeto): DensidadeAmostra {
  const iniciais: number[] = [];
  const finais: number[] = [];

  // `amostras` pode vir ausente: `useProjetosPeriodo` e o auto-scan montam o
  // Projeto com `as Projeto`, sem passar pelo Zod.
  for (const amostra of projeto.amostras ?? []) {
    const { inicial, final } = densidadesAmostra(amostra);
    if (inicial !== null) iniciais.push(inicial);
    if (final !== null) finais.push(final);
  }

  const media = (valores: number[]) => (valores.length > 0 ? valores.reduce((a, b) => a + b, 0) / valores.length : null);

  return { inicial: media(iniciais), final: media(finais) };
}

export function diffPercent(kgPrevisto: string, kgAplicado: string): number | null {
  const prev = parseFloat(kgPrevisto);
  const apl = parseFloat(kgAplicado);
  if (!prev || isNaN(apl)) return null;
  return (Math.abs(apl - prev) / prev) * 100;
}

export function densidadeMedia(projeto: Projeto): number | null {
  const { inicial, final } = densidadeInicialFinalMedia(projeto);
  const valores = [inicial, final].filter((v): v is number => v !== null);
  if (valores.length === 0) return null;
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

export function statusConformidade(
  projeto: Projeto,
  produtosById: Map<string, Produto>
): 'ok' | 'crit' | 'neutral' {
  const produtoId = projeto.informacoesOperacao?.produto?.id;
  if (!produtoId) return 'neutral';

  const produto = produtosById.get(produtoId);
  if (!produto) return 'neutral';

  const { inicial, final } = densidadeInicialFinalMedia(projeto);
  if (inicial === null || final === null) return 'neutral';

  const dentroDaFaixa = inicial >= produto.densidadeMin && inicial <= produto.densidadeMax
    && final >= produto.densidadeMin && final <= produto.densidadeMax;

  return dentroDaFaixa ? 'ok' : 'crit';
}
