'use client';

import { useMemo } from 'react';
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis, type LabelProps } from 'recharts';
import clsx from 'clsx';
import type { MetricaRanking, RankingItem } from '@/lib/dashboard';
import { formatarKg } from '@/lib/fogoUtils';
import styles from '../RankingsSection.module.scss';

const ALTURA_POR_ITEM = 26;
const ALTURA_MINIMA = ALTURA_POR_ITEM * 2;
const LARGURA_EIXO_MINIMA = 48;
const PADDING_EIXO = 16;
const FONTE_MEDICAO = '500 12px sans-serif';

export type TipoDeRotulo = 'pessoa' | 'nomeLongo';

// Pessoa fica nos dois primeiros nomes; nome de empresa não tem essa estrutura e precisa de mais espaço
const REGRAS_DO_ROTULO: Record<TipoDeRotulo, { maxNomes: number; larguraMaxima: number }> = {
  pessoa: { maxNomes: 2, larguraMaxima: 110 },
  nomeLongo: { maxNomes: Infinity, larguraMaxima: 200 },
};

function limitarNomes(label: string, maxNomes: number): string {
  const partes = label.trim().split(/\s+/);
  const resultado: string[] = [];
  let nomesEncontrados = 0;

  for (const parte of partes) {
    if (nomesEncontrados === maxNomes) break;
    const ehNome = /^\p{Lu}/u.test(parte);
    if (ehNome) nomesEncontrados += 1;
    resultado.push(parte);
  }

  return resultado.join(' ');
}

let contextoMedicao: CanvasRenderingContext2D | null | undefined;

function obterContextoMedicao(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  if (contextoMedicao === undefined) {
    const contexto = document.createElement('canvas').getContext('2d');
    if (contexto) contexto.font = FONTE_MEDICAO;
    contextoMedicao = contexto;
  }
  return contextoMedicao;
}

function medirLargura(contexto: CanvasRenderingContext2D | null, texto: string): number {
  return contexto ? contexto.measureText(texto).width : texto.length * 7;
}

function truncarComElipse(contexto: CanvasRenderingContext2D | null, texto: string, larguraMaxima: number): string {
  if (medirLargura(contexto, texto) <= larguraMaxima) return texto;
  let textoTruncado = texto;
  while (textoTruncado.length > 0 && medirLargura(contexto, `${textoTruncado}…`) > larguraMaxima) {
    textoTruncado = textoTruncado.slice(0, -1);
  }
  return `${textoTruncado.trim()}…`;
}

function calcularLarguraEixo(larguras: number[], larguraMaxima: number): number {
  const maiorLargura = Math.max(...larguras, 0);
  return Math.min(larguraMaxima, Math.max(LARGURA_EIXO_MINIMA, Math.ceil(maiorLargura) + PADDING_EIXO));
}

interface DadoPreparado extends RankingItem {
  labelEixo: string;
}

interface DadosPreparados {
  dados: DadoPreparado[];
  altura: number;
  larguraEixo: number;
}

function usePreparoDados(items: RankingItem[], tipoDeRotulo: TipoDeRotulo): DadosPreparados {
  return useMemo(() => {
    const contexto = obterContextoMedicao();
    const { maxNomes, larguraMaxima } = REGRAS_DO_ROTULO[tipoDeRotulo];

    const dados = items.map((item) => {
      const nomesLimitados = limitarNomes(item.label, maxNomes);
      const labelEixo = truncarComElipse(contexto, nomesLimitados, larguraMaxima - PADDING_EIXO);
      return { ...item, labelEixo };
    });

    const altura = Math.max(dados.length * ALTURA_POR_ITEM, ALTURA_MINIMA);
    const larguraEixo = calcularLarguraEixo(dados.map((item) => medirLargura(contexto, item.labelEixo)), larguraMaxima);

    return { dados, altura, larguraEixo };
  }, [items, tipoDeRotulo]);
}

interface TickEixoProps {
  x?: number;
  y?: number;
  payload?: { value: string };
}

