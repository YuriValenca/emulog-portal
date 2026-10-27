'use client';

import clsx from 'clsx';
import { ArrowUpRight, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal/Modal';
import { Button } from '@/components/ui/Button/Button';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { useProjeto } from '@/hooks/fogos/useProjetos';
import { useContextoFaixa } from '@/hooks/useContextoFaixa';
import { condicaoDaRegra, criterioDiferencaKg } from '@/lib/avaliarRegra';
import { faixaDoProjeto } from '@/lib/densidade';
import type { Projeto } from '@/schemas/projeto';
import type { RegraDeteccao } from '@/schemas/regraDeteccao';
import type { Ocorrencia, OcorrenciaStatus } from '@/types';
import { STATUS_OPTIONS, tipoLabel } from '../../opcoes';
import { SecaoDensidade } from './SecaoDensidade';
import { SecaoDiferencaKg } from './SecaoDiferencaKg';
import styles from './DetalheOcorrenciaModal.module.scss';

const LARGURA_MODAL = 760;

interface DetalheOcorrenciaModalProps {
  ocorrencia: Ocorrencia | null;
  regras: RegraDeteccao[];
  onClose: () => void;
  onMudarStatus: (ocorrencia: Ocorrencia, status: OcorrenciaStatus) => void;
  onApagar: (ocorrencia: Ocorrencia) => void;
  onAbrirFogo: (projeto: Projeto) => void;
}

function criterioDaOcorrencia(ocorrencia: Ocorrencia, regras: RegraDeteccao[]): string {
  const regra = regras.find((r) => r.id === ocorrencia.regraId);
  return regra ? `Regra da empresa: ${condicaoDaRegra(regra)}` : criterioDiferencaKg(regras);
}

function SeletorDeStatus({ status, onMudar }: { status: OcorrenciaStatus; onMudar: (status: OcorrenciaStatus) => void }) {
  return (
    <div className={styles.seletorStatus} role="group" aria-label="Status da ocorrência">
      {STATUS_OPTIONS.map((opcao) => (
        <button
          key={opcao.value}
          type="button"
          aria-pressed={status === opcao.value}
          className={clsx(styles.opcaoStatus, status === opcao.value && styles.opcaoStatusAtiva)}
          onClick={() => status !== opcao.value && onMudar(opcao.value)}
        >
          {opcao.label}
        </button>
      ))}
    </div>
  );
}

function Contexto({ projeto }: { projeto: Projeto }) {
  const info = projeto.informacoesOperacao;
  const campos = [
    { rotulo: 'Data do fogo', valor: projeto.dataCriacao.toDate().toLocaleDateString('pt-BR') },
    { rotulo: 'Cliente', valor: projeto.cliente?.nome },
    { rotulo: 'UMB', valor: info?.caminhao?.placa },
    { rotulo: 'Equipe', valor: info?.equipe.map((membro) => membro.nome).join(', ') },
    ...(info?.produto?.nome ? [{ rotulo: 'Produto', valor: info.produto.nome }] : []),
  ];

  return (
    <dl className={styles.contexto}>
      {campos.map(({ rotulo, valor }) => (
        <div key={rotulo}>
          <dt>{rotulo}</dt>
          <dd>{valor || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

function ConteudoDoFogo({ ocorrencia, regras }: { ocorrencia: Ocorrencia; regras: RegraDeteccao[] }) {
  const { data: projeto, isLoading, isError } = useProjeto(ocorrencia.projetoId);
  const contextoFaixa = useContextoFaixa(projeto?.companyId ?? null);

  if (isLoading) {
    return (
      <div className={styles.carregando}>
        <Spinner />
      </div>
    );
  }
  if (isError) return <p className={styles.aviso}>Não foi possível carregar o fogo desta ocorrência.</p>;
  if (!projeto) return <p className={styles.aviso}>O fogo desta ocorrência não existe mais.</p>;

  // TODO: mostrar a nota do fogo aqui quando o campo existir, só se vier preenchida
  return (
    <>
      <Contexto projeto={projeto} />
      {ocorrencia.tipo === 'densidade_fora_da_faixa' ? (
        <SecaoDensidade projeto={projeto} faixa={faixaDoProjeto(projeto, contextoFaixa)} />
      ) : (
        <SecaoDiferencaKg projeto={projeto} criterio={criterioDaOcorrencia(ocorrencia, regras)} />
      )}
    </>
  );
}

function Rodape({ ocorrencia, onApagar, onAbrirFogo }: { ocorrencia: Ocorrencia; onApagar: () => void; onAbrirFogo: (projeto: Projeto) => void }) {
  const { data: projeto } = useProjeto(ocorrencia.projetoId);
  return (
    <div className={styles.rodape}>
      <Button variant="ghost" icon={<Trash2 size={16} />} className={styles.botaoApagar} onClick={onApagar}>
        Apagar
      </Button>
      <Button
        variant="ghost"
        icon={<ArrowUpRight size={16} />}
        iconPosition="right"
        disabled={!projeto}
        onClick={() => projeto && onAbrirFogo(projeto)}
      >
        Abrir o fogo
      </Button>
    </div>
  );
}

function origemEAbertura(ocorrencia: Ocorrencia): string {
  const origem = ocorrencia.origem === 'manual' ? 'Manual' : 'Automática';
  const aberta = ocorrencia.criadoEm.toDate();
  return `${origem} · aberta em ${aberta.toLocaleDateString('pt-BR')} às ${aberta.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

export default function DetalheOcorrenciaModal({
  ocorrencia, regras, onClose, onMudarStatus, onApagar, onAbrirFogo,
}: DetalheOcorrenciaModalProps) {
  if (!ocorrencia) return null;

  return (
    <Modal
      open={!!ocorrencia}
      onOpenChange={(aberto) => !aberto && onClose()}
      title={tipoLabel(ocorrencia)}
      description={ocorrencia.descricao ?? undefined}
      width={LARGURA_MODAL}
      footer={<Rodape ocorrencia={ocorrencia} onApagar={() => onApagar(ocorrencia)} onAbrirFogo={onAbrirFogo} />}
    >
      <div className={styles.corpo}>
        <div className={styles.cabecalho}>
          <span className={styles.legenda}>{origemEAbertura(ocorrencia)}</span>
          <SeletorDeStatus status={ocorrencia.status} onMudar={(status) => onMudarStatus(ocorrencia, status)} />
        </div>
        <ConteudoDoFogo ocorrencia={ocorrencia} regras={regras} />
      </div>
    </Modal>
  );
}
