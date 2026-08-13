'use client';

import { useMemo } from 'react';
import { useProjetosPeriodo } from './useProjetosPeriodo';
import { useLicencas } from './useLicencas';
import { densidadeMediaDoProjeto, projetoForaDaFaixa, FAIXA_DENSIDADE_PADRAO, type FaixaDensidade } from '@/lib/densidade';
import type { PeriodoDias } from '@/lib/periodo';
import { parseFloatPTBR } from '@/helpers/parseNumbers';
import type { License, Projeto } from '@/types';

export type GranularidadeGrafico = 'diaria' | 'semanal';

export interface FogoPorPeriodo {
  rotulo: string;
  totalFogos: number;
  kgAplicado: number;
}

export interface RankingItem {
  id: string;
  label: string;
  totalFogos: number;
}

interface RefRanking {
  id: string;
  label: string;
}

export interface DashboardStats {
  totalFogosPeriodo: number;
  kgAplicadoPeriodo: number;
  densidadeMediaPeriodo: number | null;
  fogosConformesPeriodo: number;
  fogosAlertaPeriodo: number;
  licencasAtivas: number;
  licencasExpirando: number;
  licencasDisponiveis: number;
  licencasTotal: number;
  fogosAgrupados: FogoPorPeriodo[];
  granularidadeGrafico: GranularidadeGrafico;
  rankingUmb: RankingItem[];
  rankingOperadores: RankingItem[];
}

const MS_DIA = 1000 * 60 * 60 * 24;
const JANELA_EXPIRACAO_LICENCA_DIAS = 30;
const DIAS_LIMITE_AGRUPAMENTO_DIARIO = 31;
const LIMITE_RANKING = 5;

function toDate(value: unknown): Date {
  const v = value as { toDate?: () => Date; seconds?: number };
  if (v?.toDate) return v.toDate();
  if (v?.seconds) return new Date(v.seconds * 1000);
  return new Date(value as string);
}

function granularidadePara(diasPeriodo: number): GranularidadeGrafico {
  return diasPeriodo <= DIAS_LIMITE_AGRUPAMENTO_DIARIO ? 'diaria' : 'semanal';
}

function chaveAgrupamento(dataCriacao: Date, granularidade: GranularidadeGrafico): string {
  if (granularidade === 'diaria') return dataCriacao.toISOString().slice(0, 10);
  const inicioSemana = new Date(dataCriacao);
  inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
  return inicioSemana.toISOString().slice(0, 10);
}

function filtrarProjetosDoPeriodo(
  projetos: Projeto[],
  inicioPeriodo: Date,
  caminhaoId: string | null,
  operadorIds: string[]
): Projeto[] {
  return projetos.filter((data) => {
    const dataCriacao = toDate(data.dataCriacao);
    if (dataCriacao < inicioPeriodo) return false;
    if (caminhaoId && data.informacoesOperacao?.caminhao?.id !== caminhaoId) return false;
    if (operadorIds.length > 0 && !data.informacoesOperacao?.equipe?.some((membro) => operadorIds.includes(membro.id))) return false;
    return true;
  });
}

function calcularTotais(projetos: Projeto[]) {
  let totalFogosPeriodo = 0;
  let kgAplicadoPeriodo = 0;
  projetos.forEach((data) => {
    totalFogosPeriodo += 1;
    const kgAplicado = parseFloatPTBR(data.informacoesOperacao?.kgAplicado);
    if (!isNaN(kgAplicado)) kgAplicadoPeriodo += kgAplicado;
  });
  return { totalFogosPeriodo, kgAplicadoPeriodo };
}

function calcularConformidadeDensidade(projetos: Projeto[], faixaDensidade: FaixaDensidade) {
  let somaDensidades = 0;
  let projetosComDensidade = 0;
  let fogosConformesPeriodo = 0;
  let fogosAlertaPeriodo = 0;

  projetos.forEach((data) => {
    const densidadeDoFogo = densidadeMediaDoProjeto(data.amostras ?? []);
    if (densidadeDoFogo !== null) {
      somaDensidades += densidadeDoFogo;
      projetosComDensidade += 1;
    }
    if (data.amostras?.length) {
      if (projetoForaDaFaixa(data.amostras, faixaDensidade)) fogosAlertaPeriodo += 1;
      else fogosConformesPeriodo += 1;
    }
  });

  const densidadeMediaPeriodo = projetosComDensidade > 0 ? somaDensidades / projetosComDensidade : null;
  return { densidadeMediaPeriodo, fogosConformesPeriodo, fogosAlertaPeriodo };
}

