import { densidadeMediaDoProjeto, statusConformidade, type ContextoFaixa } from '@/lib/densidade';
import { statusExibidoLicenca, statusExpiracaoLicenca } from '@/lib/licenca';
import { diffPercent } from '@/lib/fogoUtils';
import { diferencaKgExcedida } from '@/lib/avaliarRegra';
import { paraKg } from '@/helpers/parseNumbers';
import type { RegraDeteccao } from '@/schemas/regraDeteccao';
import type { License, Projeto } from '@/types';

export type GranularidadeGrafico = 'diaria' | 'semanal' | 'mensal';

export interface FogoPorPeriodo {
  rotulo: string;
  totalFogos: number;
  kgAplicado: number;
}

export interface RankingItem {
  id: string;
  label: string;
  totalFogos: number;
  kgAplicado: number;
  totalAlertas: number;
  alertasDensidade: number;
  alertasKg: number;
  alertasDensidadeEKg: number;
}

export type MetricaRanking = 'totalFogos' | 'kgAplicado' | 'totalAlertas';

type MotivoDoAlerta = 'densidade' | 'kg' | 'densidadeEKg';

const CAMPO_DO_MOTIVO: Record<MotivoDoAlerta, 'alertasDensidade' | 'alertasKg' | 'alertasDensidadeEKg'> = {
  densidade: 'alertasDensidade',
  kg: 'alertasKg',
  densidadeEKg: 'alertasDensidadeEKg',
};

export interface MetricasDosRankings {
  umb: MetricaRanking;
  operadores: MetricaRanking;
  clientes: MetricaRanking;
}

export const METRICAS_PADRAO: MetricasDosRankings = { umb: 'totalFogos', operadores: 'totalFogos', clientes: 'totalFogos' };

export interface FogoNaoConforme {
  id: string;
  nomeProjeto: string;
  umb: string | null;
  data: string;
  densidadeMedia: number | null;
}

interface RefRanking {
  id: string;
  label: string;
}

export interface EstatisticasDeFogos {
  totalFogosPeriodo: number;
  kgAplicadoPeriodo: number;
  densidadeMediaPeriodo: number | null;
  fogosConformesPeriodo: number;
  fogosAlertaPeriodo: number;
  fogosNaoConformes: FogoNaoConforme[];
  totalAlertasPeriodo: number;
  fogosAgrupados: FogoPorPeriodo[];
  granularidadeGrafico: GranularidadeGrafico;
  rankingUmb: RankingItem[];
  rankingOperadores: RankingItem[];
  rankingClientes: RankingItem[];
}

export interface EstatisticasDeLicencas {
  licencasAtivas: number;
  licencasExpirando: number;
  licencasDisponiveis: number;
  licencasTotal: number;
}

export interface FiltrosAplicadosNoPainel {
  umbs: number;
  operadores: number;
  clientes?: number;
  produtos?: number;
}

export interface BlocosDoPainel {
  rankingUmb: boolean;
  rankingOperadores: boolean;
  rankingClientes: boolean;
  ocorrencias: boolean;
  licencas: boolean;
}

// Licenças e ocorrências abertas são da empresa toda: só o período não as invalida, um filtro de fogo sim.
// Ranking com um único item filtrado é só aquele item, então some.
export function blocosVisiveisDoPainel({ umbs, operadores, clientes = 0, produtos = 0 }: FiltrosAplicadosNoPainel): BlocosDoPainel {
  const filtraFogos = umbs + operadores + clientes + produtos > 0;
  return {
    rankingUmb: umbs !== 1,
    rankingOperadores: operadores !== 1,
    rankingClientes: clientes !== 1,
    ocorrencias: !filtraFogos,
    licencas: !filtraFogos,
  };
}

export type EstatisticasDoPainel = EstatisticasDeFogos & EstatisticasDeLicencas;

export interface FiltrosDeFogos {
  inicio: Date | null;
  fim?: Date | null;
  caminhaoIds: string[];
  operadorIds: string[];
}

const DIAS_LIMITE_AGRUPAMENTO_DIARIO = 31;
const DIAS_LIMITE_AGRUPAMENTO_SEMANAL = 180;
const MS_DIA = 24 * 60 * 60 * 1000;

export function dataDoFogo(value: unknown): Date {
  const v = value as { toDate?: () => Date; seconds?: number };
  if (v?.toDate) return v.toDate();
  if (v?.seconds) return new Date(v.seconds * 1000);
  return new Date(value as string);
}

export function granularidadeDoIntervalo(inicio: Date | null, fim: Date): GranularidadeGrafico {
  if (!inicio) return 'mensal';
  const dias = (fim.getTime() - inicio.getTime()) / MS_DIA;
  if (dias > DIAS_LIMITE_AGRUPAMENTO_SEMANAL) return 'mensal';
  return dias <= DIAS_LIMITE_AGRUPAMENTO_DIARIO ? 'diaria' : 'semanal';
}

const doisDigitos = (n: number) => String(n).padStart(2, '0');

