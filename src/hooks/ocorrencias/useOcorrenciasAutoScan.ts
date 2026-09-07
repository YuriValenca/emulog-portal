'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  doc, setDoc, getDoc, updateDoc, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useProjetosPeriodo } from '@/hooks/useProjetosPeriodo';
import { useProdutos } from '@/hooks/cadastro/useProdutos';
import { useRegrasDeteccao } from '@/hooks/ocorrencias/useRegrasDeteccao';
import { useCompanyGroup } from '@/hooks/fogos/useCompanyGroup';
import { useToast } from '@/components/ui/Toast/Toast';
import { detectarOcorrenciasDoProjeto } from '@/lib/deteccaoOcorrencia';
import { fetchLicencas } from '@/hooks/useLicencas';
import type { License } from '@/types';

const JANELA_EXPIRACAO_DIAS = 30;
const MS_DIA = 1000 * 60 * 60 * 24;

interface ScanState {
  isScanning: boolean;
  total: number;
  processados: number;
}

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

function detectarOcorrenciasDaLicenca(companyId: string, licencas: License[]): LicencaOcorrenciaDetectada[] {
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

async function registrarOcorrenciaLicenca(detectada: LicencaOcorrenciaDetectada) {
  const titulo = detectada.motivo === 'expirada'
    ? `Licença expirada — ${detectada.license.key}`
    : `Licença expirando — ${detectada.license.key}`;

  const descricao = detectada.motivo === 'expirada'
    ? 'A licença expirou e precisa ser renovada.'
    : `A licença expira em até ${JANELA_EXPIRACAO_DIAS} dias.`;

  const ref = doc(db, 'ocorrencias', `${detectada.license.id}_licenca`);
  const snap = await getDoc(ref);

  const payload: Record<string, unknown> = {
    companyId: detectada.companyId,
    projetoId: null,
    licenseId: detectada.license.id,
    tipo: 'licenca',
    tituloManual: titulo,
    origem: 'automatica',
    descricao,
    valorReferencia: null,
    responsavelUid: null,
    motivo: detectada.motivo,
  };

  if (!snap.exists()) {
    payload.status = 'aberta';
    payload.criadoEm = Timestamp.now();
  } else {
    const motivoAnterior = snap.data()?.motivo;
    if (motivoAnterior === 'expirando' && detectada.motivo === 'expirada') {
      payload.status = 'aberta';
    }
  }

  await setDoc(ref, payload, { merge: true });
}

export function useOcorrenciasAutoScan(companyId: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: projetos } = useProjetosPeriodo(companyId);
  const { produtos } = useProdutos(companyId);
  const { regras } = useRegrasDeteccao(companyId);
  const { companyIds } = useCompanyGroup(companyId);

  const [scanState, setScanState] = useState<ScanState>({ isScanning: false, total: 0, processados: 0 });
  const jaRodouRef = useRef(false);

  useEffect(() => {
    jaRodouRef.current = false;
    setScanState({ isScanning: false, total: 0, processados: 0 });
  }, [companyId]);

  useEffect(() => {
    if (!companyId || !projetos || jaRodouRef.current) return;

    jaRodouRef.current = true;
    const pendentesFogos = projetos.filter((p) => !p.ocorrenciasVerificadas);
    const produtosById = new Map(produtos.map((p) => [p.id, p]));

    const rodarScan = async () => {
      const licencasPorEmpresa = await Promise.all(
        companyIds.map(async (id) => ({ companyId: id, licencas: await fetchLicencas(id) }))
      );
      const licencasDetectadas = licencasPorEmpresa.flatMap(({ companyId: id, licencas }) =>
        detectarOcorrenciasDaLicenca(id, licencas)
      );

      const totalGeral = pendentesFogos.length + licencasDetectadas.length;
      if (totalGeral === 0) return;

      setScanState({ isScanning: true, total: totalGeral, processados: 0 });
      toast({ title: 'Verificando pendências', description: `${totalGeral} item(ns) sendo analisados` });

      let processados = 0;

      for (const projeto of pendentesFogos) {
        const detectadas = detectarOcorrenciasDoProjeto(projeto, produtosById, regras);

        await Promise.all(
          detectadas.map((d) =>
            setDoc(doc(db, 'ocorrencias', `${projeto.id}_${d.tipo}`), {
              companyId,
              projetoId: projeto.id,
              tipo: d.tipo,
              origem: 'automatica',
              status: 'aberta',
              descricao: d.descricao,
              valorReferencia: d.valorReferencia,
              responsavelUid: null,
              criadoEm: Timestamp.now(),
            })
          )
        );

        await updateDoc(doc(db, 'projetos', projeto.id), { ocorrenciasVerificadas: true });
        processados += 1;
        setScanState({ isScanning: true, total: totalGeral, processados });
      }

      for (const detectada of licencasDetectadas) {
        await registrarOcorrenciaLicenca(detectada);
        processados += 1;
        setScanState({ isScanning: true, total: totalGeral, processados });
      }

      setScanState({ isScanning: false, total: totalGeral, processados: totalGeral });
      queryClient.invalidateQueries({ queryKey: ['ocorrencias'] });
      queryClient.invalidateQueries({ queryKey: ['projetosPeriodo', companyId] });
      toast({ title: 'Verificação concluída', description: 'As ocorrências detectadas já estão disponíveis.' });
    };

    rodarScan();
  }, [companyId, projetos, produtos, regras, companyIds, queryClient, toast]);

  return scanState;
}
