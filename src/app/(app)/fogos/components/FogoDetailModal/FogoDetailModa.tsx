'use client';

import { Modal } from '@/components/ui/Modal/Modal';
import { diffPercent, densidadeInicialFinalMedia, densidadesAmostra } from '@/lib/fogoUtils';
import type { Projeto } from '@/types';
import styles from './FogoDetailModal.module.scss';
import { Table } from '@/components/ui/Table/Table';

interface FogoDetailModalProps {
  projeto: Projeto | null;
  onClose: () => void;
}

export default function FogoDetailModal({ projeto, onClose }: FogoDetailModalProps) {
  if (!projeto) return null;
  const info = projeto.informacoesOperacao;
  const dif = info ? diffPercent(info.kgPrevisto, info.kgAplicado) : null;
  const { inicial, final } = densidadeInicialFinalMedia(projeto);

  return (
    <Modal
      open={!!projeto}
      onOpenChange={(open) => !open && onClose()}
      title={projeto.nomeProjeto}
      description={projeto.dataCriacao.toDate().toLocaleDateString('pt-BR')}
      width={450}
    >
      <div className={styles.grid}>
        <div className={styles.box}>
          <span className={styles.label}>Kg previsto / aplicado</span>
          <span className={styles.mono}>{info?.kgPrevisto || '—'} / {info?.kgAplicado || '—'} kg</span>
        </div>
        <div className={styles.box}>
          <span className={styles.label}>Diferença</span>
          <span className={styles.mono}>{dif !== null ? `${dif.toFixed(1)}%` : '—'}</span>
        </div>
        <div className={styles.box}>
          <span className={styles.label}>Unidade de bombeamento</span>
          <span>{info?.caminhao?.placa ?? '—'}</span>
        </div>
        <div className={styles.box}>
          <span className={styles.label}>Produto</span>
          <span>{info?.produto?.nome ?? '—'}</span>
        </div>
        <div className={styles.box}>
          <span className={styles.label}>Densidade inicial média</span>
          <span className={styles.mono}>{inicial !== null ? `${inicial.toFixed(2)} g/cm³` : '—'}</span>
        </div>
        <div className={styles.box}>
          <span className={styles.label}>Densidade final média</span>
          <span className={styles.mono}>{final !== null ? `${final.toFixed(2)} g/cm³` : '—'}</span>
        </div>
        <div className={styles.box}>
          <span className={styles.label}>Equipe</span>
          <span>{info?.equipe?.map((m) => m.nome).join(', ') || '—'}</span>
        </div>
      </div>

      {info?.informacoesGerais && (
        <div className={styles.observacao}>
          <span className={styles.label}>Observações</span>
          <p>{info.informacoesGerais}</p>
        </div>
      )}

      <div className={styles.section}>
        <span className={styles.sectionTitle}>Amostras — {projeto.quantidadeAmostras}</span>
        {projeto.amostras.map((amostra, index) => {
          const amostraId = 'amostraId' in amostra ? amostra.amostraId : index;
          const isLegado = 'pesagens' in amostra && Array.isArray(amostra.pesagens) && amostra.pesagens.length > 0;

          if (isLegado) {
            const pesagens = amostra.pesagens!.filter((p) => p.peso !== '');
            return (
              <div key={index} className={styles.amostraBox}>
                <span className={styles.amostraTitulo}>Amostra {(amostraId ? amostraId + 1 : '')}</span>
                <div className={styles.pesagensTable}>
                  <Table columns={['10%', '30%', '30%', '30%']}>
                    <thead>
                      <tr>
                        <th>Pesagem</th>
                        <th>Peso</th>
                        <th>Densidade</th>
                        <th>Horário</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pesagens.map((p, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td>{p.peso} g</td>
                          <td>{p.densidade ? `${p.densidade} g/cm³` : '—'}</td>
                          <td>{p.timestamp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </div>
            );
          }

          const { inicial: amostraInicial, final: amostraFinal } = densidadesAmostra(amostra);
          return (
            <div key={index} className={styles.amostraBox}>
              <span className={styles.amostraTitulo}>Amostra {(amostraId ? amostraId + 1 : '')}</span>
              <div className={styles.densidadeRow}>
                <span className={styles.densidadeLabel}>Inicial</span>
                <span className={styles.densidadeValue}>{amostraInicial !== null ? `${amostraInicial.toFixed(2)} g/cm³` : '—'}</span>
                <span className={styles.densidadeLabel}>Final</span>
                <span className={styles.densidadeValue}>{amostraFinal !== null ? `${amostraFinal.toFixed(2)} g/cm³` : '—'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
