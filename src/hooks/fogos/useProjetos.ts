'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  collection, doc, getDoc, getDocs,
  orderBy, query, Timestamp, where, writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { projetoSchema, projetoMetaSchema, type Furos, type Projeto, type ProjetoMeta } from '@/schemas/projeto';
import { chunk } from '@/lib/chunk';
import { useOcorrenciaRescan } from '@/hooks/ocorrencias/useOcorrenciasAutoScan';
import { gravarFotos } from './useMidias';

export const PAGE_SIZE_OPTIONS = [15, 25, 50] as const;
export const DEFAULT_PAGE_SIZE = 25;

interface ProjetosFiltros {
  busca?: string;
  dataInicio?: Date;
  dataFim?: Date;
  produtoIds?: string[];
  caminhaoIds?: string[];
  page?: number;
  pageSize?: number;
}

interface MetaResult {
  items: ProjetoMeta[];
}

function passaFiltros(item: ProjetoMeta, filtros: Pick<ProjetosFiltros, 'busca' | 'dataInicio' | 'dataFim'>) {
  const busca = filtros.busca ?? '';
  const passaBusca = busca ? item.nomeProjeto?.toLowerCase().includes(busca.toLowerCase()) : true;
  const data = item.dataCriacao.toDate();
  const passaInicio = filtros.dataInicio ? data >= filtros.dataInicio : true;
  const passaFim = filtros.dataFim ? data <= filtros.dataFim : true;
  return passaBusca && passaInicio && passaFim;
}

