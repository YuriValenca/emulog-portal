'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { OPCOES_PERIODO, inicioDoPeriodo, labelPeriodo, periodoDoValor, type Periodo } from '@/lib/periodo';
import { METRICAS_PADRAO, blocosVisiveisDoPainel, type MetricasDosRankings } from '@/lib/dashboard';
import { descreverFiltro, descreverIntervalo, empresaDoRelatorio, type TemaDoRelatorio } from '@/lib/relatorios/painel';
import { useAppAuth } from '@/hooks/useAppAuth';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useContextoFaixa } from '@/hooks/useContextoFaixa';
import { useCaminhoes } from '@/hooks/cadastro/useCaminhoes';
import { rotuloCaminhao } from '@/helpers/rotuloCaminhao';
import { useOperadores } from '@/hooks/cadastro/useOperadores';
import { useOcorrenciasAbertas } from '@/hooks/ocorrencias/useOcorrenciasAbertas';
import { Button } from '@/components/ui/Button/Button';
import { Select } from '@/components/ui/Select/Select';
import { MultiSelect } from '@/components/ui/Multiselect/Multiselect';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { ConteudoDoPainel } from '@/components/painel/ConteudoDoPainel/ConteudoDoPainel';
import { ModalExportarPainel } from '@/components/painel/ModalExportarPainel/ModalExportarPainel';
import styles from './page.module.scss';

const OPCOES_SELECT_PERIODO = OPCOES_PERIODO.map((periodo) => ({
  value: String(periodo),
  label: labelPeriodo(periodo),
}));

export default function DashboardPage() {
  const { companyId, isSuperadmin } = useAppAuth();

  if (isSuperadmin && !companyId) {
    return (
      <div className={styles.container}>
        <p className={styles.empty}>Selecione uma empresa no topo da página para ver o painel operacional.</p>
      </div>
    );
  }

  // A `key` é load-bearing: remontar ao trocar de empresa é o que zera os filtros.
  return <PainelOperacional key={companyId ?? 'sem-empresa'} companyId={companyId} />;
}

function PainelOperacional({ companyId }: { companyId: string | null }) {
  const { company } = useAppAuth();
  const [periodo, setPeriodo] = useState<Periodo>(30);
  const [caminhaoIds, setCaminhaoIds] = useState<string[]>([]);
  const [operadorIds, setOperadorIds] = useState<string[]>([]);
  const [metricas, setMetricas] = useState<MetricasDosRankings>(METRICAS_PADRAO);
  const [exportarAberto, setExportarAberto] = useState(false);

  const { itens: caminhoes } = useCaminhoes(companyId);
  const { itens: operadores } = useOperadores(companyId);
  const ocorrenciasAbertas = useOcorrenciasAbertas(companyId);
  const contextoFaixa = useContextoFaixa(companyId);
  const { data, isLoading, isError, isAtualizando } = useDashboardStats(
    companyId,
    periodo,
    caminhaoIds,
    operadorIds,
    contextoFaixa
  );

  const opcoesSelectUmb = (caminhoes ?? []).map((c) => ({ value: c.id, label: rotuloCaminhao(c) }));
  const opcoesSelectOperador = (operadores ?? []).map((o) => ({ value: o.id, label: o.nome }));

  const periodoLabel = labelPeriodo(periodo);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.grid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard} />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className={styles.container}>
        <p className={styles.empty}>Não foi possível carregar os dados do painel.</p>
      </div>
    );
  }

  const { faixaEmpresa } = contextoFaixa;
  const blocos = blocosVisiveisDoPainel({ umbs: caminhaoIds.length, operadores: operadorIds.length });

  const montarDadosDoRelatorio = (tema: TemaDoRelatorio) => {
    const agora = new Date();
    const nomesUmbs = caminhoes.filter((c) => caminhaoIds.includes(c.id)).map(rotuloCaminhao);
    const nomesOperadores = operadores.filter((o) => operadorIds.includes(o.id)).map((o) => o.nome);
    return {
      tema,
      empresa: empresaDoRelatorio(company),
      periodoLabel,
      periodoDescricao: descreverIntervalo(inicioDoPeriodo(periodo, agora), agora),
      filtros: [
        descreverFiltro('UMB', nomesUmbs),
        descreverFiltro('Operadores', nomesOperadores),
      ].filter((filtro): filtro is string => filtro !== null),
      estatisticas: data,
      faixa: faixaEmpresa,
      ocorrenciasAbertas,
      metricas,
      blocos,
      geradoEm: agora.toISOString(),
    };
  };

  const filtros = (
    <div className={styles.filtros}>        
      <div className={styles.filtrosLeft}>
        <Select
          value={String(periodo)}
          onValueChange={(value) => setPeriodo(periodoDoValor(value))}
          options={OPCOES_SELECT_PERIODO}
          size="sm"
          label='Período'
        />
        <MultiSelect
          values={caminhaoIds}
          onValuesChange={setCaminhaoIds}
          options={opcoesSelectUmb}
          placeholder="Todas"
          size="sm"
          label='UMB'
        />
      </div>
      <MultiSelect
        values={operadorIds}
        onValuesChange={setOperadorIds}
        options={opcoesSelectOperador}
        placeholder="Todos"
        size="sm"
        label='Operadores'
      />
      {isAtualizando && (
        <span className={styles.atualizando} aria-label="Atualizando período">
          <Spinner size="sm" />
        </span>
      )}
      <div className={styles.exportar}>
        <Button variant="ghost" icon={<Download size={16} />} onClick={() => setExportarAberto(true)} disabled={isAtualizando}>
          Exportar PDF
        </Button>
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      <ConteudoDoPainel
        estatisticas={data}
        periodoLabel={periodoLabel}
        faixa={faixaEmpresa}
        ocorrenciasAbertas={ocorrenciasAbertas}
        metricas={metricas}
        onMetricasChange={setMetricas}
        blocos={blocos}
        entreCardsERankings={filtros}
      />

      {exportarAberto && <ModalExportarPainel montarDados={montarDadosDoRelatorio} onFechar={() => setExportarAberto(false)} />}
    </div>
  );
}