// Chave em data local: `toISOString` é UTC e jogava fogos da noite para o dia seguinte.
function chaveAgrupamento(dataCriacao: Date, granularidade: GranularidadeGrafico): string {
  const ano = dataCriacao.getFullYear();
  const mes = doisDigitos(dataCriacao.getMonth() + 1);
  if (granularidade === 'mensal') return `${ano}-${mes}`;

  const dia = new Date(ano, dataCriacao.getMonth(), dataCriacao.getDate());
  if (granularidade === 'semanal') dia.setDate(dia.getDate() - dia.getDay());
  return `${dia.getFullYear()}-${doisDigitos(dia.getMonth() + 1)}-${doisDigitos(dia.getDate())}`;
}

function rotuloAgrupamento(chave: string, granularidade: GranularidadeGrafico): string {
  const [ano, mes, dia] = chave.split('-');
  return granularidade === 'mensal' ? `${mes}/${ano}` : `${dia}/${mes}`;
}

const kgAplicadoDoFogo = (projeto: Projeto) => paraKg(projeto.informacoesOperacao?.kgAplicado) ?? 0;

export function filtrarFogos(projetos: Projeto[], { inicio, fim, caminhaoIds, operadorIds }: FiltrosDeFogos): Projeto[] {
  return projetos.filter((projeto) => {
    const dataCriacao = dataDoFogo(projeto.dataCriacao);
    if (inicio && dataCriacao < inicio) return false;
    if (fim && dataCriacao > fim) return false;
    if (caminhaoIds.length > 0 && !caminhaoIds.includes(projeto.informacoesOperacao?.caminhao?.id ?? '')) return false;
    if (operadorIds.length > 0 && !projeto.informacoesOperacao?.equipe?.some((membro) => operadorIds.includes(membro.id))) return false;
    return true;
  });
}

function calcularTotais(projetos: Projeto[]) {
  return {
    totalFogosPeriodo: projetos.length,
    kgAplicadoPeriodo: projetos.reduce((total, projeto) => total + kgAplicadoDoFogo(projeto), 0),
  };
}

function itemNaoConforme(projeto: Projeto, densidadeMedia: number | null): FogoNaoConforme {
  return {
    id: projeto.id,
    nomeProjeto: projeto.nomeProjeto || 'Projeto sem nome',
    umb: projeto.informacoesOperacao?.caminhao?.placa ?? null,
    data: dataDoFogo(projeto.dataCriacao).toLocaleDateString('pt-BR'),
    densidadeMedia,
  };
}

function calcularConformidadeDensidade(projetos: Projeto[], contextoFaixa: ContextoFaixa) {
  let somaDensidades = 0;
  let projetosComDensidade = 0;
  let fogosConformesPeriodo = 0;
  let fogosAlertaPeriodo = 0;
  const naoConformes: { projeto: Projeto; densidadeMedia: number | null; timestamp: number }[] = [];

  projetos.forEach((projeto) => {
    const densidadeDoFogo = densidadeMediaDoProjeto(projeto.amostras ?? []);
    if (densidadeDoFogo !== null) {
      somaDensidades += densidadeDoFogo;
      projetosComDensidade += 1;
    }
    const status = statusConformidade(projeto, contextoFaixa);
    if (status === 'crit') {
      fogosAlertaPeriodo += 1;
      naoConformes.push({ projeto, densidadeMedia: densidadeDoFogo, timestamp: dataDoFogo(projeto.dataCriacao).getTime() });
    } else if (status === 'ok') {
      fogosConformesPeriodo += 1;
    }
  });

  const fogosNaoConformes = naoConformes
    .sort((a, b) => b.timestamp - a.timestamp)
    .map((item) => itemNaoConforme(item.projeto, item.densidadeMedia));

  const densidadeMediaPeriodo = projetosComDensidade > 0 ? somaDensidades / projetosComDensidade : null;
  return { densidadeMediaPeriodo, fogosConformesPeriodo, fogosAlertaPeriodo, fogosNaoConformes };
}

function calcularAgrupamentos(projetos: Projeto[], granularidade: GranularidadeGrafico): FogoPorPeriodo[] {
  const agrupamentos = new Map<string, { totalFogos: number; kgAplicado: number }>();

  projetos.forEach((projeto) => {
    const chave = chaveAgrupamento(dataDoFogo(projeto.dataCriacao), granularidade);
    const atual = agrupamentos.get(chave) ?? { totalFogos: 0, kgAplicado: 0 };
    atual.totalFogos += 1;
    atual.kgAplicado += kgAplicadoDoFogo(projeto);
    agrupamentos.set(chave, atual);
  });

  return Array.from(agrupamentos.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([chave, valores]) => ({
      rotulo: rotuloAgrupamento(chave, granularidade),
      totalFogos: valores.totalFogos,
      kgAplicado: Math.round(valores.kgAplicado),
    }));
}

