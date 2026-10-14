'use client';

import { useMemo } from 'react';
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import clsx from 'clsx';
import type { MetricaRanking, RankingItem } from '@/lib/dashboard';
import { formatarKg } from '@/lib/fogoUtils';
import styles from '../RankingsSection.module.scss';

const MAX_NOMES_LABEL = 2;
const ALTURA_POR_ITEM = 26;
const ALTURA_MINIMA = ALTURA_POR_ITEM * 2;
const LARGURA_EIXO_MINIMA = 48;
const LARGURA_EIXO_MAXIMA = 110;
const PADDING_EIXO = 16;
const FONTE_MEDICAO = '500 12px sans-serif';

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

function calcularLarguraEixo(larguras: number[]): number {
  const maiorLargura = Math.max(...larguras, 0);
  return Math.min(LARGURA_EIXO_MAXIMA, Math.max(LARGURA_EIXO_MINIMA, Math.ceil(maiorLargura) + PADDING_EIXO));
}

interface DadoPreparado extends RankingItem {
  labelEixo: string;
}

interface DadosPreparados {
  dados: DadoPreparado[];
  altura: number;
  larguraEixo: number;
}

function usePreparoDados(items: RankingItem[]): DadosPreparados {
  return useMemo(() => {
    const contexto = obterContextoMedicao();

    const dados = items.map((item) => {
      const nomesLimitados = limitarNomes(item.label, MAX_NOMES_LABEL);
      const labelEixo = truncarComElipse(contexto, nomesLimitados, LARGURA_EIXO_MAXIMA - PADDING_EIXO);
      return { ...item, labelEixo };
    });

    const altura = Math.max(dados.length * ALTURA_POR_ITEM, ALTURA_MINIMA);
    const larguraEixo = calcularLarguraEixo(dados.map((item) => medirLargura(contexto, item.labelEixo)));

    return { dados, altura, larguraEixo };
  }, [items]);
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

const METRICAS: Record<MetricaRanking, { rotulo: string; titulo: string; nomeNoTooltip: string; margemDireita: number }> = {
  totalFogos: { rotulo: 'Fogos', titulo: 'Fogos por', nomeNoTooltip: 'Fogos', margemDireita: 24 },
  kgAplicado: { rotulo: 'Kg', titulo: 'Kg aplicado por', nomeNoTooltip: 'Kg aplicado', margemDireita: 88 },
};

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

interface RankingCardProps {
  entidade: string;
  items: RankingItem[];
  metrica: MetricaRanking;
  onMetricaChange?: (metrica: MetricaRanking) => void;
  modoRelatorio?: boolean;
}

export function RankingCard({ entidade, items, metrica, onMetricaChange, modoRelatorio = false }: RankingCardProps) {
  const { dados, altura, larguraEixo } = usePreparoDados(items);
  const { titulo, nomeNoTooltip, margemDireita } = METRICAS[metrica];

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <p className={styles.cardTitle}>{`${titulo} ${entidade}`}</p>
        {!modoRelatorio && onMetricaChange && <SeletorDeMetrica metrica={metrica} onChange={onMetricaChange} />}
      </div>
      <div style={{ width: '100%', height: altura }}>
        <ResponsiveContainer>
          <BarChart data={dados} layout="vertical" barCategoryGap="20%" margin={{ top: 0, right: margemDireita, bottom: 0, left: 0 }}>
            <XAxis type="number" hide />
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
              formatter={(value) => [formatarValor(Number(value), metrica), nomeNoTooltip]}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ''}
              contentStyle={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 12,
              }}
              labelStyle={{ color: 'var(--text)' }}
              itemStyle={{ color: 'var(--text)' }}
            />
            <Bar dataKey={metrica} fill="var(--data)" radius={[0, 4, 4, 0]} barSize={16} isAnimationActive={!modoRelatorio}>
              <LabelList
                dataKey={metrica}
                position="right"
                fill="var(--text)"
                fontSize={12}
                formatter={(value) => formatarValor(Number(value), metrica)}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
