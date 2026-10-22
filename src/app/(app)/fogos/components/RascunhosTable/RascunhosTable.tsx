'use client';

import { Eye } from 'lucide-react';
import clsx from 'clsx';
import { StatusPill } from '@/components/ui/StatusPill/StatusPill';
import { ActionsMenu } from '@/components/ui/ActionsMenu/ActionsMenu';
import { diffPercent, densidadeInicialFinalMedia, formatarKg } from '@/lib/fogoUtils';
import { statusConformidade, type ContextoFaixa } from '@/lib/densidade';
import type { ProjetoRascunho } from '@/schemas/projetoRascunho';
import type { RegraDeteccao } from '@/schemas/regraDeteccao';
import { PillDiferenca } from '../PillDiferenca/PillDiferenca';
import styles from './RascunhosTable.module.scss';

const MS_DIA = 24 * 60 * 60 * 1000;

interface RascunhosTableProps {
  rascunhos: ProjetoRascunho[];
  contextoFaixa: ContextoFaixa;
  regras: RegraDeteccao[];
  nomePorUid: Map<string, string>;
  agora: Date;
  fotosPorRascunho: Map<string, number>;
  onSelect: (rascunho: ProjetoRascunho) => void;
}

function rotuloDias(data: Date, agora: Date): string {
  const dias = Math.floor((agora.getTime() - data.getTime()) / MS_DIA);
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'há 1 dia';
  return `há ${dias} dias`;
}

export default function RascunhosTable({
  rascunhos, contextoFaixa, regras, nomePorUid, agora, fotosPorRascunho, onSelect,
}: RascunhosTableProps) {
  return (
    <div className={styles.rolagem}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Fogo</th>
            <th>Responsável</th>
            <th>Atualizado</th>
            <th>Cliente</th>
            <th>Produto</th>
            <th>UMB</th>
            <th>Kg prev.</th>
            <th>Kg apl.</th>
            <th>Dif.</th>
            <th>Dens. final</th>
            <th>Furos</th>
            <th>Fotos</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rascunhos.map((rascunho) => {
            const info = rascunho.informacoesOperacao;
            const dif = diffPercent(info?.kgPrevisto, info?.kgAplicado);
            const { final } = densidadeInicialFinalMedia(rascunho);
            const status = statusConformidade(rascunho, contextoFaixa);
            const statusLabel = status === 'ok' ? 'Conforme' : status === 'crit' ? 'Alerta' : '—';
            const atualizacao = rascunho.dataAtualizacao.toDate();

            return (
              <tr key={rascunho.id} className={styles.row} onClick={() => onSelect(rascunho)}>
                <td>{rascunho.nomeProjeto || 'Sem nome'}</td>
                <td className={styles.secundario}>{nomePorUid.get(rascunho.uidUsuario) ?? rascunho.uidUsuario}</td>
                <td className={styles.secundario}>
                  {atualizacao.toLocaleDateString('pt-BR')}
                  <span className={styles.desdeAtualizacao}>{rotuloDias(atualizacao, agora)}</span>
                </td>
                <td>{rascunho.cliente?.nome ?? '—'}</td>
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
                <td className={styles.numero}>{rascunho.furos ? rascunho.furos.itens.length : '—'}</td>
                <td className={styles.numero}>{fotosPorRascunho.get(rascunho.id) ?? '—'}</td>
                <td>
                  <StatusPill label={statusLabel} tone={status} />
                </td>
                <td>
                  <ActionsMenu
                    ariaLabel={`Ações para ${rascunho.nomeProjeto || 'rascunho sem nome'}`}
                    items={[
                      {
                        key: 'ver',
                        label: 'Ver',
                        icon: <Eye size={16} />,
                        onClick: () => onSelect(rascunho),
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
