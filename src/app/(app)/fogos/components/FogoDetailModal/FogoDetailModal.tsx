'use client';

import type { ReactNode } from 'react';
import clsx from 'clsx';
import { Modal } from '@/components/ui/Modal/Modal';
import { Tabs } from '@/components/ui/Tabs/Tabs';
import { Table } from '@/components/ui/Table/Table';
import { diffPercent, densidadeInicialFinalMedia, densidadesAmostra, conclusaoEmOutroDia, formatarKg } from '@/lib/fogoUtils';
import { isAmostraGrupo, valorVazio, horaDaPesagem } from '@/lib/amostras';
import { situacaoCalibragem, type SituacaoCalibragem } from '@/lib/calibragem';
import { faixaDoProjeto } from '@/lib/densidade';
import { useContextoFaixa } from '@/hooks/useContextoFaixa';
import type { AmostraItem, FogoDetalhavel } from '@/schemas/projeto';
import { SecaoFuros } from './SecaoFuros';
import { GaleriaFotos } from './GaleriaFotos';
import styles from './FogoDetailModal.module.scss';

const LARGURA_MODAL = 720;

const TEXTO_CALIBRAGEM: Record<SituacaoCalibragem, string> = {
  em_dia: 'Em dia',
  vencida: 'Vencida (feita há mais de 14h do fogo)',
  sem_registro: 'Não registrada',
};

interface FogoDetailModalProps {
  projeto: FogoDetalhavel | null;
  onClose: () => void;
}

interface CaixaProps {
  rotulo: string;
  children: ReactNode;
  mono?: boolean;
  detalhe?: string;
}

function Caixa({ rotulo, children, mono = false, detalhe }: CaixaProps) {
  return (
    <div className={styles.box}>
      <span className={styles.label}>{rotulo}</span>
      <span className={clsx(mono && styles.mono)}>{children}</span>
      {detalhe && <span className={styles.detalheCaixa}>{detalhe}</span>}
    </div>
  );
}

function descricaoDoFogo(projeto: FogoDetalhavel): string {
  const criacao = projeto.dataCriacao.toDate().toLocaleDateString('pt-BR');
  const conclusao = conclusaoEmOutroDia(projeto);
  const datas = conclusao ? `${criacao} — concluído ${conclusao.toLocaleDateString('pt-BR')}` : criacao;
  return projeto.cliente?.nome ? `${projeto.cliente.nome} · ${datas}` : datas;
}

