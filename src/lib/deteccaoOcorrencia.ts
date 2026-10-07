import type { Projeto } from '@/types';
import type { ProjetoRascunho } from '@/schemas/projetoRascunho';
import type { RegraDeteccao } from '@/schemas/regraDeteccao';
import type { OcorrenciaTipo } from '@/schemas/ocorrencia';
import { diffPercent } from './fogoUtils';
import { densidadesForaDaFaixa, faixaDoProjeto, type ContextoFaixa } from './densidade';
import { avaliarRegra } from './avaliarRegra';

export interface OcorrenciaDetectada {
  tipo: OcorrenciaTipo;
  descricao: string;
  valorReferencia: number | null;
  /** Regra que disparou a detecção. `null` para detecções que não vêm de regra (densidade). */
  regraId: string | null;
}

const MS_DIA = 24 * 60 * 60 * 1000;

const nomeDoFogo = (fogo: { nomeProjeto?: string }) => fogo.nomeProjeto?.trim() || 'Sem nome';

function detectarDensidadeForaDaFaixa(projeto: Projeto, contexto: ContextoFaixa): OcorrenciaDetectada | null {
  const faixa = faixaDoProjeto(projeto, contexto);
  const fora = densidadesForaDaFaixa(projeto.amostras ?? [], faixa);
  if (fora.length === 0) return null;

  const amostras = fora.length === 1 ? '1 amostra' : `${fora.length} amostras`;

  return {
    tipo: 'densidade_fora_da_faixa',
    descricao: `Fogo "${nomeDoFogo(projeto)}": ${amostras} com densidade final fora da faixa ${faixa.origem} (${faixa.min.toFixed(2)}–${faixa.max.toFixed(2)}).`,
    valorReferencia: null,
    regraId: null,
  };
}

export function detectarOcorrenciasDoProjeto(
  projeto: Projeto,
  contexto: ContextoFaixa,
  regras: RegraDeteccao[]
): OcorrenciaDetectada[] {
  const detectadas: OcorrenciaDetectada[] = [];
  const info = projeto.informacoesOperacao;

  const densidade = detectarDensidadeForaDaFaixa(projeto, contexto);
  if (densidade) detectadas.push(densidade);

  const dif = info ? diffPercent(info.kgPrevisto, info.kgAplicado) : null;
  if (dif !== null) {
    regras
      .filter((regra) => regra.metrica === 'diferenca_kg')
      .forEach((regra) => {
        if (avaliarRegra(regra, dif)) {
          detectadas.push({
            tipo: 'diferenca_kg_excedente',
            descricao: `Fogo "${nomeDoFogo(projeto)}": diferença de ${dif.toFixed(1)}% entre Kg previsto e aplicado.`,
            valorReferencia: dif,
            regraId: regra.id,
          });
        }
      });
  }

  return detectadas;
}

export function diasSemAtualizacao(rascunho: Pick<ProjetoRascunho, 'dataAtualizacao'>, agora: Date): number {
  return Math.floor((agora.getTime() - rascunho.dataAtualizacao.toDate().getTime()) / MS_DIA);
}

export function detectarOcorrenciasDoRascunho(
  rascunho: ProjetoRascunho,
  regras: RegraDeteccao[],
  agora: Date
): OcorrenciaDetectada[] {
  const dias = diasSemAtualizacao(rascunho, agora);
  return regras
    .filter((regra) => regra.metrica === 'rascunho_parado' && avaliarRegra(regra, dias))
    .map((regra) => ({
      tipo: 'rascunho_parado',
      descricao: `Fogo "${nomeDoFogo(rascunho)}" em andamento sem atualização há ${dias} dias.`,
      valorReferencia: dias,
      regraId: regra.id,
    }));
}
