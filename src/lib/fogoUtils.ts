import type { AmostraItem, Projeto, Produto, ProdutoRef } from '@/types';
import {
  isAmostraGrupo,
  isAmostraManual,
  densidadesDaAmostraManual,
  numeroOuNull,
  type ValorBruto,
} from './amostras';
import { paraKg, type ValorKg } from '@/helpers/parseNumbers';

interface DensidadeAmostra {
  inicial: number | null;
  final: number | null;
}

type FogoComAmostras = { amostras?: AmostraItem[] };

type FogoComProduto = FogoComAmostras & {
  informacoesOperacao?: { produto?: ProdutoRef | null };
};

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

export function densidadeInicialFinalMedia(projeto: FogoComAmostras): DensidadeAmostra {
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

function mesmoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

/**
 * Data de conclusão só quando ela cai em outro dia: fogo rascunhado e concluído no
 * mesmo dia não ganha uma segunda data na tela, que seria ruído repetido.
 */
export function conclusaoEmOutroDia(projeto: Pick<Projeto, 'dataCriacao' | 'dataConclusao'>): Date | null {
  if (!projeto.dataConclusao) return null;
  const conclusao = projeto.dataConclusao.toDate();
  return mesmoDia(projeto.dataCriacao.toDate(), conclusao) ? null : conclusao;
}

export function diffPercent(kgPrevisto: ValorKg, kgAplicado: ValorKg): number | null {
  const prev = paraKg(kgPrevisto);
  const apl = paraKg(kgAplicado);
  if (!prev || apl === null) return null;
  return (Math.abs(apl - prev) / prev) * 100;
}

/** Texto que não dá pra interpretar aparece como veio, em vez de virar traço. */
export function formatarKg(valor: ValorKg): string {
  const kg = paraKg(valor);
  if (kg !== null) return kg.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  return typeof valor === 'string' && valor.trim() ? valor : '—';
}

export function densidadeMedia(projeto: FogoComAmostras): number | null {
  const { inicial, final } = densidadeInicialFinalMedia(projeto);
  const valores = [inicial, final].filter((v): v is number => v !== null);
  if (valores.length === 0) return null;
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

export function statusConformidade(
  projeto: FogoComProduto,
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