function calcularAgrupamentos(projetos: Projeto[], granularidade: GranularidadeGrafico): FogoPorPeriodo[] {
  const agrupamentos = new Map<string, { totalFogos: number; kgAplicado: number }>();

  projetos.forEach((data) => {
    const dataCriacao = toDate(data.dataCriacao);
    const kgAplicado = parseFloatPTBR(data.informacoesOperacao?.kgAplicado);
    const chave = chaveAgrupamento(dataCriacao, granularidade);
    const atual = agrupamentos.get(chave) ?? { totalFogos: 0, kgAplicado: 0 };
    atual.totalFogos += 1;
    if (!isNaN(kgAplicado)) atual.kgAplicado += kgAplicado;
    agrupamentos.set(chave, atual);
  });

  return Array.from(agrupamentos.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([chave, valores]) => ({
      rotulo: new Date(chave).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      totalFogos: valores.totalFogos,
      kgAplicado: Math.round(valores.kgAplicado),
    }));
}

function itensCaminhaoDoProjeto(data: Projeto): RefRanking[] {
  const caminhao = data.informacoesOperacao?.caminhao;
  return caminhao ? [{ id: caminhao.id, label: caminhao.placa }] : [];
}

function itensOperadoresDoProjeto(data: Projeto): RefRanking[] {
  return (data.informacoesOperacao?.equipe ?? []).map((membro) => ({ id: membro.id, label: membro.nome }));
}

function calcularRanking(projetos: Projeto[], extrairRefs: (data: Projeto) => RefRanking[]): RankingItem[] {
  const mapa = new Map<string, RankingItem>();

  projetos.forEach((data) => {
    extrairRefs(data).forEach((ref) => {
      const atual = mapa.get(ref.id) ?? { id: ref.id, label: ref.label, totalFogos: 0 };
      atual.totalFogos += 1;
      mapa.set(ref.id, atual);
    });
  });

  return Array.from(mapa.values())
    .sort((a, b) => b.totalFogos - a.totalFogos)
    .slice(0, LIMITE_RANKING);
}

function calcularLicencas(licencas: License[], agora: Date) {
  let licencasAtivas = 0;
  let licencasExpirando = 0;
  let licencasDisponiveis = 0;

  licencas.forEach((data) => {
    if (data.status === 'active') {
      licencasAtivas += 1;
      if (data.expiresAt) {
        const exp = toDate(data.expiresAt);
        const diasRestantes = (exp.getTime() - agora.getTime()) / MS_DIA;
        if (diasRestantes >= 0 && diasRestantes <= JANELA_EXPIRACAO_LICENCA_DIAS) licencasExpirando += 1;
      }
    }
    if (data.status === 'available') licencasDisponiveis += 1;
  });

  return { licencasAtivas, licencasExpirando, licencasDisponiveis, licencasTotal: licencas.length };
}

function calcularStats(
  projetos: Projeto[],
  licencas: License[],
  diasPeriodo: number,
  faixaDensidade: FaixaDensidade,
  caminhaoId: string | null,
  operadorIds: string[]
): DashboardStats {
  const agora = new Date();
  const inicioPeriodo = new Date(agora.getTime() - diasPeriodo * MS_DIA);
  const granularidadeGrafico = granularidadePara(diasPeriodo);

  const projetosFiltrados = filtrarProjetosDoPeriodo(projetos, inicioPeriodo, caminhaoId, operadorIds);

  const totais = calcularTotais(projetosFiltrados);
  const conformidade = calcularConformidadeDensidade(projetosFiltrados, faixaDensidade);
  const fogosAgrupados = calcularAgrupamentos(projetosFiltrados, granularidadeGrafico);
  const rankingUmb = calcularRanking(projetosFiltrados, itensCaminhaoDoProjeto);
  const rankingOperadores = calcularRanking(projetosFiltrados, itensOperadoresDoProjeto);
  const licencasStats = calcularLicencas(licencas, agora);

  return {
    ...totais,
    ...conformidade,
    ...licencasStats,
    fogosAgrupados,
    granularidadeGrafico,
    rankingUmb,
    rankingOperadores,
  };
}

export function useDashboardStats(
  companyId: string | null,
  diasPeriodo: PeriodoDias,
  caminhaoId: string | null = null,
  operadorIds: string[] = [],
  faixaDensidade: FaixaDensidade = FAIXA_DENSIDADE_PADRAO
) {
  const projetosQuery = useProjetosPeriodo(companyId);
  const licencasQuery = useLicencas(companyId);

  const data = useMemo(() => {
    if (!projetosQuery.data || !licencasQuery.data) return undefined;
    return calcularStats(projetosQuery.data, licencasQuery.data, diasPeriodo, faixaDensidade, caminhaoId, operadorIds);
  }, [projetosQuery.data, licencasQuery.data, diasPeriodo, faixaDensidade, caminhaoId, operadorIds]);

  return {
    data,
    isLoading: projetosQuery.isLoading || licencasQuery.isLoading,
    isError: projetosQuery.isError || licencasQuery.isError,
  };
}
