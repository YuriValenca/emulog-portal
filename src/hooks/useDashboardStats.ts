'use client';

import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { densidadeMediaDoProjeto, projetoForaDaFaixa, FAIXA_DENSIDADE_PADRAO, type FaixaDensidade } from '@/lib/densidade';
import { parseFloatPTBR } from '@/helpers/parseNumbers';
import type { License, Projeto } from '@/types';

export interface FogoPorSemana {
  semana: string;
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
  fogosPorSemana: FogoPorSemana[];
}

const MS_DIA = 1000 * 60 * 60 * 24;
const JANELA_EXPIRACAO_LICENCA_DIAS = 30;
const DIAS_MINIMOS_PARA_GRAFICO_SEMANAL = 56; // 8 semanas

function toDate(value: unknown): Date {
  const v = value as { toDate?: () => Date; seconds?: number };
  if (v?.toDate) return v.toDate();
  if (v?.seconds) return new Date(v.seconds * 1000);
  return new Date(value as string);
}

async function fetchDashboardStats(
  companyId: string,
  diasPeriodo: number,
  faixaDensidade: FaixaDensidade
): Promise<DashboardStats> {
  const agora = new Date();
  const diasHistoricoGrafico = Math.max(diasPeriodo, DIAS_MINIMOS_PARA_GRAFICO_SEMANAL);
  const inicioPeriodo = new Date(agora.getTime() - diasPeriodo * MS_DIA);
  const inicioHistoricoGrafico = new Date(agora.getTime() - diasHistoricoGrafico * MS_DIA);

  const projetosQuery = query(
    collection(db, 'projetos'),
    where('companyId', '==', companyId),
    where('dataCriacao', '>=', Timestamp.fromDate(inicioHistoricoGrafico))
  );
  const licencasQuery = collection(db, 'companies', companyId, 'licenses');

  const [projetosSnap, licencasSnap] = await Promise.all([
    getDocs(projetosQuery),
    getDocs(licencasQuery),
  ]);

  let totalFogosPeriodo = 0;
  let kgAplicadoPeriodo = 0;
  let somaDensidadesPeriodo = 0;
  let projetosComDensidadePeriodo = 0;
  let fogosConformesPeriodo = 0;
  let fogosAlertaPeriodo = 0;
  const semanas = new Map<string, { totalFogos: number; kgAplicado: number }>();

  projetosSnap.docs.forEach((docSnap) => {
    const data = docSnap.data() as Projeto;
    const dataCriacao = toDate(data.dataCriacao);

    if (dataCriacao >= inicioPeriodo) {
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
    }

    const inicioSemana = new Date(dataCriacao);
    inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
    const chave = inicioSemana.toISOString().slice(0, 10);
    const kgAplicadoSemana = parseFloatPTBR(data.informacoesOperacao?.kgAplicado);
    const atual = semanas.get(chave) ?? { totalFogos: 0, kgAplicado: 0 };
    atual.totalFogos += 1;
    if (!isNaN(kgAplicadoSemana)) atual.kgAplicado += kgAplicadoSemana;
    semanas.set(chave, atual);
  });

  const densidadeMediaPeriodo =
    projetosComDensidadePeriodo > 0 ? somaDensidadesPeriodo / projetosComDensidadePeriodo : null;

  const fogosPorSemana = Array.from(semanas.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([semana, valores]) => ({
      semana: new Date(semana).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      totalFogos: valores.totalFogos,
      kgAplicado: Math.round(valores.kgAplicado),
    }));

  let licencasAtivas = 0;
  let licencasExpirando = 0;
  let licencasDisponiveis = 0;

  licencasSnap.docs.forEach((docSnap) => {
    const data = docSnap.data() as License;

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
    licencasTotal: licencasSnap.size,
    fogosPorSemana,
  };
}

export function useDashboardStats(
  companyId: string | null,
  diasPeriodo = 30,
  faixaDensidade: FaixaDensidade = FAIXA_DENSIDADE_PADRAO
) {
  return useQuery({
    queryKey: ['dashboardStats', companyId, diasPeriodo, faixaDensidade],
    queryFn: () => fetchDashboardStats(companyId as string, diasPeriodo, faixaDensidade),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
