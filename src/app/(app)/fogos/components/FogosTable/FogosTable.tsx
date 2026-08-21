'use client';

import { ChevronRight } from 'lucide-react';
import { StatusPill } from '@/components/ui/StatusPill/StatusPill';
import { diffPercent, densidadeInicialFinalMedia, statusConformidade } from '@/lib/fogoUtils';
import type { Projeto, Produto } from '@/types';
import styles from './FogosTable.module.scss';

interface FogosTableProps {
  projetos: Projeto[];
  produtosById: Map<string, Produto>;
  onSelect: (projeto: Projeto) => void;
}

export default function FogosTable({ projetos, produtosById, onSelect }: FogosTableProps) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Fogo</th>
          <th>Data</th>
          <th>Produto</th>
          <th>UMB</th>
          <th>Kg prev.</th>
          <th>Kg apl.</th>
          <th>Dif.</th>
          <th>Dens. inicial</th>
          <th>Dens. final</th>
          <th>Status</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {projetos.map((projeto) => {
          const info = projeto.informacoesOperacao;
          const dif = info ? diffPercent(info.kgPrevisto, info.kgAplicado) : null;
          const { inicial, final } = densidadeInicialFinalMedia(projeto);
          const status = statusConformidade(projeto, produtosById);
          const statusLabel = status === 'ok' ? 'Conforme' : status === 'crit' ? 'Alerta' : '—';

          return (
            <tr key={projeto.id} className={styles.row} onClick={() => onSelect(projeto)}>
              <td>{projeto.nomeProjeto}</td>
              <td>{projeto.dataCriacao.toDate().toLocaleDateString('pt-BR')}</td>
              <td>{info?.produto?.nome ?? '—'}</td>
              <td>{info?.caminhao?.placa ?? '—'}</td>
              <td>{info?.kgPrevisto || '—'}</td>
              <td>{info?.kgAplicado || '—'}</td>
              <td>{dif !== null ? `${dif.toFixed(1)}%` : '—'}</td>
              <td>{inicial !== null ? inicial.toFixed(2) : '—'}</td>
              <td>{final !== null ? final.toFixed(2) : '—'}</td>
              <td>
                <StatusPill label={statusLabel} tone={status} />
              </td>
              <td>
                <ChevronRight size={16} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
