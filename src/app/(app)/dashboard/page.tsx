'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import {
  OPCOES_PERIODO, VALOR_PERSONALIZADO, datasDoPeriodo, intervaloDasDatas, labelDasDatas, labelPeriodo, labelPersonalizado,
  periodoDasDatas, periodoDoValor,
} from '@/lib/periodo';
import type { IntervaloDigitado } from '@/helpers/dataLocal';
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
import { IntervaloDeDatas } from '@/components/ui/IntervaloDeDatas/IntervaloDeDatas';
import { MultiSelect } from '@/components/ui/Multiselect/Multiselect';
import { ConteudoDoPainel } from '@/components/painel/ConteudoDoPainel/ConteudoDoPainel';
import { ModalExportarPainel } from '@/components/painel/ModalExportarPainel/ModalExportarPainel';
import styles from './page.module.scss';

const OPCOES_SELECT_PERIODO = OPCOES_PERIODO.map((periodo) => ({ value: String(periodo), label: labelPeriodo(periodo) }));
const PERIODO_INICIAL = 30;

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
  const [datas, setDatas] = useState<IntervaloDigitado>(() => datasDoPeriodo(PERIODO_INICIAL, { inicio: '', fim: '' }));
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
    datas,
    caminhaoIds,
    operadorIds,
    contextoFaixa
  );

  const opcoesSelectUmb = (caminhoes ?? []).map((c) => ({ value: c.id, label: rotuloCaminhao(c) }));
  const opcoesSelectOperador = (operadores ?? []).map((o) => ({ value: o.id, label: o.nome }));

  const periodoLabel = labelDasDatas(datas);
  const periodo = periodoDasDatas(datas);
  const opcoesDoPeriodo = periodo === VALOR_PERSONALIZADO
    ? [...OPCOES_SELECT_PERIODO, { value: VALOR_PERSONALIZADO, label: labelPersonalizado(datas) }]
    : OPCOES_SELECT_PERIODO;

  const mudarPeriodo = (valor: string) => {
    if (valor !== VALOR_PERSONALIZADO) setDatas(datasDoPeriodo(periodoDoValor(valor), datas));
  };

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
    const intervalo = intervaloDasDatas(datas);
    const nomesUmbs = caminhoes.filter((c) => caminhaoIds.includes(c.id)).map(rotuloCaminhao);
    const nomesOperadores = operadores.filter((o) => operadorIds.includes(o.id)).map((o) => o.nome);
    return {
      tema,
      empresa: empresaDoRelatorio(company),
      periodoLabel,
      periodoDescricao: descreverIntervalo(intervalo.inicio, intervalo.fim ?? agora),
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
      <Select
        value={String(periodo)}
        onValueChange={mudarPeriodo}
        options={opcoesDoPeriodo}
        size="sm"
        label='Período'
      />
      <IntervaloDeDatas id="painel-data" intervalo={datas} onChange={setDatas} fimVazioEhHoje />
      <MultiSelect
        values={caminhaoIds}
        onValuesChange={setCaminhaoIds}
        options={opcoesSelectUmb}
        placeholder="Todas"
        size="sm"
        label='UMB'
      />
      <MultiSelect
        values={operadorIds}
        onValuesChange={setOperadorIds}
        options={opcoesSelectOperador}
        placeholder="Todos"
        size="sm"
        label='Operadores'
      />
      <div className={styles.exportar}>
        <Button variant="ghost" icon={<Download size={16} />} onClick={() => setExportarAberto(true)} loading={isAtualizando}>
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
