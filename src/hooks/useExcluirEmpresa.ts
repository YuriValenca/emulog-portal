'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection, deleteDoc, doc, getDocs, limit, query, where,
  type DocumentReference,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useCompanySelection } from '@/stores/useCompanySelection';
import type { Company } from '@/schemas/company';

// TODO: com o Blaze, Cloud Function que apaga a empresa por completo (contas no Auth, fogos, metas, rascunhos, calibragens).

export type BloqueioExclusao = 'founding' | 'tem_fogos' | 'tem_filiais';

export const MENSAGEM_BLOQUEIO: Record<BloqueioExclusao, string> = {
  founding: 'Empresa fundadora não pode ser excluída.',
  tem_fogos: 'A empresa tem fogos registrados. Para tirá-la de uso, desligue o switch "Ativa".',
  tem_filiais: 'A empresa é matriz de outras empresas. Desvincule as filiais antes de excluir.',
};

const COLECOES_DA_EMPRESA = [
  'caminhoes', 'operadores', 'produtos', 'clientes',
  'regras_deteccao', 'vencimentos', 'ocorrencias', 'calibragens',
] as const;

async function existeAlgum(colecao: string, campo: string, valor: string): Promise<boolean> {
  const snap = await getDocs(query(collection(db, colecao), where(campo, '==', valor), limit(1)));
  return !snap.empty;
}

export async function verificarBloqueioExclusao(company: Company): Promise<BloqueioExclusao | null> {
  if (company.founding) return 'founding';

  const [temFogos, temRascunhos, temFiliais] = await Promise.all([
    existeAlgum('projetos', 'companyId', company.id),
    existeAlgum('projetos_rascunho', 'companyId', company.id),
    existeAlgum('companies', 'parentCompanyId', company.id),
  ]);
  if (temFogos || temRascunhos) return 'tem_fogos';
  if (temFiliais) return 'tem_filiais';
  return null;
}

async function refsDaColecao(colecao: string, companyId: string): Promise<DocumentReference[]> {
  const snap = await getDocs(query(collection(db, colecao), where('companyId', '==', companyId)));
  return snap.docs.map((d) => d.ref);
}

// O superadmin pode ter `companyId` da empresa; apagar o doc dele o trancaria fora do portal.
async function refsDeUsuariosComuns(companyId: string): Promise<DocumentReference[]> {
  const snap = await getDocs(query(collection(db, 'users'), where('companyId', '==', companyId)));
  return snap.docs
    .filter((d) => d.data().role !== 'superadmin')
    .map((d) => d.ref);
}

async function refsDaEmpresa(companyId: string): Promise<DocumentReference[]> {
  const grupos = await Promise.all([
    getDocs(collection(db, 'companies', companyId, 'licenses')).then((snap) => snap.docs.map((d) => d.ref)),
    refsDeUsuariosComuns(companyId),
    ...COLECOES_DA_EMPRESA.map((colecao) => refsDaColecao(colecao, companyId)),
  ]);
  return grupos.flat();
}

// A empresa sai primeiro: se a rule recusar, nada mais foi apagado.
async function excluirEmpresa(company: Company): Promise<{ falhas: number }> {
  const bloqueio = await verificarBloqueioExclusao(company);
  if (bloqueio) throw new Error(MENSAGEM_BLOQUEIO[bloqueio]);

  const refs = await refsDaEmpresa(company.id);
  await deleteDoc(doc(db, 'companies', company.id));

  const resultados = await Promise.allSettled(refs.map((ref) => deleteDoc(ref)));
  const falhas = resultados.filter((r) => r.status === 'rejected').length;
  if (falhas > 0) console.error(`[excluirEmpresa] ${falhas} registro(s) de ${company.id} não foram apagados`, resultados);
  return { falhas };
}

export function useExcluirEmpresa() {
  const queryClient = useQueryClient();
  const selectedCompanyId = useCompanySelection((state) => state.selectedCompanyId);
  const setSelectedCompanyId = useCompanySelection((state) => state.setSelectedCompanyId);

  return useMutation({
    mutationFn: excluirEmpresa,
    onSuccess: (_, company) => {
      if (selectedCompanyId === company.id) setSelectedCompanyId(null);
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.removeQueries({ queryKey: ['company', company.id] });
    },
  });
}
