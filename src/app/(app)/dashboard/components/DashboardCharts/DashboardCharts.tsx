'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Sector,
} from 'recharts';
import type { FogoPorPeriodo, FogoNaoConforme, GranularidadeGrafico } from '@/lib/dashboard';
import clsx from 'clsx';
import { BlocoAnimado } from '@/components/painel/BlocoAnimado/BlocoAnimado';
import styles from './DashboardCharts.module.scss';

interface DashboardChartsProps {
  periodoLabel: string;
  fogosAgrupados: FogoPorPeriodo[];
  granularidadeGrafico: GranularidadeGrafico;
  licencasAtivas: number;
  licencasExpirando: number;
  licencasDisponiveis: number;
  fogosConformesPeriodo: number;
  fogosAlertaPeriodo: number;
  fogosNaoConformes: FogoNaoConforme[];
  mostrarLicencas?: boolean;
  modoRelatorio?: boolean;
}

const CORES = {
  accent: 'var(--accent)',
  data: 'var(--data)',
  ok: 'var(--ok)',
  crit: 'var(--crit)',
  border: 'var(--border)',
  textMuted: 'var(--text-muted)',
  surface: 'var(--surface-2)',
  texto: 'var(--text)',
};

const LABEL_GRANULARIDADE: Record<GranularidadeGrafico, string> = {
  diaria: 'por dia',
  semanal: 'por semana',
  mensal: 'por mês',
};

interface FatiaColorida {
  cx: number;
  cy: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  payload: { cor: string };
}

function renderFatiaColorida(props: FatiaColorida) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, payload } = props;
  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={payload.cor}
    />
  );
}

const RADIANOS = Math.PI / 180;
const PERCENTUAL_MINIMO_ROTULO = 0.06;

interface RotuloDaFatiaProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  value: number;
  percent: number;
}

function renderRotuloDaFatia({ cx, cy, midAngle, innerRadius, outerRadius, value, percent }: RotuloDaFatiaProps) {
  if (percent < PERCENTUAL_MINIMO_ROTULO) return null;
  const raio = (innerRadius + outerRadius) / 2;
  return (
    <text
      x={cx + raio * Math.cos(-midAngle * RADIANOS)}
      y={cy + raio * Math.sin(-midAngle * RADIANOS)}
      fill="#FFFFFF"
      fontSize={12}
      fontWeight={600}
      textAnchor="middle"
      dominantBaseline="central"
    >
      {value}
    </text>
  );
}

const SEPARADOR_DO_INTERVALO = ' a ';
const ALTURA_DA_LINHA_DO_EIXO = 14;

const linhasDoRotulo = (rotulo: string) => {
  const [inicio, fim] = rotulo.split(SEPARADOR_DO_INTERVALO);
  return fim ? [inicio, 'a', fim] : [inicio];
};

// O Recharts mede o rótulo pelo tickFormatter para esconder os que se encostam: mede só a linha mais larga
const linhaMaisLarga = (rotulo: string) =>
  linhasDoRotulo(rotulo).reduce((maior, linha) => (linha.length > maior.length ? linha : maior));

interface RotuloDoEixoProps {
  x: number;
  y: number;
  payload: { value: string };
}

function RotuloDoEixo({ x, y, payload }: RotuloDoEixoProps) {
  return (
    <text x={x} y={y} textAnchor="middle" fill={CORES.textMuted} fontSize={12}>
      {linhasDoRotulo(payload.value).map((linha, indice) => (
        <tspan key={indice} x={x} dy={indice === 0 ? '0.71em' : ALTURA_DA_LINHA_DO_EIXO}>{linha}</tspan>
      ))}
    </text>
  );
}

function Legenda({ itens }: { itens: { nome: string; valor: number; cor: string }[] }) {
  return (
    <div className={styles.legend}>
      {itens.map((item) => (
        <span key={item.nome} className={styles.legendItem}>
          <span className={styles.dot} style={{ background: item.cor }} />
          {item.nome}
          <span className={styles.legendValor}>{item.valor}</span>
        </span>
      ))}
    </div>
  );
}

