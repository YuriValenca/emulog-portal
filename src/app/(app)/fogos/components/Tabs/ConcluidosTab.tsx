'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAppAuth } from '@/hooks/useAppAuth';
import { useCompanyGroup } from '@/hooks/fogos/useCompanyGroup';
import { useProjetosList, useDeleteProjeto } from '@/hooks/fogos/useProjetos';
import { useCaminhoes } from '@/hooks/cadastro/useCaminhoes';
import { useOperadores } from '@/hooks/cadastro/useOperadores';
import { useProdutos } from '@/hooks/cadastro/useProdutos';
import { useContextoFaixa } from '@/hooks/useContextoFaixa';
import { Button } from '@/components/ui/Button/Button';
import { Pagination } from '@/components/ui/Pagination/Pagination';
import { useToast } from '@/components/ui/Toast/Toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal/ConfirmModal';
import type { FiltrosState } from '../FiltrosFogos/FiltrosFogos';
import FogosTable from '../FogosTable/FogosTable';
import FogoDetailModal from '../FogoDetailModal/FogoDetailModal';
import CriarFogoModal from '../CriarFogoModal/CriarFogoModal';
import type { Projeto } from '@/types';
import styles from './FogosTab.module.scss';

interface ConcluidosTabProps {
  companyId: string | null;
  filtros: FiltrosState;
  page: number;
  onPageChange: (page: number) => void;
}

export default function ConcluidosTab({ companyId, filtros, page, onPageChange }: ConcluidosTabProps) {
  const { appUser } = useAppAuth();
  const { toast } = useToast();

  const { companyIds } = useCompanyGroup(companyId);
  const { itens: caminhoes } = useCaminhoes(companyId);
  const { itens: operadores } = useOperadores(companyId);
  const { itens: produtos } = useProdutos(companyId);
  const { deletarProjeto, isDeletando } = useDeleteProjeto();

  const [projetoParaExcluir, setProjetoParaExcluir] = useState<Projeto | null>(null);
  const [selecionado, setSelecionado] = useState<Projeto | null>(null);
  const [modalCriarAberto, setModalCriarAberto] = useState(false);

  const contextoFaixa = useContextoFaixa(companyId);

  const { projetos, totalFiltrado, totalPaginas, isLoadingMeta, isLoadingPagina, isError, error } = useProjetosList(companyIds, {
    busca: filtros.busca,
    dataInicio: filtros.dataInicio ? new Date(filtros.dataInicio) : undefined,
    dataFim: filtros.dataFim ? new Date(filtros.dataFim) : undefined,
    produtoIds: filtros.produtoIds,
    caminhaoIds: filtros.caminhaoIds,
    page,
    pageSize: filtros.pageSize,
  });

  const cancelarExclusao = () => setProjetoParaExcluir(null);

  const confirmarExclusao = async () => {
    if (!projetoParaExcluir) return;
    try {
      await deletarProjeto({ id: projetoParaExcluir.id, companyId: projetoParaExcluir.companyId });
      cancelarExclusao();
    } catch (err) {
      console.error('[ConcluidosTab] falha ao apagar projeto:', err);
      toast({
        title: 'Não foi possível apagar',
        description: 'O fogo continua na lista. Tente novamente.',
      });
    }
  };

  return (
    <>
      <div className={styles.header}>
        <span className={styles.resumo}>
          {totalFiltrado} fogo{totalFiltrado !== 1 ? 's' : ''} encontrado{totalFiltrado !== 1 ? 's' : ''}
        </span>
        <Button variant="accent" icon={<Plus size={16} />} onClick={() => setModalCriarAberto(true)}>
          Novo fogo
        </Button>
      </div>

      {isError ? (
        <div className={styles.error}>{String(error)}</div>
      ) : isLoadingMeta || isLoadingPagina ? (
        <div className={styles.loading}>Carregando fogos...</div>
      ) : (
        <FogosTable projetos={projetos} contextoFaixa={contextoFaixa} onSelect={setSelecionado} onDelete={setProjetoParaExcluir} />
      )}

      <Pagination page={page} totalPages={totalPaginas} onPageChange={onPageChange} />

      <FogoDetailModal projeto={selecionado} onClose={() => setSelecionado(null)} />

      <ConfirmModal
        open={projetoParaExcluir !== null}
        etapas={[
          {
            title: 'Tem certeza?',
            description: `Você está prestes a apagar o fogo "${projetoParaExcluir?.nomeProjeto}".`,
            confirmLabel: 'Continuar',
          },
          {
            title: 'Apagar permanentemente?',
            description: `Essa ação não pode ser desfeita. "${projetoParaExcluir?.nomeProjeto}" e as ocorrências geradas a partir dele serão apagados para sempre.`,
            confirmLabel: 'Apagar',
            tone: 'danger',
          },
        ]}
        isConfirming={isDeletando}
        onConfirm={confirmarExclusao}
        onCancel={cancelarExclusao}
      />

      {companyId && appUser && modalCriarAberto && (
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
    </>
  );
}
