import type { Projeto, Produto } from '@/types';
import type { RegraDeteccao } from '@/schemas/regraDeteccao';
import type { OcorrenciaTipo } from '@/schemas/ocorrencia';
import { densidadeInicialFinalMedia, diffPercent } from './fogoUtils';
import { avaliarRegra } from './avaliarRegra';

export interface OcorrenciaDetectada {
  tipo: OcorrenciaTipo;
  descricao: string;
  valorReferencia: number;
}

export function detectarOcorrenciasDoProjeto(
  projeto: Projeto,
  produtosById: Map<string, Produto>,
  regras: RegraDeteccao[]
): OcorrenciaDetectada[] {
  const detectadas: OcorrenciaDetectada[] = [];
  const info = projeto.informacoesOperacao;

  const produtoId = info?.produto?.id;
  const produto = produtoId ? produtosById.get(produtoId) : undefined;

  if (produto) {
    const { inicial, final } = densidadeInicialFinalMedia(projeto);
    const foraDaFaixa =
      (inicial !== null && (inicial < produto.densidadeMin || inicial > produto.densidadeMax)) ||
      (final !== null && (final < produto.densidadeMin || final > produto.densidadeMax));

    if (foraDaFaixa) {
      const referencia = final ?? inicial ?? 0;
      detectadas.push({
        tipo: 'densidade_fora_da_faixa',
        descricao: `Densidade média ${referencia.toFixed(2)} g/cm³ fora da faixa de ${produto.nome} (${produto.densidadeMin.toFixed(2)}–${produto.densidadeMax.toFixed(2)}).`,
        valorReferencia: referencia,
      });
    }
  }

  if (info?.kgPrevisto && info?.kgAplicado) {
    const dif = diffPercent(info.kgPrevisto, info.kgAplicado);
    if (dif !== null) {
      regras
        .filter((regra) => regra.metrica === 'diferenca_kg')
        .forEach((regra) => {
          if (avaliarRegra(regra, dif)) {
            detectadas.push({
              tipo: 'diferenca_kg_excedente',
              descricao: `Diferença de ${dif.toFixed(1)}% entre Kg previsto e aplicado.`,
              valorReferencia: dif,
            });
          }
        });
    }
  }

  return detectadas;
}
