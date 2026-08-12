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
}

const MS_DIA = 1000 * 60 * 60 * 24;
const JANELA_EXPIRACAO_LICENCA_DIAS = 30;
const DIAS_LIMITE_AGRUPAMENTO_DIARIO = 31;

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

  let totalFogosPeriodo = 0;
  let kgAplicadoPeriodo = 0;
  let somaDensidadesPeriodo = 0;
  let projetosComDensidadePeriodo = 0;
  let fogosConformesPeriodo = 0;
  let fogosAlertaPeriodo = 0;
  const agrupamentos = new Map<string, { totalFogos: number; kgAplicado: number }>();

  projetos.forEach((data) => {
    const dataCriacao = toDate(data.dataCriacao);
    if (dataCriacao < inicioPeriodo) return;
    if (caminhaoId && data.informacoesOperacao?.caminhao?.id !== caminhaoId) return;
    if (operadorIds.length > 0 && !data.informacoesOperacao?.equipe?.some((membro) => operadorIds.includes(membro.id))) return;

    totalFogosPeriodo += 1;
    const kgAplicado = parseFloatPTBR(data.informacoesOperacao?.kgAplicado);
    if (!isNaN(kgAplicado)) kgAplicadoPeriodo += kgAplicado;

    const densidadeDoFogo = densidadeMediaDoProjeto(data.amostras ?? []);
    if (densidadeDoFogo !== null) {
      somaDensidadesPeriodo += densidadeDoFogo;
      projetosComDensidadePeriodo += 1;
    }
    if (data.amostras?.length) {
      if (projetoForaDaFaixa(data.amostras, faixaDensidade)) {
        fogosAlertaPeriodo += 1;
      } else {
        fogosConformesPeriodo += 1;
      }
    }

    const chave = chaveAgrupamento(dataCriacao, granularidadeGrafico);
    const atual = agrupamentos.get(chave) ?? { totalFogos: 0, kgAplicado: 0 };
    atual.totalFogos += 1;
    if (!isNaN(kgAplicado)) atual.kgAplicado += kgAplicado;
    agrupamentos.set(chave, atual);
  });

  const densidadeMediaPeriodo =
    projetosComDensidadePeriodo > 0 ? somaDensidadesPeriodo / projetosComDensidadePeriodo : null;

  const fogosAgrupados = Array.from(agrupamentos.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([chave, valores]) => ({
      rotulo: new Date(chave).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      totalFogos: valores.totalFogos,
      kgAplicado: Math.round(valores.kgAplicado),
    }));

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

  return {
    totalFogosPeriodo,
    kgAplicadoPeriodo,
    densidadeMediaPeriodo,
    fogosConformesPeriodo,
    fogosAlertaPeriodo,
    licencasAtivas,
    licencasExpirando,
    licencasDisponiveis,
    licencasTotal: licencas.length,
    fogosAgrupados,
    granularidadeGrafico,
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
