'use client';

import { Eye } from 'lucide-react';
import { StatusPill } from '@/components/ui/StatusPill/StatusPill';
import { ActionsMenu } from '@/components/ui/ActionsMenu/ActionsMenu';
import { diffPercent, densidadeInicialFinalMedia, statusConformidade } from '@/lib/fogoUtils';
import type { ProjetoRascunho } from '@/schemas/projetoRascunho';
import type { Produto } from '@/types';
import styles from './RascunhosTable.module.scss';

const MS_DIA = 24 * 60 * 60 * 1000;

interface RascunhosTableProps {
  rascunhos: ProjetoRascunho[];
  produtosById: Map<string, Produto>;
  nomePorUid: Map<string, string>;
  agora: Date;
  onSelect: (rascunho: ProjetoRascunho) => void;
}

function rotuloDias(data: Date, agora: Date): string {
  const dias = Math.floor((agora.getTime() - data.getTime()) / MS_DIA);
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'há 1 dia';
  return `há ${dias} dias`;
}

export default function RascunhosTable({ rascunhos, produtosById, nomePorUid, agora, onSelect }: RascunhosTableProps) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Fogo</th>
          <th>Responsável</th>
          <th>Iniciado</th>
          <th>Atualizado</th>
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
        {rascunhos.map((rascunho) => {
          const info = rascunho.informacoesOperacao;
          const dif = diffPercent(info?.kgPrevisto ?? '', info?.kgAplicado ?? '');
          const { inicial, final } = densidadeInicialFinalMedia(rascunho);
          const status = statusConformidade(rascunho, produtosById);
          const statusLabel = status === 'ok' ? 'Conforme' : status === 'crit' ? 'Alerta' : '—';
          const atualizacao = rascunho.dataAtualizacao.toDate();

          return (
            <tr key={rascunho.id} className={styles.row} onClick={() => onSelect(rascunho)}>
              <td>{rascunho.nomeProjeto || 'Sem nome'}</td>
              <td className={styles.dono}>{nomePorUid.get(rascunho.uidUsuario) ?? rascunho.uidUsuario}</td>
              <td>{rascunho.dataCriacao.toDate().toLocaleDateString('pt-BR')}</td>
              <td>
                {atualizacao.toLocaleDateString('pt-BR')}
                <span className={styles.desdeAtualizacao}>{rotuloDias(atualizacao, agora)}</span>
              </td>
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
  );
}
