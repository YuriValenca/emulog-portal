import type { Projeto } from '@/types';
import type { Produto } from '@/types';

interface DensidadeAmostra {
  inicial: number | null;
  final: number | null;
}

export function densidadesAmostra(amostra: Projeto['amostras'][number]): DensidadeAmostra {
  if ('densidadeInicial' in amostra || 'densidadeFinal' in amostra) {
    const inicial = typeof amostra.densidadeInicial === 'number' ? amostra.densidadeInicial : null;
    const final = typeof amostra.densidadeFinal === 'number' ? amostra.densidadeFinal : null;
    return { inicial, final };
  }

  const pesagens = 'pesagens' in amostra && amostra.pesagens ? amostra.pesagens : [amostra];
  const valores = pesagens
    .map((p) => parseFloat(String((p as { densidade: unknown }).densidade)))
    .filter((d) => !isNaN(d) && d > 0);

  if (valores.length === 0) return { inicial: null, final: null };
  return { inicial: valores[0], final: valores[valores.length - 1] };
}

export function densidadeInicialFinalMedia(projeto: Projeto): DensidadeAmostra {
  const iniciais: number[] = [];
  const finais: number[] = [];

  for (const amostra of projeto.amostras) {
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
