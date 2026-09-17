'use client';

import { useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import { useQueryClient } from '@tanstack/react-query';
import {
  collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { chunk } from '@/lib/chunk';
import { fetchCompanyGroup } from '@/hooks/fogos/useCompanyGroup';
import { produtoSchema, type Produto } from '@/schemas/produto';
import { regraDeteccaoSchema, type RegraDeteccao } from '@/schemas/regraDeteccao';
import { useToast } from '@/components/ui/Toast/Toast';
import { detectarOcorrenciasDoProjeto, type OcorrenciaDetectada } from '@/lib/deteccaoOcorrencia';
import { fetchLicencas } from '@/hooks/useLicencas';
import { statusExpiracaoLicenca, JANELA_EXPIRACAO_LICENCA_DIAS } from '@/lib/licenca';
import type { License, Projeto } from '@/types';

 const RETENCAO_OCORRENCIA_ENCERRADA_MS = 60 * 1000;
// produção: usar 3 * 24 * 60 * 60 * 1000

interface OcorrenciaRescanState {
  nonce: number;
  requestRescan: () => void;
}

export const useOcorrenciaRescan = create<OcorrenciaRescanState>((set) => ({
  nonce: 0,
  requestRescan: () => set((state) => ({ nonce: state.nonce + 1 })),
}));

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

async function fetchProjetosDireto(companyId: string): Promise<Projeto[]> {
  const snap = await getDocs(query(collection(db, 'projetos'), where('companyId', '==', companyId)));
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as Projeto);
}

async function fetchProdutosDireto(companyId: string): Promise<Produto[]> {
  const snap = await getDocs(query(collection(db, 'produtos'), where('companyId', '==', companyId)));
  return snap.docs.map((d) => produtoSchema.parse({ id: d.id, ...d.data() }));
}

async function fetchRegrasDireto(companyId: string): Promise<RegraDeteccao[]> {
  const snap = await getDocs(query(collection(db, 'regras_deteccao'), where('companyId', '==', companyId)));
  return snap.docs.map((d) => regraDeteccaoSchema.parse({ id: d.id, ...d.data() }));
}

function detectarOcorrenciasDaLicenca(companyId: string, licencas: License[]): LicencaOcorrenciaDetectada[] {
  const agora = new Date();
  const detectadas: LicencaOcorrenciaDetectada[] = [];

  licencas.forEach((license) => {
    const status = statusExpiracaoLicenca(license, agora);
    if (status) detectadas.push({ companyId, license, motivo: status });
  });

  return detectadas;
}

async function registrarOcorrenciaLicenca(detectada: LicencaOcorrenciaDetectada) {
  const ref = doc(db, 'ocorrencias', `${detectada.license.id}_licenca`);

  let existe = false;
  let motivoAnterior: string | undefined;
  try {
    const snap = await getDoc(ref);
    existe = snap.exists();
    motivoAnterior = snap.data()?.motivo;
  } catch (erro) {
    console.error('[autoScan] falha ao checar existência da ocorrência de licença', { refPath: ref.path, erro });
    return;
  }

  const titulo = detectada.motivo === 'expirada'
    ? `Licença expirada — ${detectada.license.key}`
    : `Licença expirando — ${detectada.license.key}`;

  const descricao = detectada.motivo === 'expirada'
    ? 'A licença expirou e precisa ser renovada.'
    : `A licença expira em até ${JANELA_EXPIRACAO_LICENCA_DIAS} dias.`;

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

  if (!existe) {
    payload.status = 'aberta';
    payload.criadoEm = Timestamp.now();
    payload.encerradoEm = null;
  } else if (motivoAnterior === 'expirando' && detectada.motivo === 'expirada') {
    payload.status = 'aberta';
    payload.encerradoEm = null;
  }

  try {
    await setDoc(ref, payload, { merge: true });
  } catch (erro) {
    console.error('[autoScan] falha ao gravar ocorrência de licença', { refPath: ref.path, existiaAntes: existe, payload, erro });
  }
}

async function registrarOcorrenciaFogo(companyId: string, projetoId: string, detectada: OcorrenciaDetectada) {
  const ref = doc(db, 'ocorrencias', `${projetoId}_${detectada.tipo}`);

  let existe = false;
  try {
    const snap = await getDoc(ref);
    existe = snap.exists();
  } catch (erro) {
    console.error('[autoScan] falha ao checar existência da ocorrência de fogo', { refPath: ref.path, erro });
    return;
  }

  const payload: Record<string, unknown> = {
    companyId,
    projetoId,
    tipo: detectada.tipo,
    origem: 'automatica',
    descricao: detectada.descricao,
    valorReferencia: detectada.valorReferencia,
    responsavelUid: null,
  };

  if (!existe) {
    payload.status = 'aberta';
    payload.criadoEm = Timestamp.now();
    payload.encerradoEm = null;
  }

  try {
    await setDoc(ref, payload, { merge: true });
  } catch (erro) {
    console.error('[autoScan] falha ao gravar ocorrência de fogo', { refPath: ref.path, existiaAntes: existe, payload, erro });
  }
}

async function buscarOcorrenciasEncerradasExpiradas(companyIds: string[]) {
  const idChunks = chunk(companyIds, 30);
  const docs = (
    await Promise.all(
      idChunks.map(async (ids) => {
        const q = query(
          collection(db, 'ocorrencias'),
          where('companyId', 'in', ids),
          where('status', '==', 'encerrada')
        );
        const snap = await getDocs(q);
        return snap.docs;
      })
    )
  ).flat();

  const agora = Date.now();
  return docs.filter((docSnap) => {
    const encerradoEm = docSnap.data().encerradoEm;
    if (!encerradoEm?.toMillis) return false;
    return agora - encerradoEm.toMillis() >= RETENCAO_OCORRENCIA_ENCERRADA_MS;
  });
}

export function useOcorrenciasAutoScan(companyId: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const rescanNonce = useOcorrenciaRescan((state) => state.nonce);

  const [scanState, setScanState] = useState<ScanState>({ isScanning: false, total: 0, processados: 0 });
  const jaRodouRef = useRef<string | null>(null);

  useEffect(() => {
    if (!companyId) return;

    const chaveExecucao = `${companyId}:${rescanNonce}`;
    if (jaRodouRef.current === chaveExecucao) return;
    jaRodouRef.current = chaveExecucao;

    setScanState({ isScanning: false, total: 0, processados: 0 });

    const rodarScan = async () => {
      let companyIds: string[] = [companyId];
      try {
        companyIds = await fetchCompanyGroup(companyId);
      } catch (erro) {
        console.error('[autoScan] falha ao buscar grupo de empresas', { companyId, erro });
      }

      const [projetos, produtos, regras] = await Promise.all([
        fetchProjetosDireto(companyId),
        fetchProdutosDireto(companyId),
        fetchRegrasDireto(companyId),
      ]);

      const produtosById = new Map(produtos.map((p) => [p.id, p]));
      const pendentesFogos = projetos.filter((p) => !p.ocorrenciasVerificadas);

      let licencasDetectadas: LicencaOcorrenciaDetectada[] = [];
      try {
        const licencasPorEmpresa = await Promise.all(
          companyIds.map(async (id) => ({ companyId: id, licencas: await fetchLicencas(id) }))
        );
        licencasDetectadas = licencasPorEmpresa.flatMap(({ companyId: id, licencas }) =>
          detectarOcorrenciasDaLicenca(id, licencas)
        );
      } catch (erro) {
        console.error('[autoScan] falha ao buscar licenças do grupo', { companyIds, erro });
      }

      let ocorrenciasParaApagar: Awaited<ReturnType<typeof buscarOcorrenciasEncerradasExpiradas>> = [];
      try {
        ocorrenciasParaApagar = await buscarOcorrenciasEncerradasExpiradas(companyIds);
      } catch (erro) {
        console.error('[autoScan] falha ao buscar ocorrências encerradas expiradas', { companyIds, erro });
      }

      const totalGeral = pendentesFogos.length + licencasDetectadas.length + ocorrenciasParaApagar.length;
      if (totalGeral === 0) return;

      setScanState({ isScanning: true, total: totalGeral, processados: 0 });
      toast({ title: 'Verificando pendências', description: `${totalGeral} item(ns) sendo analisados` });

      let processados = 0;

      for (const projeto of pendentesFogos) {
        const detectadas = detectarOcorrenciasDoProjeto(projeto, produtosById, regras);

        await Promise.all(
          detectadas.map((d) => registrarOcorrenciaFogo(companyId, projeto.id, d))
        );

        try {
          await updateDoc(doc(db, 'projetos', projeto.id), { ocorrenciasVerificadas: true });
        } catch (erro) {
          console.error('[autoScan] falha ao marcar projeto como verificado', { projetoId: projeto.id, erro });
        }

        processados += 1;
        setScanState({ isScanning: true, total: totalGeral, processados });
      }

      for (const detectada of licencasDetectadas) {
        await registrarOcorrenciaLicenca(detectada);
        processados += 1;
        setScanState({ isScanning: true, total: totalGeral, processados });
      }

      for (const docSnap of ocorrenciasParaApagar) {
        try {
          await deleteDoc(docSnap.ref);
        } catch (erro) {
          console.error('[autoScan] falha ao apagar ocorrência encerrada expirada', { refPath: docSnap.ref.path, erro });
        }
        processados += 1;
        setScanState({ isScanning: true, total: totalGeral, processados });
      }

      setScanState({ isScanning: false, total: totalGeral, processados: totalGeral });
      queryClient.invalidateQueries({ queryKey: ['ocorrencias'] });
      toast({ title: 'Verificação concluída', description: 'As ocorrências detectadas já estão disponíveis.' });
    };

    rodarScan();
  }, [companyId, rescanNonce, queryClient, toast]);

  return scanState;
}
