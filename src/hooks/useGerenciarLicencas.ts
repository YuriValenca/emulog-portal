'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, Timestamp, writeBatch, type WriteBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { chunk } from '@/lib/chunk';
import { gerarChaveDeLicenca, type ValidadeLicenca } from '@/lib/licenca';

export const LIMITE_LICENCAS_POR_LOTE = 100;

/** Quantos documentos por `writeBatch` (o limite do Firestore é 500). */
const TAMANHO_LOTE_ESCRITA = 400;

interface GerarLoteInput {
  quantidade: number;
  validade: ValidadeLicenca;
}

interface RenovarInput {
  licenseIds: string[];
  validade: ValidadeLicenca;
}

const refLicencas = (companyId: string) => collection(db, 'companies', companyId, 'licenses');
const refLicenca = (companyId: string, licenseId: string) => doc(db, 'companies', companyId, 'licenses', licenseId);

async function gravarEmLotes(ids: string[], escrever: (batch: WriteBatch, id: string) => void) {
  for (const lote of chunk(ids, TAMANHO_LOTE_ESCRITA)) {
    const batch = writeBatch(db);
    lote.forEach((id) => escrever(batch, id));
    await batch.commit();
  }
}

async function gerarLote(companyId: string, { quantidade, validade }: GerarLoteInput) {
  const batch = writeBatch(db);
  const criadoEm = Timestamp.now();
  for (let i = 0; i < quantidade; i += 1) {
    batch.set(doc(refLicencas(companyId)), {
      key: gerarChaveDeLicenca(),
      status: 'available',
      createdAt: criadoEm,
      expiresAt: null,
      validityMonths: validade,
      deviceId: null,
    });
  }
  await batch.commit();
}

// Igual ao app: volta a `available` e o novo prazo conta da próxima ativação.
const renovar = (companyId: string, { licenseIds, validade }: RenovarInput) =>
  gravarEmLotes(licenseIds, (batch, id) =>
    batch.update(refLicenca(companyId, id), { status: 'available', expiresAt: null, validityMonths: validade, deviceId: null })
  );

const revogar = (companyId: string, licenseIds: string[]) =>
  gravarEmLotes(licenseIds, (batch, id) => batch.update(refLicenca(companyId, id), { status: 'revoked' }));

const excluir = (companyId: string, licenseIds: string[]) =>
  gravarEmLotes(licenseIds, (batch, id) => batch.delete(refLicenca(companyId, id)));

export function useGerenciarLicencas(companyId: string) {
  const queryClient = useQueryClient();
  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['licencas', companyId] });

  const gerarMutation = useMutation({ mutationFn: (input: GerarLoteInput) => gerarLote(companyId, input), onSuccess: invalidar });
  const renovarMutation = useMutation({ mutationFn: (input: RenovarInput) => renovar(companyId, input), onSuccess: invalidar });
  const revogarMutation = useMutation({ mutationFn: (ids: string[]) => revogar(companyId, ids), onSuccess: invalidar });
  const excluirMutation = useMutation({ mutationFn: (ids: string[]) => excluir(companyId, ids), onSuccess: invalidar });

  return {
    gerarLote: gerarMutation.mutateAsync,
    isGerando: gerarMutation.isPending,
    renovar: renovarMutation.mutateAsync,
    isRenovando: renovarMutation.isPending,
    revogar: revogarMutation.mutateAsync,
    excluir: excluirMutation.mutateAsync,
    isAlterando: revogarMutation.isPending || excluirMutation.isPending,
  };
}
