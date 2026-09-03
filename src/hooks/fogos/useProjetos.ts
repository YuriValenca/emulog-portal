'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addDoc, collection, doc, getDoc, getDocs,
  orderBy, query, setDoc, Timestamp, where, writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { projetoSchema, projetoMetaSchema, type Projeto, type ProjetoMeta } from '@/schemas/projeto';
import { chunk } from '@/lib/chunk';

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

async function fetchProjetoDetail(projetoId: string): Promise<Projeto> {
  const snap = await getDoc(doc(db, 'projetos', projetoId));
  if (!snap.exists()) throw new Error('projeto-not-found');
  return projetoSchema.parse({ id: snap.id, ...snap.data() });
}

export function useProjetoDetail(projetoId: string | null) {
  const detailQuery = useQuery({
    queryKey: ['projetoDetail', projetoId],
    queryFn: () => fetchProjetoDetail(projetoId!),
    enabled: !!projetoId,
  });

  return {
    projeto: detailQuery.data ?? null,
    isLoading: detailQuery.isLoading,
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
  kgPrevisto?: string;
  kgAplicado?: string;
  caminhao?: { id: string; placa: string } | null;
  equipe?: { id: string; nome: string }[];
  produto?: { id: string; nome: string } | null;
  informacoesGerais?: string;
}

async function criarProjetoManual(input: CreateProjetoInput): Promise<ProjetoMeta> {
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
      kgPrevisto: input.kgPrevisto ?? '',
      kgAplicado: input.kgAplicado ?? '',
      caminhao: input.caminhao ?? null,
      equipe: input.equipe ?? [],
      produto: input.produto ?? null,
      informacoesGerais: input.informacoesGerais ?? '',
    },
  };

  const docRef = await addDoc(collection(db, 'projetos'), dadosDoProjeto);
  const metaData = {
    nomeProjeto: dadosDoProjeto.nomeProjeto,
    dataCriacao: dadosDoProjeto.dataCriacao,
    uidUsuario: dadosDoProjeto.uidUsuario,
    companyId: dadosDoProjeto.companyId,
  };
  await setDoc(doc(db, 'projetos_meta', docRef.id), metaData);

  return { id: docRef.id, ...metaData };
}

export function useCreateProjeto() {
  const queryClient = useQueryClient();

  const criarMutation = useMutation({
    mutationFn: criarProjetoManual,
    onSuccess: (novoMeta) => {
      queryClient.setQueriesData<MetaResult>({ queryKey: ['projetosMeta'] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          items: [novoMeta, ...old.items].sort(
            (a, b) => b.dataCriacao.toMillis() - a.dataCriacao.toMillis()
          ),
        };
      });
    },
  });

  return {
    criarProjeto: criarMutation.mutateAsync,
    isCriando: criarMutation.isPending,
  };
}

async function deletarProjeto(id: string): Promise<string> {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'projetos', id));
  batch.delete(doc(db, 'projetos_meta', id));
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
    },
  });

  return {
    deletarProjeto: deletarMutation.mutateAsync,
    isDeletando: deletarMutation.isPending,
  };
}
