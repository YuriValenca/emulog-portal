'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import type { FogoPorSemana } from '@/hooks/useDashboardStats';
import styles from './DashboardCharts.module.scss';

interface DashboardChartsProps {
  fogosPorSemana: FogoPorSemana[];
  licencasAtivas: number;
  licencasExpirando: number;
  licencasDisponiveis: number;
}

const CORES = { accent: '#FF9621', data: '#1A73E8', ok: '#4CAF50', border: '#2E3941', textMuted: '#8C99A3', surface: '#1B2126' };

export function DashboardCharts({ fogosPorSemana, licencasAtivas, licencasExpirando, licencasDisponiveis }: DashboardChartsProps) {
  const licencasData = [
    { nome: 'Ativas', valor: licencasAtivas, cor: CORES.ok },
    { nome: 'Expirando', valor: licencasExpirando, cor: CORES.accent },
    { nome: 'Disponíveis', valor: licencasDisponiveis, cor: CORES.data },
  ].filter((item) => item.valor > 0);

  const tooltipStyle = { background: CORES.surface, border: `1px solid ${CORES.border}`, borderRadius: 8 };

  return (
    <div className={styles.row}>
      <div className={styles.panel}>
        <span className={styles.title}>Fogos por semana</span>
        <div className={styles.chartBox}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={fogosPorSemana}>
              <CartesianGrid stroke={CORES.border} vertical={false} />
              <XAxis dataKey="semana" stroke={CORES.textMuted} fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke={CORES.textMuted} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#E7EBEE' }} />
              <Line type="monotone" dataKey="total" stroke={CORES.accent} strokeWidth={2} dot={{ r: 3, fill: CORES.accent }} />
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
                <Pie data={licencasData} dataKey="valor" nameKey="nome" innerRadius="60%" outerRadius="85%" paddingAngle={2}>
                  {licencasData.map((item) => (
                    <Cell key={item.nome} fill={item.cor} />
                  ))}
                </Pie>
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
  );
}
