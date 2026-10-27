import { create } from 'zustand';
import { DEFAULT_PAGE_SIZE } from '@/hooks/fogos/useProjetos';
import type { IntervaloDigitado } from '@/helpers/dataLocal';
import type { RegraMetrica, RegraOperador } from '@/schemas/regraDeteccao';

interface FiltrosOcorrencias {
  status: string;
  tipo: string;
  dataInicio: string;
  dataFim: string;
  pagina: number;
  porPagina: number;
  mudarStatus: (status: string) => void;
  mudarTipo: (tipo: string) => void;
  mudarIntervalo: (intervalo: IntervaloDigitado) => void;
  mudarPorPagina: (porPagina: number) => void;
  irParaPagina: (pagina: number) => void;
}

// Store global de propósito: os filtros sobrevivem à navegação e continuam ali ao voltar para a página
export const useFiltrosOcorrencias = create<FiltrosOcorrencias>((set) => ({
  status: '',
  tipo: '',
  dataInicio: '',
  dataFim: '',
  pagina: 1,
  porPagina: DEFAULT_PAGE_SIZE,
  mudarStatus: (status) => set({ status, pagina: 1 }),
  mudarTipo: (tipo) => set({ tipo, pagina: 1 }),
  mudarIntervalo: ({ inicio, fim }) => set({ dataInicio: inicio, dataFim: fim, pagina: 1 }),
  mudarPorPagina: (porPagina) => set({ porPagina, pagina: 1 }),
  irParaPagina: (pagina) => set({ pagina }),
}));

interface FormNovaOcorrencia {
  aberta: boolean;
  tituloManual: string;
  descricao: string;
  valorReferencia: string;
  erro: string | null;
  abrir: () => void;
  fechar: () => void;
  alterar: (campos: Partial<Pick<FormNovaOcorrencia, 'tituloManual' | 'descricao' | 'valorReferencia'>>) => void;
  mostrarErro: (erro: string | null) => void;
}

const NOVA_OCORRENCIA_VAZIA = { tituloManual: '', descricao: '', valorReferencia: '', erro: null };

export const useFormNovaOcorrencia = create<FormNovaOcorrencia>((set) => ({
  aberta: false,
  ...NOVA_OCORRENCIA_VAZIA,
  abrir: () => set({ aberta: true, ...NOVA_OCORRENCIA_VAZIA }),
  fechar: () => set({ aberta: false }),
  alterar: (campos) => set(campos),
  mostrarErro: (erro) => set({ erro }),
}));

interface FormNovaAutomacao {
  aberta: boolean;
  metrica: RegraMetrica;
  operadorEscolhido: RegraOperador;
  valor1: string;
  valor2: string;
  erro: string | null;
  abrir: () => void;
  fechar: () => void;
  mudarMetrica: (metrica: RegraMetrica) => void;
  alterar: (campos: Partial<Pick<FormNovaAutomacao, 'operadorEscolhido' | 'valor1' | 'valor2'>>) => void;
  mostrarErro: (erro: string | null) => void;
}

const VALORES_AUTOMACAO_VAZIOS = { valor1: '', valor2: '', erro: null };

export const useFormNovaAutomacao = create<FormNovaAutomacao>((set) => ({
  aberta: false,
  metrica: 'diferenca_kg',
  operadorEscolhido: 'maior',
  ...VALORES_AUTOMACAO_VAZIOS,
  abrir: () => set({ aberta: true, metrica: 'diferenca_kg', operadorEscolhido: 'maior', ...VALORES_AUTOMACAO_VAZIOS }),
  fechar: () => set({ aberta: false }),
  mudarMetrica: (metrica) => set({ metrica, ...VALORES_AUTOMACAO_VAZIOS }),
  alterar: (campos) => set(campos),
  mostrarErro: (erro) => set({ erro }),
}));
