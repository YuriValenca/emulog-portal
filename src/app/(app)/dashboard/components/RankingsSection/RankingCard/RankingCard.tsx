'use client';

import { useMemo, useRef } from 'react';
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { RankingItem } from '@/hooks/useDashboardStats';
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

function criarContextoMedicao(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  const contexto = document.createElement('canvas').getContext('2d');
  if (contexto) contexto.font = FONTE_MEDICAO;
  return contexto;
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
  const contextoRef = useRef<CanvasRenderingContext2D | null | undefined>(undefined);
  if (contextoRef.current === undefined) {
    contextoRef.current = criarContextoMedicao();
  }
  const contexto = contextoRef.current;

  return useMemo(() => {
    const dados = items.map((item) => {
      const nomesLimitados = limitarNomes(item.label, MAX_NOMES_LABEL);
      const labelEixo = truncarComElipse(contexto, nomesLimitados, LARGURA_EIXO_MAXIMA - PADDING_EIXO);
      return { ...item, labelEixo };
    });

    const altura = Math.max(dados.length * ALTURA_POR_ITEM, ALTURA_MINIMA);
    const larguraEixo = calcularLarguraEixo(dados.map((item) => medirLargura(contexto, item.labelEixo)));

    return { dados, altura, larguraEixo };
  }, [items, contexto]);
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

interface RankingCardProps {
  title: string;
  items: RankingItem[];
}

export function RankingCard({ title, items }: RankingCardProps) {
  const { dados, altura, larguraEixo } = usePreparoDados(items);

  return (
    <div className={styles.card}>
      <p className={styles.cardTitle}>{title}</p>
      <div style={{ width: '100%', height: altura }}>
        <ResponsiveContainer>
          <BarChart data={dados} layout="vertical" barCategoryGap="20%" margin={{ top: 0, right: 24, bottom: 0, left: 0 }}>
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
              formatter={(value) => [value, 'Fogos']}
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
            <Bar dataKey="totalFogos" fill="var(--data)" radius={[0, 4, 4, 0]} barSize={16}>
              <LabelList dataKey="totalFogos" position="right" fill="var(--text)" fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