export function DashboardCharts({
  periodoLabel,
  fogosAgrupados,
  granularidadeGrafico,
  licencasAtivas,
  licencasExpirando,
  licencasDisponiveis,
  fogosConformesPeriodo,
  fogosAlertaPeriodo,
  fogosNaoConformes,
  mostrarLicencas = true,
  modoRelatorio = false,
}: DashboardChartsProps) {
  const licencasData = [
    { nome: 'Ativas', valor: licencasAtivas, cor: CORES.ok },
    { nome: 'Expirando', valor: licencasExpirando, cor: CORES.accent },
    { nome: 'Disponíveis', valor: licencasDisponiveis, cor: CORES.data },
  ].filter((item) => item.valor > 0);

  const conformidadeData = [
    { nome: 'Conforme', valor: fogosConformesPeriodo, cor: CORES.ok },
    { nome: 'Alerta', valor: fogosAlertaPeriodo, cor: CORES.crit },
  ].filter((item) => item.valor > 0);

  const tooltipStyle = { background: CORES.surface, border: `1px solid ${CORES.border}`, borderRadius: 8 };

  return (
    <>
      <div className={clsx(styles.row, styles.rowLinhaELicencas)}>
        <div className={styles.panel}>
          <span className={styles.title}>
            Fogos e Kg aplicado {LABEL_GRANULARIDADE[granularidadeGrafico]} ({periodoLabel})
          </span>
          <div className={styles.chartBox}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={fogosAgrupados}>
                <CartesianGrid stroke={CORES.border} vertical={false} />
                <XAxis
                  dataKey="rotulo"
                  stroke={CORES.textMuted}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tick={RotuloDoEixo as never}
                  tickFormatter={linhaMaisLarga}
                  interval="equidistantPreserveStart"
                  minTickGap={12}
                  height={granularidadeGrafico === 'diaria' ? 30 : 30 + 2 * ALTURA_DA_LINHA_DO_EIXO}
                />
                <YAxis yAxisId="fogos" stroke={CORES.accent} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis yAxisId="kg" orientation="right" stroke={CORES.data} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: CORES.texto }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line yAxisId="fogos" type="monotone" dataKey="totalFogos" name="Fogos" stroke={CORES.accent} strokeWidth={2} dot={{ r: 3, fill: CORES.accent }} isAnimationActive={!modoRelatorio} />
                <Line yAxisId="kg" type="monotone" dataKey="kgAplicado" name="Kg aplicado" stroke={CORES.data} strokeWidth={2} dot={{ r: 3, fill: CORES.data }} isAnimationActive={!modoRelatorio} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <BlocoAnimado visivel={mostrarLicencas} className={styles.painelRecolhivel}>
          <div className={styles.panel}>
            <span className={styles.title}>Licenças</span>
            <div className={styles.chartBox}>
              {licencasData.length === 0 ? (
                <p className={styles.empty}>Nenhuma licença cadastrada.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={licencasData}
                      dataKey="valor"
                      nameKey="nome"
                      innerRadius="60%"
                      outerRadius="85%"
                      paddingAngle={2}
                      shape={renderFatiaColorida as never}
                      label={renderRotuloDaFatia as never}
                      labelLine={false}
                      isAnimationActive={!modoRelatorio}
                    />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: CORES.texto }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <Legenda itens={licencasData} />
          </div>
        </BlocoAnimado>
      </div>

      <div className={styles.row}>
        <div className={styles.panel}>
          <span className={styles.title}>Conformidade de densidade ({periodoLabel})</span>
          <div className={styles.conformidadeContent}>
            <div className={styles.chartBox}>
              {conformidadeData.length === 0 ? (
                <p className={styles.empty}>Nenhuma amostra de densidade no período.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={conformidadeData}
                      dataKey="valor"
                      nameKey="nome"
                      innerRadius="60%"
                      outerRadius="85%"
                      paddingAngle={2}
                      shape={renderFatiaColorida as never}
                      label={renderRotuloDaFatia as never}
                      labelLine={false}
                      isAnimationActive={!modoRelatorio}
                    />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: CORES.texto }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className={styles.naoConformesList}>
              <div className={styles.naoConformesHeader}>
                <span className={styles.naoConformesTitle}>Fora da faixa</span>
                <span className={styles.naoConformesCount}>{fogosNaoConformes.length}</span>
              </div>
              {fogosNaoConformes.length === 0 ? (
                <p className={styles.empty}>Nenhum fogo fora da faixa.</p>
              ) : (
                <ul className={clsx(styles.naoConformesScroll, modoRelatorio && styles.naoConformesCompleta)}>
                  {fogosNaoConformes.map((item) => (
                    <li key={item.id} className={styles.naoConformeItem}>
                      <div className={styles.naoConformeInfo}>
                        <span className={styles.naoConformeNome}>{item.nomeProjeto}</span>
                        <span className={styles.naoConformeMeta}>
                          {item.umb ? `${item.umb} · ${item.data}` : item.data}
                        </span>
                      </div>
                      <span className={styles.naoConformeDensidade}>
                        {item.densidadeMedia !== null ? `${item.densidadeMedia.toFixed(2)}` : '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <Legenda itens={conformidadeData} />
        </div>
      </div>
    </>
  );
}
