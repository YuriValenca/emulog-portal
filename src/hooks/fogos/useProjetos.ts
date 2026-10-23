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

type FiltrosDeMeta = Pick<ProjetosFiltros, 'busca' | 'dataInicio' | 'dataFim'>;

function passaFiltros(item: Pick<ProjetoMeta, 'nomeProjeto' | 'dataCriacao'>, filtros: FiltrosDeMeta) {
  const busca = (filtros.busca ?? '').trim().toLowerCase();
  const passaBusca = busca ? item.nomeProjeto.toLowerCase().includes(busca) : true;
  const data = item.dataCriacao.toDate();
  const passaInicio = filtros.dataInicio ? data >= filtros.dataInicio : true;
  const passaFim = filtros.dataFim ? data <= filtros.dataFim : true;
  return passaBusca && passaInicio && passaFim;
}

function passaFiltrosDeOperacao(projeto: Projeto, produtoIds: string[], caminhaoIds: string[]) {
  const passaProduto = produtoIds.length > 0
    ? produtoIds.includes(projeto.informacoesOperacao?.produto?.id ?? '')
    : true;
  const passaCaminhao = caminhaoIds.length > 0
    ? caminhaoIds.includes(projeto.informacoesOperacao?.caminhao?.id ?? '')
    : true;
  return passaProduto && passaCaminhao;
}

const maisRecentePrimeiro = (a: { dataCriacao: Timestamp }, b: { dataCriacao: Timestamp }) =>
  b.dataCriacao.toMillis() - a.dataCriacao.toMillis();

function paginar<T>(itens: T[], page: number, pageSize: number): T[] {
  return itens.slice((page - 1) * pageSize, page * pageSize);
}

async function fetchMetas(companyIds: string[]): Promise<MetaResult> {
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

  return { items: results.flat().sort(maisRecentePrimeiro) };
}

// Produto e UMB só existem no fogo completo, não no meta: filtrar por eles lê todos os fogos da empresa
async function fetchProjetosCompletos(companyIds: string[]): Promise<Projeto[]> {
  const idChunks = chunk(companyIds, 30);
  const results = await Promise.all(
    idChunks.map(async (ids) => {
      const snap = await getDocs(query(collection(db, 'projetos'), where('companyId', 'in', ids)));
      return snap.docs.flatMap((d) => {
        const parsed = projetoSchema.safeParse({ id: d.id, ...d.data() });
        if (parsed.success) return [parsed.data];
        console.error('[fetchProjetosCompletos] projeto com formato inválido:', d.id, parsed.error.flatten());
        return [];
      });
    })
  );

  return results.flat().sort(maisRecentePrimeiro);
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

  const filtrosDeMeta: FiltrosDeMeta = { busca, dataInicio, dataFim };
  const filtraPorOperacao = produtoIds.length > 0 || caminhaoIds.length > 0;

  const metaQuery = useQuery({
    queryKey: ['projetosMeta', companyIds],
    queryFn: () => fetchMetas(companyIds),
    enabled: companyIds.length > 0 && !filtraPorOperacao,
  });

  const completosQuery = useQuery({
    queryKey: ['projetosCompletos', companyIds],
    queryFn: () => fetchProjetosCompletos(companyIds),
    enabled: companyIds.length > 0 && filtraPorOperacao,
  });

  const metasFiltradas = filtraPorOperacao
    ? []
    : (metaQuery.data?.items ?? []).filter((item) => passaFiltros(item, filtrosDeMeta));
  const completosFiltrados = filtraPorOperacao
    ? (completosQuery.data ?? []).filter(
      (p) => passaFiltros(p, filtrosDeMeta) && passaFiltrosDeOperacao(p, produtoIds, caminhaoIds)
    )
    : [];

  const totalFiltrado = filtraPorOperacao ? completosFiltrados.length : metasFiltradas.length;
  const totalPaginas = Math.max(1, Math.ceil(totalFiltrado / pageSize));
  const idsPagina = paginar(metasFiltradas, page, pageSize).map((m) => m.id);

  const paginaQuery = useQuery({
    queryKey: ['projetosPagina', idsPagina],
    queryFn: () => fetchProjetosByIds(idsPagina),
    enabled: idsPagina.length > 0,
  });

  const projetos = filtraPorOperacao
    ? paginar(completosFiltrados, page, pageSize)
    : idsPagina
      .map((id) => paginaQuery.data?.find((p) => p.id === id))
      .filter((p): p is Projeto => Boolean(p));

  return {
    projetos,
    totalFiltrado,
    totalPaginas,
    page,
    pageSize,
    isLoadingMeta: metaQuery.isLoading || completosQuery.isLoading,
    isLoadingPagina: paginaQuery.isLoading,
    isError: metaQuery.isError || completosQuery.isError || paginaQuery.isError,
    error: metaQuery.error ?? completosQuery.error ?? paginaQuery.error,
  };
}

interface AmostraManualInput {
  amostraId: number;
  densidadeInicial: number | null;
  densidadeFinal: number | null;
}

interface CreateProjetoInput {
  nomeProjeto: string;
  cliente: { id: string; nome: string } | null;
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
    cliente: input.cliente,
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
        return { ...old, items: [novoMeta, ...old.items].sort(maisRecentePrimeiro) };
      });
      queryClient.invalidateQueries({ queryKey: ['projetosCompletos'] });

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
      queryClient.setQueriesData<Projeto[]>({ queryKey: ['projetosCompletos'] }, (old) =>
        old?.filter((projeto) => projeto.id !== idRemovido)
      );

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
