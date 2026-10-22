'use client';

import { Eye, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { StatusPill } from '@/components/ui/StatusPill/StatusPill';
import { ActionsMenu } from '@/components/ui/ActionsMenu/ActionsMenu';
import { diffPercent, densidadeInicialFinalMedia, conclusaoEmOutroDia, formatarKg } from '@/lib/fogoUtils';
import { statusConformidade, type ContextoFaixa } from '@/lib/densidade';
import type { RegraDeteccao } from '@/schemas/regraDeteccao';
import type { Projeto } from '@/types';
import { PillDiferenca } from '../PillDiferenca/PillDiferenca';
import styles from './FogosTable.module.scss';

interface FogosTableProps {
  projetos: Projeto[];
  contextoFaixa: ContextoFaixa;
  regras: RegraDeteccao[];
  onSelect: (projeto: Projeto) => void;
  onDelete: (projeto: Projeto) => void;
}

export default function FogosTable({ projetos, contextoFaixa, regras, onSelect, onDelete }: FogosTableProps) {
  return (
    <div className={styles.rolagem}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Fogo</th>
            <th>Data</th>
            <th>Cliente</th>
            <th>Produto</th>
            <th>UMB</th>
            <th>Kg prev.</th>
            <th>Kg apl.</th>
            <th>Dif.</th>
            <th>Dens. final</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {projetos.map((projeto) => {
            const info = projeto.informacoesOperacao;
            const dif = info ? diffPercent(info.kgPrevisto, info.kgAplicado) : null;
            const { final } = densidadeInicialFinalMedia(projeto);
            const status = statusConformidade(projeto, contextoFaixa);
            const statusLabel = status === 'ok' ? 'Conforme' : status === 'crit' ? 'Alerta' : '—';
            const conclusao = conclusaoEmOutroDia(projeto);

            return (
              <tr key={projeto.id} className={styles.row} onClick={() => onSelect(projeto)}>
                <td>{projeto.nomeProjeto}</td>
                <td className={styles.secundario}>
                  {projeto.dataCriacao.toDate().toLocaleDateString('pt-BR')}
                  {conclusao && (
                    <span className={styles.dataConclusao}>
                      concluído {conclusao.toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </td>
                <td>{projeto.cliente?.nome ?? '—'}</td>
                <td className={styles.secundario}>{info?.produto?.nome ?? '—'}</td>
                <td className={styles.secundario}>{info?.caminhao?.placa ?? '—'}</td>
                <td className={clsx(styles.numero, styles.secundario)}>{formatarKg(info?.kgPrevisto)}</td>
                <td className={styles.numero}>{formatarKg(info?.kgAplicado)}</td>
                <td>
                  <PillDiferenca dif={dif} regras={regras} />
                </td>
                <td className={clsx(styles.numero, status === 'crit' && styles.critico)}>
                  {final !== null ? final.toFixed(2) : '—'}
                </td>
                <td>
                  <StatusPill label={statusLabel} tone={status} />
                </td>
                <td>
                  <ActionsMenu
                    ariaLabel={`Ações para ${projeto.nomeProjeto}`}
                    items={[
                      {
                        key: 'ver',
                        label: 'Ver',
                        icon: <Eye size={16} />,
                        onClick: () => onSelect(projeto),
                      },
                      {
                        key: 'apagar',
                        label: 'Apagar',
                        icon: <Trash2 size={16} />,
                        variant: 'danger',
                        onClick: () => onDelete(projeto),
                      },
                    ]}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
