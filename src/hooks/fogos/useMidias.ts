'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  collection, deleteDoc, doc, getCountFromServer, getDocs, query, setDoc, Timestamp, where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { midiaSchema, type Midia } from '@/schemas/midia';

// O limite é do app; as rules não controlam
export const LIMITE_FOTOS_POR_FOGO = 10;

const colecaoMidias = (projetoId: string) => collection(db, 'projetos', projetoId, 'midias');

// A rule de leitura é escopada por empresa: sem o filtro de `companyId` a consulta inteira é negada
const consultaMidias = (projetoId: string, companyId: string) =>
  query(colecaoMidias(projetoId), where('companyId', '==', companyId));

export const urlDaMidia = (midia: Midia) => midia.imagem;

async function buscarMidias(projetoId: string, companyId: string): Promise<Midia[]> {
  const snap = await getDocs(consultaMidias(projetoId, companyId));
  const midias: Midia[] = [];
  for (const docSnap of snap.docs) {
    const parsed = midiaSchema.safeParse({ id: docSnap.id, ...docSnap.data() });
    if (parsed.success) midias.push(parsed.data);
    else console.error('[useMidias] foto com formato inválido:', docSnap.id, parsed.error.flatten());
  }
  return midias.sort((a, b) => a.criadoEm.toMillis() - b.criadoEm.toMillis());
}

export function useMidiasDoProjeto(projetoId: string | null, companyId: string | null) {
  const midiasQuery = useQuery({
    queryKey: ['midias', projetoId],
    queryFn: () => buscarMidias(projetoId!, companyId!),
    enabled: !!projetoId && !!companyId,
  });

  return {
    midias: midiasQuery.data ?? [],
    isLoading: midiasQuery.isLoading,
    isError: midiasQuery.isError,
    recarregar: midiasQuery.refetch,
  };
}

export interface GravarFotosInput {
  projetoId: string;
  // Empresa dona do projeto, não a de quem envia: o superadmin envia em qualquer empresa
  companyId: string;
  enviadoPor: string;
  imagens: string[];
}

// Uma por vez para o `criadoEm` seguir a ordem em que as fotos foram escolhidas
export async function gravarFotos({ projetoId, companyId, enviadoPor, imagens }: GravarFotosInput) {
  for (const imagem of imagens) {
    await setDoc(doc(colecaoMidias(projetoId)), {
      companyId,
      projetoId,
      enviadoPor,
      criadoEm: Timestamp.now(),
      imagem,
    });
  }
}

function useInvalidarFotos() {
  const queryClient = useQueryClient();
  return (projetoId: string) => {
    queryClient.invalidateQueries({ queryKey: ['midias', projetoId] });
    queryClient.invalidateQueries({ queryKey: ['contagemMidias'] });
  };
}

export function useEnviarFotos() {
  const invalidar = useInvalidarFotos();
  const mutation = useMutation({
    mutationFn: gravarFotos,
    // Também em falha: as fotos gravadas antes do erro já estão no banco
    onSettled: (_dados, _erro, input) => invalidar(input.projetoId),
  });
  return { enviarFotos: mutation.mutateAsync, isEnviando: mutation.isPending };
}

export function useApagarFoto() {
  const invalidar = useInvalidarFotos();
  const mutation = useMutation({
    mutationFn: ({ projetoId, midiaId }: { projetoId: string; midiaId: string }) =>
      deleteDoc(doc(colecaoMidias(projetoId), midiaId)),
    onSuccess: (_dados, input) => invalidar(input.projetoId),
  });
  return { apagarFoto: mutation.mutateAsync, isApagando: mutation.isPending };
}

async function contarFotos(fogos: { id: string; companyId: string }[]): Promise<Map<string, number>> {
  const contagens = await Promise.all(
    fogos.map(async ({ id, companyId }) => {
      const snap = await getCountFromServer(consultaMidias(id, companyId));
      return [id, snap.data().count] as const;
    })
  );
  return new Map(contagens);
}

export function useContagemFotos(fogos: { id: string; companyId: string }[]) {
  const contagemQuery = useQuery({
    queryKey: ['contagemMidias', fogos.map((fogo) => fogo.id)],
    queryFn: () => contarFotos(fogos),
    enabled: fogos.length > 0,
  });
  return contagemQuery.data ?? new Map<string, number>();
}
