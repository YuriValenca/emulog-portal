'use client';

import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { License } from '@/types';

export interface FogoPorSemana {
  semana: string;
  total: number;
}

export interface DashboardStats {
  fogosUltimos30Dias: number;
  kgAplicadoUltimos30Dias: number;
  licencasAtivas: number;
  licencasExpirando: number;
  licencasDisponiveis: number;
  licencasTotal: number;
  fogosPorSemana: FogoPorSemana[];
}

const MS_DIA = 1000 * 60 * 60 * 24;

function toDate(value: unknown): Date {
  const v = value as { toDate?: () => Date; seconds?: number };
  if (v?.toDate) return v.toDate();
  if (v?.seconds) return new Date(v.seconds * 1000);
  return new Date(value as string);
}

async function fetchDashboardStats(companyId: string): Promise<DashboardStats> {
  const agora = new Date();
  const limite30Dias = new Date(agora.getTime() - 30 * MS_DIA);
  const limite8Semanas = new Date(agora.getTime() - 56 * MS_DIA);

  const projetosQuery = query(collection(db, 'projetos'), where('companyId', '==', companyId));
  const licencasQuery = collection(db, 'companies', companyId, 'licenses');

  const [projetosSnap, licencasSnap] = await Promise.all([
    getDocs(projetosQuery),
    getDocs(licencasQuery),
  ]);

  let fogosUltimos30Dias = 0;
  let kgAplicadoUltimos30Dias = 0;
  const semanas = new Map<string, number>();

  projetosSnap.docs.forEach((docSnap) => {
    const data = docSnap.data();
    const dataCriacao = toDate(data.dataCriacao);

    if (dataCriacao >= limite30Dias) {
      fogosUltimos30Dias += 1;
      const kgAplicado = parseFloat(data.informacoesOperacao?.kgAplicado);
      if (!isNaN(kgAplicado)) kgAplicadoUltimos30Dias += kgAplicado;
    }

    if (dataCriacao >= limite8Semanas) {
      const inicioSemana = new Date(dataCriacao);
      inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
      const chave = inicioSemana.toISOString().slice(0, 10);
      semanas.set(chave, (semanas.get(chave) ?? 0) + 1);
    }
  });

  const fogosPorSemana = Array.from(semanas.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([semana, total]) => ({
      semana: new Date(semana).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      total,
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
        if (diasRestantes >= 0 && diasRestantes <= 30) licencasExpirando += 1;
      }
    }

    if (data.status === 'available') licencasDisponiveis += 1;
  });

  return {
    fogosUltimos30Dias,
    kgAplicadoUltimos30Dias,
    licencasAtivas,
    licencasExpirando,
    licencasDisponiveis,
    licencasTotal: licencasSnap.size,
    fogosPorSemana,
  };
}

export function useDashboardStats(companyId: string | null) {
  return useQuery({
    queryKey: ['dashboardStats', companyId],
    queryFn: () => fetchDashboardStats(companyId as string),
    enabled: !!companyId,
  });
}