function TickEixoNome({ x = 0, y = 0, payload }: TickEixoProps) {
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fontSize={12} fill="var(--text-muted)">
      {payload?.value ?? ''}
    </text>
  );
}

const METRICAS: Record<MetricaRanking, { rotulo: string; titulo: string; nomeNoTooltip: string }> = {
  totalFogos: { rotulo: 'Fogos', titulo: 'Fogos por', nomeNoTooltip: 'Fogos' },
  kgAplicado: { rotulo: 'Kg', titulo: 'Kg aplicado por', nomeNoTooltip: 'Kg aplicado' },
  totalAlertas: { rotulo: 'Alertas', titulo: 'Fogos em alerta por', nomeNoTooltip: 'Fogos em alerta' },
};

const SEGMENTOS_DE_ALERTA = [
  { dataKey: 'alertasDensidade', nome: 'Densidade', cor: 'var(--data)' },
  { dataKey: 'alertasKg', nome: 'Kg', cor: 'var(--accent)' },
  { dataKey: 'alertasDensidadeEKg', nome: 'Densidade e Kg', cor: 'var(--crit)' },
] as const;

const ESTILO_DO_ROTULO = { fill: 'var(--text)', fontSize: 12 };

const formatarValor = (valor: number, metrica: MetricaRanking) =>
  metrica === 'kgAplicado' ? `${formatarKg(Math.round(valor))} kg` : String(valor);

interface SeletorDeMetricaProps {
  metrica: MetricaRanking;
  onChange: (metrica: MetricaRanking) => void;
}

function SeletorDeMetrica({ metrica, onChange }: SeletorDeMetricaProps) {
  return (
    <div role="group" aria-label="Métrica do ranking" className={styles.seletor}>
      {(Object.keys(METRICAS) as MetricaRanking[]).map((opcao) => (
        <button
          key={opcao}
          type="button"
          aria-pressed={opcao === metrica}
          className={clsx(styles.opcaoSeletor, opcao === metrica && styles.opcaoSeletorAtiva)}
          onClick={() => onChange(opcao)}
        >
          {METRICAS[opcao].rotulo}
        </button>
      ))}
    </div>
  );
}

function LegendaDeAlertas() {
  return (
    <ul className={styles.legenda}>
      {SEGMENTOS_DE_ALERTA.map((segmento) => (
        <li key={segmento.dataKey} className={styles.itemLegenda}>
          <span className={styles.marcadorLegenda} style={{ background: segmento.cor }} />
          {segmento.nome}
        </li>
      ))}
    </ul>
  );
}

type CampoDeAlerta = (typeof SEGMENTOS_DE_ALERTA)[number]['dataKey'];

function ultimoSegmentoComValor(item: RankingItem): CampoDeAlerta | undefined {
  return SEGMENTOS_DE_ALERTA.findLast((segmento) => item[segmento.dataKey] > 0)?.dataKey;
}

// O Recharts não desenha rótulo em segmento zerado: o total vai depois do último segmento que tem valor.
// O `index` que ele passa conta só os segmentos desenhados daquela cor, então a linha vem pelo id (dataKey="id").
function rotuloDoTotal(dados: RankingItem[], campo: CampoDeAlerta) {
  return function RotuloDoTotal({ value, viewBox }: LabelProps) {
    const item = dados.find((dado) => dado.id === value);
    if (!item || ultimoSegmentoComValor(item) !== campo || !viewBox || !('width' in viewBox)) return null;
    const { x = 0, y = 0, width = 0, height = 0 } = viewBox;
    return (
      <text x={x + width + 5} y={y + height / 2} dy={4} {...ESTILO_DO_ROTULO}>
        {item.totalAlertas}
      </text>
    );
  };
}

