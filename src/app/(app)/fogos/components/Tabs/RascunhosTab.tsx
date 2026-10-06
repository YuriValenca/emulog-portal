'use client';

import { useMemo, useState } from 'react';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { Pagination } from '@/components/ui/Pagination/Pagination';
import { useRascunhos } from '@/hooks/fogos/useRascunhos';
import { useUsuarios } from '@/hooks/cadastro/useUsuarios';
import { useProdutos } from '@/hooks/cadastro/useProdutos';
import { useAgora } from '@/hooks/useAgora';
import type { FiltrosState } from '../FiltrosFogos/FiltrosFogos';
import RascunhosTable from '../RascunhosTable/RascunhosTable';
import FogoDetailModal from '../FogoDetailModal/FogoDetailModal';
import type { ProjetoRascunho } from '@/schemas/projetoRascunho';
import styles from './FogosTab.module.scss';

interface RascunhosTabProps {
  companyId: string | null;
  filtros: FiltrosState;
  page: number;
  onPageChange: (page: number) => void;
}

function passaFiltros(rascunho: ProjetoRascunho, filtros: FiltrosState): boolean {
  const busca = filtros.busca.trim().toLowerCase();
  if (busca && !(rascunho.nomeProjeto ?? '').toLowerCase().includes(busca)) return false;

  const criacao = rascunho.dataCriacao.toDate();
  if (filtros.dataInicio && criacao < new Date(filtros.dataInicio)) return false;
  if (filtros.dataFim && criacao > new Date(filtros.dataFim)) return false;

  if (filtros.produtoIds.length > 0
    && !filtros.produtoIds.includes(rascunho.informacoesOperacao?.produto?.id ?? '')) return false;
  if (filtros.caminhaoIds.length > 0
    && !filtros.caminhaoIds.includes(rascunho.informacoesOperacao?.caminhao?.id ?? '')) return false;

  return true;
}

export default function RascunhosTab({ companyId, filtros, page, onPageChange }: RascunhosTabProps) {
  const { rascunhos, isLoading, isError, error } = useRascunhos(companyId);
  const { usuarios } = useUsuarios(companyId);
  const { produtos } = useProdutos(companyId);
  const agora = useAgora();

  const [selecionado, setSelecionado] = useState<ProjetoRascunho | null>(null);

  const filtrados = useMemo(
    () => rascunhos.filter((rascunho) => passaFiltros(rascunho, filtros)),
    [rascunhos, filtros]
  );

  const produtosById = useMemo(() => new Map(produtos.map((p) => [p.id, p])), [produtos]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / filtros.pageSize));
  const pagina = filtrados.slice((page - 1) * filtros.pageSize, page * filtros.pageSize);

  const nomePorUid = useMemo(
    () => new Map(usuarios.map((u) => [u.uid, u.nome ?? u.email])),
    [usuarios]
  );

  if (isError) {
    const codigo = (error as { code?: string })?.code;
    return (
      <div className={styles.error}>
        Não foi possível carregar os rascunhos.
        {process.env.NODE_ENV !== 'production' && codigo && (
          <span className={styles.debug}>{codigo}</span>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Spinner />
      </div>
    );
  }

  return (
    <>
      <div className={styles.header}>
        <span className={styles.resumo}>
          {filtrados.length} rascunho{filtrados.length !== 1 ? 's' : ''} em andamento
        </span>
      </div>

      <RascunhosTable
        rascunhos={pagina}
        produtosById={produtosById}
        nomePorUid={nomePorUid}
        agora={agora}
        onSelect={setSelecionado}
      />

      <Pagination page={page} totalPages={totalPaginas} onPageChange={onPageChange} />

      {filtrados.length === 0 && (
        <p className={styles.empty}>
          {rascunhos.length === 0
            ? 'Nenhum rascunho em andamento. Projetos aparecem aqui enquanto o app não os conclui.'
            : 'Nenhum rascunho corresponde aos filtros.'}
        </p>
      )}

      <FogoDetailModal projeto={selecionado} onClose={() => setSelecionado(null)} />
    </>
  );
}
