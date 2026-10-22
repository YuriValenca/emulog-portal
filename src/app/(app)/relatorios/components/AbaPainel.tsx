'use client';

import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { useAppAuth } from '@/hooks/useAppAuth';
import { useContextoFaixa } from '@/hooks/useContextoFaixa';
import { useLicencas } from '@/hooks/useLicencas';
import { useOcorrenciasAbertas } from '@/hooks/ocorrencias/useOcorrenciasAbertas';
import { useRegrasDeteccao } from '@/hooks/ocorrencias/useRegrasDeteccao';
import { fimDoDia, inicioDoDia, type IntervaloDoRelatorio } from '@/hooks/relatorios/useFogosDoRelatorio';
import { Button } from '@/components/ui/Button/Button';
import { ConteudoDoPainel } from '@/components/painel/ConteudoDoPainel/ConteudoDoPainel';
import { ModalExportarPainel } from '@/components/painel/ModalExportarPainel/ModalExportarPainel';
import {
  METRICAS_PADRAO, calcularEstatisticasDeFogos, calcularEstatisticasDeLicencas, type BlocosDoPainel, type MetricasDosRankings,
} from '@/lib/dashboard';
import { descreverIntervalo, empresaDoRelatorio, type TemaDoRelatorio } from '@/lib/relatorios/painel';
import type { Projeto } from '@/schemas/projeto';
import styles from '../page.module.scss';

const dataCurta = (data: Date) => data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

interface AbaPainelProps {
  companyId: string | null;
  fogos: Projeto[];
  intervalo: IntervaloDoRelatorio;
  filtros: string[];
  caminhaoIds: string[];
  operadorIds: string[];
  blocos: BlocosDoPainel;
}

export function AbaPainel({ companyId, fogos, intervalo, filtros, caminhaoIds, operadorIds, blocos }: AbaPainelProps) {
  const { company } = useAppAuth();
  const contextoFaixa = useContextoFaixa(companyId);
  const { data: licencas } = useLicencas(companyId);
  const ocorrenciasAbertas = useOcorrenciasAbertas(companyId);
  const { regras } = useRegrasDeteccao(companyId);
  const [metricas, setMetricas] = useState<MetricasDosRankings>(METRICAS_PADRAO);
  const [exportarAberto, setExportarAberto] = useState(false);

  const { inicio, fim } = useMemo(() => ({ inicio: inicioDoDia(intervalo.inicio), fim: fimDoDia(intervalo.fim) }), [intervalo]);
  const periodoLabel = `${dataCurta(inicio)} a ${dataCurta(fim)}`;

  // Os fogos já chegam filtrados pela página; UMBs e operadores voltam aqui só para limitar os rankings
  const estatisticas = useMemo(
    () => ({
      ...calcularEstatisticasDeFogos(fogos, { inicio, fim, caminhaoIds, operadorIds }, contextoFaixa, regras, fim),
      ...calcularEstatisticasDeLicencas(licencas ?? []),
    }),
    [fogos, inicio, fim, caminhaoIds, operadorIds, contextoFaixa, regras, licencas]
  );

  const montarDadosDoRelatorio = (tema: TemaDoRelatorio) => ({
    tema,
    empresa: empresaDoRelatorio(company),
    periodoLabel,
    periodoDescricao: descreverIntervalo(inicio, fim),
    filtros,
    estatisticas,
    faixa: contextoFaixa.faixaEmpresa,
    ocorrenciasAbertas,
    metricas,
    blocos,
    geradoEm: new Date().toISOString(),
  });

  return (
    <div className={styles.abaPainel}>
      <div className={styles.barraSelecao}>
        <span className={styles.instrucao}>
          O painel abaixo usa as datas e os filtros do topo da página e sai igual no PDF.
        </span>
        <Button variant="brand" icon={<Download size={16} />} onClick={() => setExportarAberto(true)}>
          Exportar PDF
        </Button>
      </div>

      <ConteudoDoPainel
        estatisticas={estatisticas}
        periodoLabel={periodoLabel}
        faixa={contextoFaixa.faixaEmpresa}
        ocorrenciasAbertas={ocorrenciasAbertas}
        metricas={metricas}
        onMetricasChange={setMetricas}
        blocos={blocos}
      />

      {exportarAberto && <ModalExportarPainel montarDados={montarDadosDoRelatorio} onFechar={() => setExportarAberto(false)} />}
    </div>
  );
}