function itensCaminhaoDoProjeto(projeto: Projeto): RefRanking[] {
  const caminhao = projeto.informacoesOperacao?.caminhao;
  return caminhao ? [{ id: caminhao.id, label: caminhao.placa }] : [];
}

function itensOperadoresDoProjeto(projeto: Projeto): RefRanking[] {
  return (projeto.informacoesOperacao?.equipe ?? []).map((membro) => ({ id: membro.id, label: membro.nome }));
}

function itensClienteDoProjeto(projeto: Projeto): RefRanking[] {
  return projeto.cliente ? [{ id: projeto.cliente.id, label: projeto.cliente.nome }] : [];
}

function motivoDoAlerta(projeto: Projeto, contextoFaixa: ContextoFaixa, regras: RegraDeteccao[]): MotivoDoAlerta | null {
  const densidadeFora = statusConformidade(projeto, contextoFaixa) === 'crit';
  const info = projeto.informacoesOperacao;
  const dif = info ? diffPercent(info.kgPrevisto, info.kgAplicado) : null;
  const kgFora = dif !== null && diferencaKgExcedida(dif, regras);

  if (densidadeFora && kgFora) return 'densidadeEKg';
  if (densidadeFora) return 'densidade';
  return kgFora ? 'kg' : null;
}

const itemVazio = (ref: RefRanking): RankingItem => ({
  id: ref.id,
  label: ref.label,
  totalFogos: 0,
  kgAplicado: 0,
  totalAlertas: 0,
  alertasDensidade: 0,
  alertasKg: 0,
  alertasDensidadeEKg: 0,
});

function calcularRanking(
  projetos: Projeto[],
  extrairRefs: (projeto: Projeto) => RefRanking[],
  motivoPorFogo: Map<string, MotivoDoAlerta | null>
): RankingItem[] {
  const mapa = new Map<string, RankingItem>();

  projetos.forEach((projeto) => {
    const motivo = motivoPorFogo.get(projeto.id) ?? null;
    extrairRefs(projeto).forEach((ref) => {
      const atual = mapa.get(ref.id) ?? itemVazio(ref);
      atual.totalFogos += 1;
      atual.kgAplicado += kgAplicadoDoFogo(projeto);
      if (motivo) {
        atual.totalAlertas += 1;
        atual[CAMPO_DO_MOTIVO[motivo]] += 1;
      }
      mapa.set(ref.id, atual);
    });
  });

  return Array.from(mapa.values()).sort((a, b) => b.totalFogos - a.totalFogos);
}

export function ordenarRanking(ranking: RankingItem[], metrica: MetricaRanking): RankingItem[] {
  return [...ranking].sort((a, b) => b[metrica] - a[metrica]);
}

// Um fogo filtrado por operador traz a equipe inteira: o ranking fica só com quem foi selecionado
const soOsSelecionados = (ranking: RankingItem[], ids: string[]) =>
  ids.length === 0 ? ranking : ranking.filter((item) => ids.includes(item.id));

export function calcularEstatisticasDeFogos(
  projetos: Projeto[],
  filtros: FiltrosDeFogos,
  contextoFaixa: ContextoFaixa,
  regras: RegraDeteccao[],
  agora: Date = new Date()
): EstatisticasDeFogos {
  const fogos = filtrarFogos(projetos, filtros);
  const granularidadeGrafico = granularidadeDoIntervalo(filtros.inicio, filtros.fim ?? agora);
  const motivoPorFogo = new Map(fogos.map((fogo) => [fogo.id, motivoDoAlerta(fogo, contextoFaixa, regras)]));

  return {
    ...calcularTotais(fogos),
    ...calcularConformidadeDensidade(fogos, contextoFaixa),
    totalAlertasPeriodo: [...motivoPorFogo.values()].filter(Boolean).length,
    fogosAgrupados: calcularAgrupamentos(fogos, granularidadeGrafico),
    granularidadeGrafico,
    rankingUmb: soOsSelecionados(calcularRanking(fogos, itensCaminhaoDoProjeto, motivoPorFogo), filtros.caminhaoIds),
    rankingOperadores: soOsSelecionados(calcularRanking(fogos, itensOperadoresDoProjeto, motivoPorFogo), filtros.operadorIds),
    rankingClientes: calcularRanking(fogos, itensClienteDoProjeto, motivoPorFogo),
  };
}

export function calcularEstatisticasDeLicencas(licencas: License[], agora: Date = new Date()): EstatisticasDeLicencas {
  let licencasAtivas = 0;
  let licencasExpirando = 0;
  let licencasDisponiveis = 0;

  licencas.forEach((licenca) => {
    const status = statusExibidoLicenca(licenca, agora);
    if (status === 'active' && statusExpiracaoLicenca(licenca, agora) === 'expirando') licencasExpirando += 1;
    else if (status === 'active') licencasAtivas += 1;
    if (status === 'available') licencasDisponiveis += 1;
  });

  return { licencasAtivas, licencasExpirando, licencasDisponiveis, licencasTotal: licencas.length };
}
