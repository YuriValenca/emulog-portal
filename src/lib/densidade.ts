import type { AmostraItem, LegacyPesagemFlat, Produto, ProdutoRef } from '@/types';
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

export interface FaixaResolvida extends FaixaDensidade {
  origem: string;
}

export interface ContextoFaixa {
  produtosById: Map<string, Produto>;
  faixaEmpresa: FaixaDensidade;
}

export type StatusConformidade = 'ok' | 'crit' | 'neutral';

type FogoAvaliavel = {
  amostras?: AmostraItem[];
  informacoesOperacao?: { produto?: ProdutoRef | null };
};

export function faixaDaEmpresa(company: { faixaDensidade?: FaixaDensidade | null } | null | undefined): FaixaDensidade {
  return company?.faixaDensidade ?? FAIXA_DENSIDADE_PADRAO;
}

export function criarContextoFaixa(produtos: Produto[], faixaEmpresa: FaixaDensidade): ContextoFaixa {
  return { produtosById: new Map(produtos.map((p) => [p.id, p])), faixaEmpresa };
}

// O app não grava produto no fogo; só o fogo manual do portal tem.
export function faixaDoProjeto(projeto: FogoAvaliavel, contexto: ContextoFaixa): FaixaResolvida {
  const produtoId = projeto.informacoesOperacao?.produto?.id;
  const produto = produtoId ? contexto.produtosById.get(produtoId) : undefined;
  if (produto) return { min: produto.densidadeMin, max: produto.densidadeMax, origem: `de ${produto.nome}` };
  return { ...contexto.faixaEmpresa, origem: 'da empresa' };
}

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

export function densidadesForaDaFaixa(amostras: AmostraItem[], faixa: FaixaDensidade): number[] {
  return ultimasDensidadesDoProjeto(amostras).filter((d) => d < faixa.min || d > faixa.max);
}

export function statusConformidade(projeto: FogoAvaliavel, contexto: ContextoFaixa): StatusConformidade {
  const amostras = projeto.amostras ?? [];
  if (ultimasDensidadesDoProjeto(amostras).length === 0) return 'neutral';
  return densidadesForaDaFaixa(amostras, faixaDoProjeto(projeto, contexto)).length > 0 ? 'crit' : 'ok';
}

export function lerDensidadeDigitada(valor: string): number {
  return parseFloat(valor.replace(',', '.'));
}

export function erroFaixaDigitada(min: number, max: number): string | null {
  if (isNaN(min) || isNaN(max)) return 'Preencha as densidades mínima e máxima.';
  if (min <= 0) return 'A densidade mínima precisa ser maior que zero.';
  if (min > max) return 'A densidade mínima não pode ser maior que a máxima.';
  return null;
}
