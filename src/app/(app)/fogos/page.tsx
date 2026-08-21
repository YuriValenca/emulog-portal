'use client';

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useAppAuth } from '@/hooks/useAppAuth';
import { useCompanyGroup } from '@/hooks/fogos/useCompanyGroup';
import { useProjetosList, DEFAULT_PAGE_SIZE } from '@/hooks/fogos/useProjetos';
import { useCaminhoes } from '@/hooks/cadastro/useCaminhoes';
import { useOperadores } from '@/hooks/cadastro/useOperadores';
import { useProdutos } from '@/hooks/cadastro/useProdutos';
import { Button } from '@/components/ui/Button/Button';
import { Pagination } from '@/components/ui/Pagination/Pagination';
import FiltrosFogos from './components/FiltrosFogos/FiltrosFogos';
import FogosTable from './components/FogosTable/FogosTable';
import FogoDetailModal from './components/FogoDetailModal/FogoDetailModa';
import CriarFogoModal from './components/CriarFogoModal/CriarFogoModal';
import type { Projeto } from '@/types';
import styles from './page.module.scss';

export default function FogosPage() {
  const { companyId, appUser, isSuperadmin } = useAppAuth();

  const { companyIds } = useCompanyGroup(companyId);
  const { caminhoes } = useCaminhoes(companyId);
  const { operadores } = useOperadores(companyId);
  const { produtos } = useProdutos(companyId);

  const [filtros, setFiltros] = useState({
    busca: '', dataInicio: '', dataFim: '', produtoIds: [] as string[], caminhaoIds: [] as string[], pageSize: DEFAULT_PAGE_SIZE,
  });
  const [page, setPage] = useState(1);
  const [selecionado, setSelecionado] = useState<Projeto | null>(null);
  const [modalCriarAberto, setModalCriarAberto] = useState(false);

  const produtosById = useMemo(() => new Map(produtos.map((p) => [p.id, p])), [produtos]);

  const { projetos, totalFiltrado, totalPaginas, isLoadingMeta, isLoadingPagina, isError, error } = useProjetosList(companyIds, {
    busca: filtros.busca,
    dataInicio: filtros.dataInicio ? new Date(filtros.dataInicio) : undefined,
    dataFim: filtros.dataFim ? new Date(filtros.dataFim) : undefined,
    produtoIds: filtros.produtoIds,
    caminhaoIds: filtros.caminhaoIds,
    page,
    pageSize: filtros.pageSize,
  });

  const handleFiltrosChange = (novo: typeof filtros) => {
    setFiltros(novo);
    setPage(1);
  };

  if (isSuperadmin && !companyId) {
    return (
      <div className={styles.container}>
        <p className={styles.empty}>Selecione uma empresa no topo da página para ver os fogos.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button variant="accent" icon={<Plus size={16} />} onClick={() => setModalCriarAberto(true)}>
          Novo fogo
        </Button>
      </div>

      <FiltrosFogos filtros={filtros} onChange={handleFiltrosChange} produtos={produtos} caminhoes={caminhoes} />

      <span className={styles.resumo}>
        {totalFiltrado} fogo{totalFiltrado !== 1 ? 's' : ''} encontrado{totalFiltrado !== 1 ? 's' : ''}
      </span>

      {isError ? (
        <div className={styles.error}>{String(error)}</div>
      ) : isLoadingMeta || isLoadingPagina ? (
        <div className={styles.loading}>Carregando fogos...</div>
      ) : (
        <FogosTable projetos={projetos} produtosById={produtosById} onSelect={setSelecionado} />
      )}

      <Pagination page={page} totalPages={totalPaginas} onPageChange={setPage} />

      <FogoDetailModal projeto={selecionado} onClose={() => setSelecionado(null)} />

      {companyId && appUser && (
        <CriarFogoModal
          open={modalCriarAberto}
          onClose={() => setModalCriarAberto(false)}
          companyId={companyId}
          uidUsuario={appUser.uid}
          produtos={produtos}
          caminhoes={caminhoes}
          operadores={operadores}
        />
      )}
    </div>
  );
}
