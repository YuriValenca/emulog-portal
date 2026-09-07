'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addDoc, collection, getDocs, query, Timestamp, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useCompanyGroup } from '@/hooks/fogos/useCompanyGroup';
import { fetchLicencas } from '@/hooks/useLicencas';
import type { License } from '@/types';

const JANELA_EXPIRACAO_DIAS = 30;
const MS_DIA = 1000 * 60 * 60 * 24;

interface LicencaOcorrenciaDetectada {
  companyId: string;
  license: License;
  motivo: 'expirando' | 'expirada';
}

function toDate(value: unknown): Date | null {
  const v = value as { toDate?: () => Date; seconds?: number } | null;
  if (!v) return null;
  if (v.toDate) return v.toDate();
  if (v.seconds) return new Date(v.seconds * 1000);
  return null;
}

function detectarOcorrenciasDaEmpresa(companyId: string, licencas: License[]): LicencaOcorrenciaDetectada[] {
  const agora = new Date();
  const detectadas: LicencaOcorrenciaDetectada[] = [];

  licencas.forEach((license) => {
    if (license.status !== 'active' || !license.expiresAt) return;
    const exp = toDate(license.expiresAt);
    if (!exp) return;
    const diasRestantes = (exp.getTime() - agora.getTime()) / MS_DIA;
    if (diasRestantes < 0) {
      detectadas.push({ companyId, license, motivo: 'expirada' });
    } else if (diasRestantes <= JANELA_EXPIRACAO_DIAS) {
      detectadas.push({ companyId, license, motivo: 'expirando' });
    }
  });

  return detectadas;
}

async function existeOcorrenciaAberta(companyId: string, licenseId: string): Promise<boolean> {
  const q = query(
    collection(db, 'ocorrencias'),
    where('companyId', '==', companyId),
    where('licenseId', '==', licenseId),
    where('status', 'in', ['aberta', 'em_acompanhamento'])
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

async function registrarOcorrenciaLicenca(detectada: LicencaOcorrenciaDetectada) {
  const jaExiste = await existeOcorrenciaAberta(detectada.companyId, detectada.license.id);
  if (jaExiste) return;

  const titulo = detectada.motivo === 'expirada'
    ? `Licença expirada — ${detectada.license.key}`
    : `Licença expirando — ${detectada.license.key}`;

  await addDoc(collection(db, 'ocorrencias'), {
    companyId: detectada.companyId,
    projetoId: null,
    licenseId: detectada.license.id,
    tipo: 'outro',
    tituloManual: titulo,
    origem: 'automatica',
    status: 'aberta',
    descricao: detectada.motivo === 'expirada'
      ? 'A licença expirou e precisa ser renovada.'
      : `A licença expira em até ${JANELA_EXPIRACAO_DIAS} dias.`,
    valorReferencia: null,
    responsavelUid: null,
    criadoEm: Timestamp.now(),
  });
}

async function scanLicencasDoGrupo(companyIds: string[]): Promise<number> {
  const licencasPorEmpresa = await Promise.all(
    companyIds.map(async (companyId) => ({
      companyId,
      licencas: await fetchLicencas(companyId),
    }))
  );

  const detectadas = licencasPorEmpresa.flatMap(({ companyId, licencas }) =>
    detectarOcorrenciasDaEmpresa(companyId, licencas)
  );

  await Promise.all(detectadas.map(registrarOcorrenciaLicenca));

  return detectadas.length;
}

export function useLicencaOcorrenciasScan(companyId: string | null) {
  const { companyIds } = useCompanyGroup(companyId);
  const queryClient = useQueryClient();

  const scanMutation = useMutation({
    mutationFn: () => scanLicencasDoGrupo(companyIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ocorrencias'] });
    },
  });

  return {
    scanLicencas: scanMutation.mutateAsync,
    isScanning: scanMutation.isPending,
    companyIds,
  };
}