async function fetchMetaFull(companyIds: string[], filtros: Pick<ProjetosFiltros, 'busca' | 'dataInicio' | 'dataFim'>): Promise<MetaResult> {
  const idChunks = chunk(companyIds, 30);
  const results = await Promise.all(
    idChunks.map(async (ids) => {
      const q = query(
        collection(db, 'projetos_meta'),
        where('companyId', 'in', ids),
        orderBy('dataCriacao', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => projetoMetaSchema.parse({ id: d.id, ...d.data() }));
    })
  );

  const mesclada = results
    .flat()
    .sort((a, b) => b.dataCriacao.toMillis() - a.dataCriacao.toMillis());

  return { items: mesclada.filter((item) => passaFiltros(item, filtros)) };
}

async function fetchProjetosByIds(ids: string[]): Promise<Projeto[]> {
  if (ids.length === 0) return [];
  const results = await Promise.all(
    ids.map(async (id) => {
      const snap = await getDoc(doc(db, 'projetos', id));
      if (!snap.exists()) return null;
      const parsed = projetoSchema.safeParse({ id: snap.id, ...snap.data() });
      if (!parsed.success) {
        console.error('[fetchProjetosByIds] projeto com formato inválido:', id, parsed.error.flatten());
        return null;
      }
      return parsed.data;
    })
  );
  return results.filter((p): p is Projeto => p !== null);
}

export function useProjetosList(companyIds: string[], filtros: ProjetosFiltros = {}) {
  const { busca, dataInicio, dataFim, produtoIds = [], caminhaoIds = [], page = 1, pageSize = DEFAULT_PAGE_SIZE } = filtros;

  const metaQuery = useQuery({
    queryKey: ['projetosMeta', companyIds, busca ?? '', dataInicio?.toISOString() ?? '', dataFim?.toISOString() ?? ''],
    queryFn: () => fetchMetaFull(companyIds, { busca, dataInicio, dataFim }),
    enabled: companyIds.length > 0,
  });

  const metaFiltrada = metaQuery.data?.items ?? [];
  const totalFiltrado = metaFiltrada.length;
  const totalPaginas = Math.max(1, Math.ceil(totalFiltrado / pageSize));
  const metaPagina = metaFiltrada.slice((page - 1) * pageSize, page * pageSize);
  const idsPagina = metaPagina.map((m) => m.id);

  const paginaQuery = useQuery({
    queryKey: ['projetosPagina', idsPagina],
    queryFn: () => fetchProjetosByIds(idsPagina),
    enabled: idsPagina.length > 0,
  });

  const projetosOrdenados = idsPagina
    .map((id) => paginaQuery.data?.find((p) => p.id === id))
    .filter((p): p is Projeto => Boolean(p))
    .filter((p) => (produtoIds.length > 0 ? produtoIds.includes(p.informacoesOperacao?.produto?.id ?? '') : true))
    .filter((p) => (caminhaoIds.length > 0 ? caminhaoIds.includes(p.informacoesOperacao?.caminhao?.id ?? '') : true));

  return {
    projetos: projetosOrdenados,
    totalFiltrado,
    totalPaginas,
    page,
    pageSize,
    isLoadingMeta: metaQuery.isLoading,
    isLoadingPagina: paginaQuery.isLoading,
    isError: metaQuery.isError || paginaQuery.isError,
    error: metaQuery.error ?? paginaQuery.error,
  };
}

interface AmostraManualInput {
  amostraId: number;
  densidadeInicial: number | null;
  densidadeFinal: number | null;
}

interface CreateProjetoInput {
  nomeProjeto: string;
  companyId: string;
  uidUsuario: string;
  data: string;
  amostras: AmostraManualInput[];
  numeroNF?: string;
  kgPrevisto: number | null;
  kgAplicado: number | null;
  caminhao?: { id: string; placa: string } | null;
  equipe?: { id: string; nome: string }[];
  produto?: { id: string; nome: string } | null;
  informacoesGerais?: string;
  furos: Furos | null;
  fotos: string[];
}

interface ProjetoCriado {
  meta: ProjetoMeta;
  fotosEnviadas: boolean;
}

async function enviarFotosDoFogoNovo(projetoId: string, input: CreateProjetoInput): Promise<boolean> {
  if (input.fotos.length === 0) return true;
  try {
    await gravarFotos({ projetoId, companyId: input.companyId, enviadoPor: input.uidUsuario, imagens: input.fotos });
    return true;
  } catch (erro) {
    console.error('[criarProjetoManual] fogo criado, mas as fotos falharam:', projetoId, erro);
    return false;
  }
}

async function criarProjetoManual(input: CreateProjetoInput): Promise<ProjetoCriado> {
  const [ano, mes, dia] = input.data.split('-').map(Number);
  const agora = new Date();
  const dataCriacao = Timestamp.fromDate(
    new Date(ano, mes - 1, dia, agora.getHours(), agora.getMinutes(), agora.getSeconds())
  );

  const amostrasPlanificadas = input.amostras.map((amostra) => ({
    amostraId: amostra.amostraId,
    densidadeInicial: amostra.densidadeInicial,
    densidadeFinal: amostra.densidadeFinal,
  }));

  const calibragem = {
    tara: 0,
    pesoCheio: 0,
    timestamp: dataCriacao,
    necessitaCalibragem: false,
  };

  const dadosDoProjeto = {
    nomeProjeto: input.nomeProjeto.trim(),
    dataCriacao,
    uidUsuario: input.uidUsuario,
    companyId: input.companyId,
    quantidadeAmostras: input.amostras.length,
    amostras: amostrasPlanificadas,
    calibragem,
    informacoesOperacao: {
      numeroNF: input.numeroNF ?? '',
      kgPrevisto: input.kgPrevisto,
      kgAplicado: input.kgAplicado,
      caminhao: input.caminhao ?? null,
      equipe: input.equipe ?? [],
      produto: input.produto ?? null,
      informacoesGerais: input.informacoesGerais ?? '',
    },
    furos: input.furos,
  };

  // Id gerado antes da gravação para as fotos poderem ser penduradas no fogo logo em seguida
  const projetoRef = doc(collection(db, 'projetos'));
  const metaData = {
    nomeProjeto: dadosDoProjeto.nomeProjeto,
    dataCriacao: dadosDoProjeto.dataCriacao,
    uidUsuario: dadosDoProjeto.uidUsuario,
    companyId: dadosDoProjeto.companyId,
  };
  const batch = writeBatch(db);
  batch.set(projetoRef, dadosDoProjeto);
  batch.set(doc(db, 'projetos_meta', projetoRef.id), metaData);
  await batch.commit();

  // Fora do batch: até 10 fotos de quase 1 MB estourariam o limite de tamanho da requisição
  const fotosEnviadas = await enviarFotosDoFogoNovo(projetoRef.id, input);
  return { meta: { id: projetoRef.id, ...metaData }, fotosEnviadas };
}

export function useCreateProjeto() {
  const queryClient = useQueryClient();

  const criarMutation = useMutation({
    mutationFn: criarProjetoManual,
    onSuccess: ({ meta: novoMeta }) => {
      queryClient.setQueriesData<MetaResult>({ queryKey: ['projetosMeta'] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          items: [novoMeta, ...old.items].sort(
            (a, b) => b.dataCriacao.toMillis() - a.dataCriacao.toMillis()
          ),
        };
      });

      // Uma escrita, três consumidores em lugares diferentes: `projetosMeta` já foi
      // atualizado acima; `projetosPeriodo` alimenta o dashboard e costuma estar inativo,
      // daí `refetchType: 'all'`; e o scan de ocorrências roda na montagem do
      // `(app)/layout`, que não remonta em navegação client-side — sem o rescan o fogo
      // novo não é analisado até o próximo reload.
      queryClient.invalidateQueries({
        queryKey: ['projetosPeriodo'],
        refetchType: 'all',
      });
      useOcorrenciaRescan.getState().requestRescan();
    },
  });

  return {
    criarProjeto: criarMutation.mutateAsync,
    isCriando: criarMutation.isPending,
  };
}

