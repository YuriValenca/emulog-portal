import { PAGE_SIZE_OPTIONS } from '@/hooks/fogos/useProjetos';
import type { Ocorrencia, OcorrenciaStatus, OcorrenciaTipo } from '@/types';
import type { RegraMetrica, RegraOperador } from '@/schemas/regraDeteccao';

type Tom = 'ok' | 'warn' | 'crit' | 'data' | 'neutral';

export const TIPO_OPTIONS: { value: OcorrenciaTipo; label: string }[] = [
  { value: 'densidade_fora_da_faixa', label: 'Densidade fora da faixa' },
  { value: 'diferenca_kg_excedente', label: 'Diferença de Kg excedente' },
  { value: 'rascunho_parado', label: 'Rascunho parado' },
  { value: 'documentacao_pendente', label: 'Documentação pendente' },
  { value: 'equipamento', label: 'Equipamento' },
  { value: 'licenca', label: 'Licença' },
  { value: 'manual', label: 'Manual' },
];

export const STATUS_OPTIONS: { value: OcorrenciaStatus; label: string }[] = [
  { value: 'aberta', label: 'Aberta' },
  { value: 'em_acompanhamento', label: 'Em acompanhamento' },
  { value: 'encerrada', label: 'Encerrada' },
];

const TIPO_TONE_MAP: Partial<Record<OcorrenciaTipo, Tom>> = {
  densidade_fora_da_faixa: 'crit',
  diferenca_kg_excedente: 'crit',
  rascunho_parado: 'warn',
  documentacao_pendente: 'warn',
  equipamento: 'warn',
  manual: 'neutral',
};

export function tipoLabel(o: Ocorrencia) {
  if (o.tipo === 'manual') return o.tituloManual || 'Manual';
  return TIPO_OPTIONS.find((option) => option.value === o.tipo)?.label ?? o.tipo;
}

export function tipoTone(o: Ocorrencia): Tom {
  if (o.tipo === 'licenca') return o.motivo === 'expirada' ? 'crit' : 'warn';
  return TIPO_TONE_MAP[o.tipo] ?? 'neutral';
}

export function categoriaOcorrencia(o: Ocorrencia): 'fogo' | 'geral' {
  return o.projetoId ? 'fogo' : 'geral';
}

const doisDigitos = (n: number) => String(n).padStart(2, '0');

export function dataLocalISO(data: Date): string {
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`;
}

export function dentroDoPeriodoDoFogo(o: Ocorrencia, inicio: string, fim: string): boolean {
  if (!inicio && !fim) return true;
  if (!o.dataFogo) return false;
  const data = dataLocalISO(o.dataFogo.toDate());
  return (!inicio || data >= inicio) && (!fim || data <= fim);
}

export const OPCOES_POR_PAGINA = PAGE_SIZE_OPTIONS.map((n) => ({ value: String(n), label: `${n} por página` }));

export const OPERADOR_OPTIONS: { value: RegraOperador; label: string }[] = [
  { value: 'entre', label: 'Entre' },
  { value: 'maior', label: 'Maior que' },
  { value: 'menor', label: 'Menor que' },
  { value: 'igual', label: 'Igual a' },
];

export interface MetricaConfig {
  descricao: string;
  labelValor: string;
  labelDe?: string;
  labelAte?: string;
  operadorFixo?: RegraOperador;
  somenteInteiro?: boolean;
  avisoJaExiste: string;
}

export const METRICA_CONFIG: Record<RegraMetrica, MetricaConfig> = {
  diferenca_kg: {
    descricao: 'Gera ocorrência quando a diferença entre Kg previsto e aplicado de um fogo bate a condição.',
    labelValor: 'Valor (%)',
    labelDe: 'De (%)',
    labelAte: 'Até (%)',
    avisoJaExiste: 'Já existe uma automação de diferença de Kg. Remova-a antes de criar outra.',
  },
  rascunho_parado: {
    descricao: 'Gera ocorrência quando um fogo em andamento fica mais de X dias sem atualização.',
    labelValor: 'Dias sem atualização',
    operadorFixo: 'maior',
    somenteInteiro: true,
    avisoJaExiste: 'Já existe uma automação de rascunho parado. Remova-a antes de criar outra.',
  },
};

export const METRICA_OPTIONS: { value: RegraMetrica; label: string }[] = [
  { value: 'diferenca_kg', label: 'Diferença de Kg previsto/aplicado' },
  { value: 'rascunho_parado', label: 'Rascunho parado' },
];

export function lerNumeroDigitado(texto: string): number | null {
  const numero = parseFloat(texto.replace(',', '.'));
  return isNaN(numero) ? null : numero;
}

export function erroDosValoresAutomacao(
  config: MetricaConfig,
  operador: RegraOperador,
  v1: number | null,
  v2: number | null
): string | null {
  if (v1 === null) return 'Informe um valor numérico válido.';
  if (config.somenteInteiro && (!Number.isInteger(v1) || v1 < 1)) {
    return 'Informe um número inteiro de dias, a partir de 1.';
  }
  if (operador !== 'entre') return null;
  if (v2 === null) return 'Informe o segundo valor do intervalo.';
  if (v2 <= v1) return 'O valor final deve ser maior que o inicial.';
  return null;
}

export function erroDaNovaOcorrencia(tituloManual: string, descricao: string): string | null {
  if (!tituloManual.trim()) return 'Dê um título curto pra ocorrência.';
  if (!descricao.trim()) return 'Descreva a ocorrência.';
  return null;
}