// Recharts só reconhece `Bar` como filho direto do gráfico, então isto devolve elementos, não um componente.
function barrasDeAlerta(dados: RankingItem[], animar: boolean) {
  return SEGMENTOS_DE_ALERTA.map((segmento, indice) => {
    const ultimo = indice === SEGMENTOS_DE_ALERTA.length - 1;
    return (
      <Bar
        key={segmento.dataKey}
        dataKey={segmento.dataKey}
        name={segmento.nome}
        stackId="alertas"
        fill={segmento.cor}
        stroke="var(--surface-2)"
        strokeWidth={2}
        radius={ultimo ? [0, 4, 4, 0] : 0}
        barSize={16}
        isAnimationActive={animar}
      >
        <LabelList dataKey="id" content={rotuloDoTotal(dados, segmento.dataKey)} />
      </Bar>
    );
  });
}

function barraSimples(metrica: MetricaRanking, animar: boolean) {
  return (
    <Bar dataKey={metrica} fill="var(--data)" radius={[0, 4, 4, 0]} barSize={16} isAnimationActive={animar}>
      <LabelList
        dataKey={metrica}
        position="right"
        {...ESTILO_DO_ROTULO}
        formatter={(value) => formatarValor(Number(value), metrica)}
      />
    </Bar>
  );
}

const ESPACO_ANTES_DO_VALOR = 5;
const FOLGA_DO_VALOR = 4;

/** Só o espaço que o maior número escrito depois da barra precisa. */
function margemParaOsValores(dados: RankingItem[], metrica: MetricaRanking): number {
  const contexto = obterContextoMedicao();
  const larguras = dados.map((item) => medirLargura(contexto, formatarValor(item[metrica], metrica)));
  return Math.ceil(Math.max(...larguras, 0)) + ESPACO_ANTES_DO_VALOR + FOLGA_DO_VALOR;
}

function rotuloDoTooltip(item: RankingItem | undefined, metrica: MetricaRanking): string {
  if (!item) return '';
  if (metrica !== 'totalAlertas') return item.label;
  return `${item.label} · ${item.totalAlertas} de ${item.totalFogos} fogos`;
}

interface RankingCardProps {
  entidade: string;
  items: RankingItem[];
  tipoDeRotulo?: TipoDeRotulo;
  metrica: MetricaRanking;
  onMetricaChange?: (metrica: MetricaRanking) => void;
  modoRelatorio?: boolean;
}

export function RankingCard({
  entidade, items, tipoDeRotulo = 'pessoa', metrica, onMetricaChange, modoRelatorio = false,
}: RankingCardProps) {
  const { dados, altura, larguraEixo } = usePreparoDados(items, tipoDeRotulo);
  const { titulo, nomeNoTooltip } = METRICAS[metrica];
  const margemDireita = margemParaOsValores(dados, metrica);
  const emAlertas = metrica === 'totalAlertas';

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <p className={styles.cardTitle}>{`${titulo} ${entidade}`}</p>
        {!modoRelatorio && onMetricaChange && <SeletorDeMetrica metrica={metrica} onChange={onMetricaChange} />}
      </div>
      {emAlertas && <LegendaDeAlertas />}
      <div className={styles.areaDoGrafico} style={{ minHeight: altura }}>
        <ResponsiveContainer minHeight={altura}>
          <BarChart data={dados} layout="vertical" barCategoryGap="20%" margin={{ top: 0, right: margemDireita, bottom: 0, left: 0 }}>
            {/* Sem o domínio fixo, o Recharts arredonda o máximo (70 vira 80) e a maior barra não chega ao fim */}
            <XAxis type="number" hide domain={[0, 'dataMax']} />
            <YAxis
              type="category"
              dataKey="labelEixo"
              width={larguraEixo}
              axisLine={false}
              tickLine={false}
              tick={<TickEixoNome />}
            />
            <Tooltip
              cursor={{ fill: 'var(--surface)' }}
              formatter={(value, nome) =>
                emAlertas ? [String(value), String(nome)] : [formatarValor(Number(value), metrica), nomeNoTooltip]
              }
              labelFormatter={(_, payload) => rotuloDoTooltip(payload?.[0]?.payload, metrica)}
              contentStyle={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 12,
              }}
              labelStyle={{ color: 'var(--text)' }}
              itemStyle={{ color: 'var(--text)' }}
            />
            {emAlertas ? barrasDeAlerta(dados, !modoRelatorio) : barraSimples(metrica, !modoRelatorio)}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
