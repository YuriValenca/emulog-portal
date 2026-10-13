'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Sector,
} from 'recharts';
import type { FogoPorPeriodo, FogoNaoConforme, GranularidadeGrafico } from '@/lib/dashboard';
import clsx from 'clsx';
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
      <div className={styles.row}>
        <div className={styles.panel}>
          <span className={styles.title}>
            Fogos e Kg aplicado {LABEL_GRANULARIDADE[granularidadeGrafico]} ({periodoLabel})
          </span>
          <div className={styles.chartBox}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={fogosAgrupados}>
                <CartesianGrid stroke={CORES.border} vertical={false} />
                <XAxis dataKey="rotulo" stroke={CORES.textMuted} fontSize={12} tickLine={false} axisLine={false} />
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
                    isAnimationActive={!modoRelatorio}
                  />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: CORES.texto }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className={styles.legend}>
            {licencasData.map((item) => (
              <span key={item.nome} className={styles.legendItem}>
                <span className={styles.dot} style={{ background: item.cor }} />
                {item.nome}
              </span>
            ))}
          </div>
        </div>
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
          <div className={styles.legend}>
            {conformidadeData.map((item) => (
              <span key={item.nome} className={styles.legendItem}>
                <span className={styles.dot} style={{ background: item.cor }} />
                {item.nome}
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
