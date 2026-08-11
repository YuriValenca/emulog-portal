'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Sector,
} from 'recharts';
import type { FogoPorPeriodo, GranularidadeGrafico } from '@/hooks/useDashboardStats';
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
}

const CORES = { accent: '#FF9621', data: '#1A73E8', ok: '#4CAF50', crit: '#E2503F', border: '#2E3941', textMuted: '#8C99A3', surface: '#1B2126' };

const LABEL_GRANULARIDADE: Record<GranularidadeGrafico, string> = {
  diaria: 'por dia',
  semanal: 'por semana',
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
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#E7EBEE' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line yAxisId="fogos" type="monotone" dataKey="totalFogos" name="Fogos" stroke={CORES.accent} strokeWidth={2} dot={{ r: 3, fill: CORES.accent }} />
                <Line yAxisId="kg" type="monotone" dataKey="kgAplicado" name="Kg aplicado" stroke={CORES.data} strokeWidth={2} dot={{ r: 3, fill: CORES.data }} />
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
                  />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#E7EBEE' }} />
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
                  />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#E7EBEE' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
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
