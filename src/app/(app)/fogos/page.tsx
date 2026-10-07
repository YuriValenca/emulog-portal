'use client';

import { useState } from 'react';
import { useAppAuth } from '@/hooks/useAppAuth';
import { useCaminhoes } from '@/hooks/cadastro/useCaminhoes';
import { useProdutos } from '@/hooks/cadastro/useProdutos';
import { DEFAULT_PAGE_SIZE } from '@/hooks/fogos/useProjetos';
import { Tabs } from '@/components/ui/Tabs/Tabs';
import FiltrosFogos, { type FiltrosState } from './components/FiltrosFogos/FiltrosFogos';
import ConcluidosTab from './components/Tabs/ConcluidosTab';
import RascunhosTab from './components/Tabs/RascunhosTab';
import styles from './page.module.scss';

const FILTROS_INICIAIS: FiltrosState = {
  busca: '',
  dataInicio: '',
  dataFim: '',
  produtoIds: [],
  caminhaoIds: [],
  pageSize: DEFAULT_PAGE_SIZE,
};

export default function FogosPage() {
  const { companyId, isSuperadmin } = useAppAuth();
  const { itens: produtos } = useProdutos(companyId);
  const { itens: caminhoes } = useCaminhoes(companyId);

  const [aba, setAba] = useState('concluidos');
  const [filtros, setFiltros] = useState<FiltrosState>(FILTROS_INICIAIS);
  const [page, setPage] = useState(1);

  const handleFiltrosChange = (novo: FiltrosState) => {
    setFiltros(novo);
    setPage(1);
  };

  const handleAbaChange = (nova: string) => {
    setAba(nova);
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
      <FiltrosFogos
        filtros={filtros}
        onChange={handleFiltrosChange}
        produtos={produtos}
        caminhoes={caminhoes}
      />

      <Tabs
        value={aba}
        onValueChange={handleAbaChange}
        items={[
          {
            value: 'concluidos',
            label: 'Concluídos',
            content: (
              <ConcluidosTab
                companyId={companyId}
                filtros={filtros}
                page={page}
                onPageChange={setPage}
              />
            ),
          },
          {
            value: 'rascunhos',
            label: 'Em andamento',
            content: (
              <RascunhosTab
                companyId={companyId}
                filtros={filtros}
                page={page}
                onPageChange={setPage}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
