'use client';

import { useMemo, useState } from 'react';
import { useAppAuth } from '@/hooks/useAppAuth';
import { useCaminhoes } from '@/hooks/cadastro/useCaminhoes';
import { useOperadores } from '@/hooks/cadastro/useOperadores';
import { useClientes } from '@/hooks/cadastro/useClientes';
import { useProdutos } from '@/hooks/cadastro/useProdutos';
import { useFogosDoRelatorio, type IntervaloDoRelatorio } from '@/hooks/relatorios/useFogosDoRelatorio';
import { Input } from '@/components/ui/Input/Input';
import { MultiSelect } from '@/components/ui/Multiselect/Multiselect';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { Tabs } from '@/components/ui/Tabs/Tabs';
import { blocosVisiveisDoPainel } from '@/lib/dashboard';
import { descreverFiltro } from '@/lib/relatorios/painel';
import type { Projeto } from '@/schemas/projeto';
import { RelatoriosDeFogos } from './components/RelatoriosDeFogos';
import { AbaPainel } from './components/AbaPainel';
import styles from './page.module.scss';

const DIAS_PADRAO = 30;

const doisDigitos = (n: number) => String(n).padStart(2, '0');
const paraDataInput = (data: Date) => `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`;

function intervaloPadrao(): IntervaloDoRelatorio {
  const hoje = new Date();
  const inicio = new Date(hoje);
  inicio.setDate(hoje.getDate() - DIAS_PADRAO);
  return { inicio: paraDataInput(inicio), fim: paraDataInput(hoje) };
}

interface FiltrosDeFogo {
  caminhaoIds: string[];
  operadorIds: string[];
  clienteIds: string[];
  produtoIds: string[];
}

const contem = (ids: string[], id: string | undefined) => ids.length === 0 || (id !== undefined && ids.includes(id));

function passaFiltros(projeto: Projeto, filtros: FiltrosDeFogo): boolean {
  const info = projeto.informacoesOperacao;
  return contem(filtros.caminhaoIds, info?.caminhao?.id)
    && contem(filtros.clienteIds, projeto.cliente?.id)
    && contem(filtros.produtoIds, info?.produto?.id ?? undefined)
    && (filtros.operadorIds.length === 0 || (info?.equipe ?? []).some((membro) => filtros.operadorIds.includes(membro.id)));
}

const opcoes = <T extends { id: string }>(itens: T[], rotulo: (item: T) => string) =>
  itens.map((item) => ({ value: item.id, label: rotulo(item) }));

const nomesSelecionados = <T extends { id: string }>(itens: T[], ids: string[], rotulo: (item: T) => string) =>
  itens.filter((item) => ids.includes(item.id)).map(rotulo);

export default function RelatoriosPage() {
  const { companyId, isSuperadmin } = useAppAuth();
  const { itens: caminhoes } = useCaminhoes(companyId);
  const { itens: operadores } = useOperadores(companyId);
  const { itens: clientes } = useClientes(companyId);
  const { itens: produtos } = useProdutos(companyId);

  const [intervalo, setIntervalo] = useState<IntervaloDoRelatorio>(intervaloPadrao);
  const [filtros, setFiltros] = useState<FiltrosDeFogo>({ caminhaoIds: [], operadorIds: [], clienteIds: [], produtoIds: [] });

  const { fogos, isLoading, isError, intervaloValido } = useFogosDoRelatorio(companyId, intervalo);
  const visiveis = useMemo(() => fogos.filter((fogo) => passaFiltros(fogo, filtros)), [fogos, filtros]);

  const descricaoDosFiltros = [
    descreverFiltro('UMB', nomesSelecionados(caminhoes, filtros.caminhaoIds, (c) => c.tag ?? c.placa)),
    descreverFiltro('Operadores', nomesSelecionados(operadores, filtros.operadorIds, (o) => o.nome)),
    descreverFiltro('Clientes', nomesSelecionados(clientes, filtros.clienteIds, (c) => c.nome)),
    descreverFiltro('Produtos', nomesSelecionados(produtos, filtros.produtoIds, (p) => p.nome)),
  ].filter((filtro): filtro is string => filtro !== null);

  const alterarFiltro = (campo: keyof FiltrosDeFogo) => (ids: string[]) => setFiltros((atuais) => ({ ...atuais, [campo]: ids }));

  if (isSuperadmin && !companyId) {
    return (
      <div className={styles.container}>
        <p className={styles.empty}>Selecione uma empresa no topo da página para gerar relatórios.</p>
      </div>
    );
  }

  const estadoDosFogos = !intervaloValido
    ? 'Escolha uma data inicial anterior à final.'
    : isError
      ? 'Não foi possível carregar os fogos do período.'
      : null;

  return (
    <div className={styles.container}>
      <div className={styles.filtros}>
        <Input
          id="relatorio-inicio"
          type="date"
          label="Fogos de"
          value={intervalo.inicio}
          max={intervalo.fim}
          onChange={(e) => setIntervalo((atual) => ({ ...atual, inicio: e.target.value }))}
          size="sm"
        />
        <Input
          id="relatorio-fim"
          type="date"
          label="Até"
          value={intervalo.fim}
          min={intervalo.inicio}
          max={paraDataInput(new Date())}
          onChange={(e) => setIntervalo((atual) => ({ ...atual, fim: e.target.value }))}
          size="sm"
        />
        <MultiSelect label="UMB" placeholder="Todas" values={filtros.caminhaoIds} onValuesChange={alterarFiltro('caminhaoIds')}
          options={opcoes(caminhoes, (c) => c.tag ?? c.placa)} size="sm" width={180} />
        <MultiSelect label="Operadores" placeholder="Todos" values={filtros.operadorIds} onValuesChange={alterarFiltro('operadorIds')}
          options={opcoes(operadores, (o) => o.nome)} size="sm" width={180} searchable />
        <MultiSelect label="Cliente" placeholder="Todos" values={filtros.clienteIds} onValuesChange={alterarFiltro('clienteIds')}
          options={opcoes(clientes, (c) => c.nome)} size="sm" width={180} searchable />
        <MultiSelect label="Produto" placeholder="Todos" values={filtros.produtoIds} onValuesChange={alterarFiltro('produtoIds')}
          options={opcoes(produtos, (p) => p.nome)} size="sm" width={180} />
      </div>

      {estadoDosFogos ? (
        <p className={styles.empty}>{estadoDosFogos}</p>
      ) : isLoading ? (
        <div className={styles.loadingRow}>
          <Spinner />
        </div>
      ) : (
        <Tabs
          items={[
            { value: 'fogos', label: 'Fogos', content: <RelatoriosDeFogos fogos={visiveis} /> },
            {
              value: 'painel',
              label: 'Painel',
              content: (
                <AbaPainel
                  companyId={companyId}
                  fogos={visiveis}
                  intervalo={intervalo}
                  filtros={descricaoDosFiltros}
                  caminhaoIds={filtros.caminhaoIds}
                  operadorIds={filtros.operadorIds}
                  blocos={blocosVisiveisDoPainel({
                    umbs: filtros.caminhaoIds.length,
                    operadores: filtros.operadorIds.length,
                    clientes: filtros.clienteIds.length,
                    produtos: filtros.produtoIds.length,
                  })}
                />
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