function CartaoAmostra({ amostra, index }: { amostra: AmostraItem; index: number }) {
  const amostraId = 'amostraId' in amostra && typeof amostra.amostraId === 'number' ? amostra.amostraId : index;

  if (isAmostraGrupo(amostra) && amostra.pesagens.length > 0) {
    const pesagens = amostra.pesagens.filter((p) => !valorVazio(p.peso));
    return (
      <div className={styles.amostraBox}>
        <span className={styles.amostraTitulo}>Amostra {amostraId + 1}</span>
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
                  <td>{horaDaPesagem(p.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </div>
    );
  }

  const { inicial, final } = densidadesAmostra(amostra);
  return (
    <div className={styles.amostraBox}>
      <span className={styles.amostraTitulo}>Amostra {amostraId + 1}</span>
      <div className={styles.densidadeRow}>
        <span className={styles.densidadeLabel}>Inicial</span>
        <span className={styles.densidadeValue}>{inicial !== null ? `${inicial.toFixed(2)} g/cm³` : '—'}</span>
        <span className={styles.densidadeLabel}>Final</span>
        <span className={styles.densidadeValue}>{final !== null ? `${final.toFixed(2)} g/cm³` : '—'}</span>
      </div>
    </div>
  );
}

function AbaAmostras({ projeto }: { projeto: FogoDetalhavel }) {
  const { inicial, final } = densidadeInicialFinalMedia(projeto);
  const amostras = projeto.amostras ?? [];
  const calibragem = situacaoCalibragem(projeto.calibragem, projeto.dataCriacao);
  const contextoFaixa = useContextoFaixa(projeto.companyId);
  const faixa = faixaDoProjeto(projeto, contextoFaixa);

  return (
    <>
      <div className={styles.grid}>
        <Caixa rotulo="Densidade inicial média" mono>{inicial !== null ? `${inicial.toFixed(2)} g/cm³` : '—'}</Caixa>
        <Caixa rotulo="Densidade final média" mono>{final !== null ? `${final.toFixed(2)} g/cm³` : '—'}</Caixa>
        <Caixa rotulo="Faixa de densidade" mono detalhe={`Faixa ${faixa.origem}`}>
          {faixa.min.toFixed(2)} a {faixa.max.toFixed(2)} g/cm³
        </Caixa>
        <Caixa rotulo="Calibragem">
          <span className={clsx(calibragem === 'em_dia' && styles.calibragemEmDia, calibragem === 'vencida' && styles.calibragemVencida)}>
            {TEXTO_CALIBRAGEM[calibragem]}
          </span>
        </Caixa>
      </div>

      <div className={styles.section}>
        <span className={styles.sectionTitle}>Amostras — {projeto.quantidadeAmostras ?? amostras.length}</span>
        {amostras.map((amostra, index) => (
          <CartaoAmostra key={index} amostra={amostra} index={index} />
        ))}
      </div>
    </>
  );
}

function AbaInformacoes({ projeto }: { projeto: FogoDetalhavel }) {
  const info = projeto.informacoesOperacao;
  const dif = info ? diffPercent(info.kgPrevisto, info.kgAplicado) : null;

  return (
    <>
      <div className={styles.grid}>
        <Caixa rotulo="Kg previsto / aplicado" mono>{formatarKg(info?.kgPrevisto)} / {formatarKg(info?.kgAplicado)} kg</Caixa>
        <Caixa rotulo="Diferença" mono>{dif !== null ? `${dif.toFixed(1)}%` : '—'}</Caixa>
        <Caixa rotulo="Unidade de bombeamento">{info?.caminhao?.placa ?? '—'}</Caixa>
        <Caixa rotulo="Produto">{info?.produto?.nome ?? '—'}</Caixa>
        <Caixa rotulo="Equipe">{info?.equipe?.map((m) => m.nome).join(', ') || '—'}</Caixa>
        <Caixa rotulo="Nota fiscal">{info?.numeroNF || '—'}</Caixa>
      </div>

      {info?.informacoesGerais && (
        <div className={styles.observacao}>
          <span className={styles.label}>Observações</span>
          <p>{info.informacoesGerais}</p>
        </div>
      )}

      <GaleriaFotos projetoId={projeto.id} companyId={projeto.companyId} nomeFogo={projeto.nomeProjeto || 'Fogo sem nome'} />
    </>
  );
}

export default function FogoDetailModal({ projeto, onClose }: FogoDetailModalProps) {
  if (!projeto) return null;

  const abas = [
    { value: 'amostras', label: 'Amostras', content: <AbaAmostras projeto={projeto} /> },
    ...(projeto.furos
      ? [{ value: 'furos', label: `Furos (${projeto.furos.itens.length})`, content: <SecaoFuros furos={projeto.furos} /> }]
      : []),
    // As fotos só são buscadas quando esta aba abre: o Radix desmonta o conteúdo das abas inativas
    { value: 'informacoes', label: 'Informações', content: <AbaInformacoes projeto={projeto} /> },
  ];

  return (
    <Modal
      open={!!projeto}
      onOpenChange={(open) => !open && onClose()}
      title={projeto.nomeProjeto || 'Sem nome'}
      description={descricaoDoFogo(projeto)}
      width={LARGURA_MODAL}
    >
      <Tabs items={abas} larguraTotal />
    </Modal>
  );
}