interface DeletarProjetoInput {
  id: string;
  companyId: string;
}

/**
 * Atômico de propósito: um fogo apagado pela metade, sem documento mas com ocorrências
 * apontando pra ele, é pior que a exclusão falhar inteira. Estourar o limite de 500
 * escritas do batch falha com erro visível em vez de deixar estado parcial.
 *
 * `companyId` entra na query porque a rule de leitura de ocorrência é escopada por
 * empresa — sem ele a consulta inteira é negada.
 */
async function deletarProjeto({ id, companyId }: DeletarProjetoInput): Promise<string> {
  const [ocorrenciasSnap, midiasSnap] = await Promise.all([
    getDocs(
      query(
        collection(db, 'ocorrencias'),
        where('companyId', '==', companyId),
        where('projetoId', '==', id)
      )
    ),
    // O Firestore não apaga a subcoleção junto com o documento pai
    getDocs(query(collection(db, 'projetos', id, 'midias'), where('companyId', '==', companyId))),
  ]);

  const batch = writeBatch(db);
  batch.delete(doc(db, 'projetos', id));
  batch.delete(doc(db, 'projetos_meta', id));
  ocorrenciasSnap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
  midiasSnap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
  await batch.commit();

  return id;
}

export function useDeleteProjeto() {
  const queryClient = useQueryClient();

  const deletarMutation = useMutation({
    mutationFn: deletarProjeto,
    onSuccess: (idRemovido) => {
      queryClient.setQueriesData<MetaResult>({ queryKey: ['projetosMeta'] }, (old) => {
        if (!old) return old;
        return { ...old, items: old.items.filter((item) => item.id !== idRemovido) };
      });

      queryClient.invalidateQueries({
        queryKey: ['projetosPeriodo'],
        refetchType: 'all',
      });
      queryClient.invalidateQueries({ queryKey: ['ocorrencias'], refetchType: 'all' });
    },
  });

  return {
    deletarProjeto: deletarMutation.mutateAsync,
    isDeletando: deletarMutation.isPending,
  };
}
