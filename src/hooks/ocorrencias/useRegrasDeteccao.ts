'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addDoc, collection, doc, getDocs,
  query, Timestamp, where, writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { chunk } from '@/lib/chunk';
import { useOcorrenciaRescan } from '@/hooks/ocorrencias/useOcorrenciasAutoScan';
import { regraDeteccaoSchema, type RegraDeteccao, type RegraOperador } from '@/schemas/regraDeteccao';

interface CriarRegraInput {
  companyId: string;
  operador: RegraOperador;
  valor1: number;
  valor2: number | null;
}

interface ExcluirRegraInput {
  regraId: string;
  companyId: string;
  incluirSemRegra: boolean;
}

async function fetchRegras(companyId: string): Promise<RegraDeteccao[]> {
  const snap = await getDocs(query(collection(db, 'regras_deteccao'), where('companyId', '==', companyId)));
  return snap.docs.map((d) => regraDeteccaoSchema.parse({ id: d.id, ...d.data() }));
}

async function resetarVerificacaoDeFogos(companyId: string) {
  const snap = await getDocs(query(collection(db, 'projetos'), where('companyId', '==', companyId)));
  const refsParaResetar = snap.docs.filter((d) => d.data().ocorrenciasVerificadas === true).map((d) => d.ref);
  const lotes = chunk(refsParaResetar, 400);
  await Promise.all(
    lotes.map(async (lote) => {
      const batch = writeBatch(db);
      lote.forEach((ref) => batch.update(ref, { ocorrenciasVerificadas: false }));
      await batch.commit();
    })
  );
}

async function criarRegra(input: CriarRegraInput) {
  await addDoc(collection(db, 'regras_deteccao'), {
    companyId: input.companyId,
    metrica: 'diferenca_kg',
    operador: input.operador,
    valor1: input.valor1,
    valor2: input.valor2,
    criadoEm: Timestamp.now(),
  });
  await resetarVerificacaoDeFogos(input.companyId);
}

/**
 * Ocorrências geradas por UMA regra específica.
 *
 * O Firestore não deixa filtrar por `regraId` no servidor sem um índice composto
 * a mais, então a query traz as automáticas de diferença de Kg da empresa e o
 * recorte por regra é feito aqui.
 *
 * `incluirSemRegra` cobre os documentos gravados antes do campo `regraId` existir:
 * eles só podem ter vindo de uma regra, mas não dá pra saber de qual. Só entram
 * na conta quando esta é a última regra da empresa — aí não sobra dona possível.
 */
async function buscarOcorrenciasDaRegra(companyId: string, regraId: string, incluirSemRegra: boolean) {
  const q = query(
    collection(db, 'ocorrencias'),
    where('companyId', '==', companyId),
    where('tipo', '==', 'diferenca_kg_excedente'),
    where('origem', '==', 'automatica')
  );
  const snap = await getDocs(q);

  return snap.docs.filter((docSnap) => {
    const dona = (docSnap.data().regraId ?? null) as string | null;
    if (dona === regraId) return true;
    return incluirSemRegra && dona === null;
  });
}

interface EscopoRegra {
  companyId: string;
  regraId: string;
  incluirSemRegra: boolean;
}

async function contarOcorrenciasDaRegra(escopo: EscopoRegra): Promise<number> {
  const docs = await buscarOcorrenciasDaRegra(escopo.companyId, escopo.regraId, escopo.incluirSemRegra);
  return docs.length;
}

async function excluirRegraComOcorrencias(input: ExcluirRegraInput) {
  const docs = await buscarOcorrenciasDaRegra(input.companyId, input.regraId, input.incluirSemRegra);
  const batch = writeBatch(db);
  docs.forEach((docSnap) => batch.delete(docSnap.ref));
  batch.delete(doc(db, 'regras_deteccao', input.regraId));
  await batch.commit();
}

export function useRegrasDeteccao(companyId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ['regrasDeteccao', companyId];

  const regrasQuery = useQuery({
    queryKey,
    queryFn: () => fetchRegras(companyId!),
    enabled: !!companyId,
  });

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ['ocorrencias'], refetchType: 'all' });
  };

  const criarMutation = useMutation({
    mutationFn: criarRegra,
    onSuccess: () => {
      invalidar();
      useOcorrenciaRescan.getState().requestRescan();
    },
  });
  const excluirMutation = useMutation({ mutationFn: excluirRegraComOcorrencias, onSuccess: invalidar });

  const regras = regrasQuery.data ?? [];

  const escopoDaRegra = (regraId: string): EscopoRegra => ({
    companyId: companyId!,
    regraId,
    incluirSemRegra: regras.length <= 1,
  });

  return {
    regras,
    isLoading: regrasQuery.isLoading,
    criarRegra: criarMutation.mutateAsync,
    isCriando: criarMutation.isPending,
    contarOcorrenciasDaRegra: (regraId: string) => contarOcorrenciasDaRegra(escopoDaRegra(regraId)),
    excluirRegra: (regraId: string) => excluirMutation.mutateAsync(escopoDaRegra(regraId)),
    isExcluindo: excluirMutation.isPending,
  };
}
