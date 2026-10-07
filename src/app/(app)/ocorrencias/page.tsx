'use client';

import { useMemo, useState } from 'react';
import { Pagination } from '@/components/ui/Pagination/Pagination';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '@/hooks/fogos/useProjetos';
import { Plus, Settings, Trash2 } from 'lucide-react';
import { useAppAuth } from '@/hooks/useAppAuth';
import { useCompanyGroup } from '@/hooks/fogos/useCompanyGroup';
import { useOcorrencias } from '@/hooks/ocorrencias/useOcorrencias';
import { useRegrasDeteccao } from '@/hooks/ocorrencias/useRegrasDeteccao';
import { Button } from '@/components/ui/Button/Button';
import { Select } from '@/components/ui/Select/Select';
import { Table } from '@/components/ui/Table/Table';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Textarea } from '@/components/ui/Textarea/Textarea';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { StatusPill } from '@/components/ui/StatusPill/StatusPill';
import { ActionsMenu } from '@/components/ui/ActionsMenu/ActionsMenu';
import { useToast } from '@/components/ui/Toast/Toast';
import CriarAutomacaoModal, { type CriarAutomacaoValues } from './components/CriarAutomacaoModal/CriarAutomacaoModal';
import ConfigurarAutomacoesModal from './components/ConfigurarAutomacoesModal/ConfigurarAutomacoesModal';
import ConfirmarRemocaoAutomacaoModal from './components/ConfirmarRemocaoAutomacaoModal/ConfirmarRemocaoAutomacaoModal';
import ConfirmarRemocaoFinalModal from './components/ConfirmarRemocaoFinalModal/ConfirmarRemocaoFinalModal';
import ConfirmModal from '@/components/layout/ConfirmModal/ConfirmModal';
import type { Ocorrencia, OcorrenciaStatus, OcorrenciaTipo } from '@/types';
import type { RegraDeteccao } from '@/schemas/regraDeteccao';
import styles from './page.module.scss';

const TIPO_OPTIONS: { value: OcorrenciaTipo; label: string }[] = [
  { value: 'densidade_fora_da_faixa', label: 'Densidade fora da faixa' },
  { value: 'diferenca_kg_excedente', label: 'Diferença de Kg excedente' },
  { value: 'rascunho_parado', label: 'Rascunho parado' },
  { value: 'documentacao_pendente', label: 'Documentação pendente' },
  { value: 'equipamento', label: 'Equipamento' },
  { value: 'licenca', label: 'Licença' },
  { value: 'manual', label: 'Manual' },
];

const STATUS_OPTIONS: { value: OcorrenciaStatus; label: string }[] = [
  { value: 'aberta', label: 'Aberta' },
  { value: 'em_acompanhamento', label: 'Em acompanhamento' },
  { value: 'encerrada', label: 'Encerrada' },
];

const TIPO_TONE_MAP: Partial<Record<OcorrenciaTipo, 'ok' | 'warn' | 'crit' | 'data' | 'neutral'>> = {
  densidade_fora_da_faixa: 'crit',
  diferenca_kg_excedente: 'crit',
  rascunho_parado: 'warn',
  documentacao_pendente: 'warn',
  equipamento: 'warn',
  manual: 'neutral',
};

function tipoLabel(o: Ocorrencia) {
  if (o.tipo === 'manual') return o.tituloManual || 'Manual';
  return TIPO_OPTIONS.find((option) => option.value === o.tipo)?.label ?? o.tipo;
}

function tipoTone(o: Ocorrencia): 'ok' | 'warn' | 'crit' | 'data' | 'neutral' {
  if (o.tipo === 'licenca') return o.motivo === 'expirada' ? 'crit' : 'warn';
  return TIPO_TONE_MAP[o.tipo] ?? 'neutral';
}

function categoriaOcorrencia(o: Ocorrencia): 'fogo' | 'geral' {
  return o.projetoId ? 'fogo' : 'geral';
}

function CategoriaTag({ categoria }: { categoria: 'fogo' | 'geral' }) {
  return (
    <span className={categoria === 'fogo' ? `${styles.tagPill} ${styles.tagFogo}` : `${styles.tagPill} ${styles.tagGeral}`}>
      {categoria === 'fogo' ? 'Fogo' : 'Geral'}
    </span>
  );
}

const OPCOES_POR_PAGINA = PAGE_SIZE_OPTIONS.map((n) => ({ value: String(n), label: `${n} por página` }));

type EtapaExclusao = 'aviso' | 'confirmacao' | null;

export default function OcorrenciasPage() {
  const { companyId, appUser, isSuperadmin } = useAppAuth();
  const { toast } = useToast();
  const { companyIds } = useCompanyGroup(companyId);
  const { ocorrencias, isLoading, isError, criarOcorrencia, isCriando, atualizarStatus, excluirOcorrencia, isExcluindo } = useOcorrencias(companyIds);
  const {
    regras, criarRegra, isCriando: isCriandoRegra,
    contarOcorrenciasDaRegra, excluirRegra, isExcluindo: isExcluindoRegra,
  } = useRegrasDeteccao(companyId);

  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(DEFAULT_PAGE_SIZE);

  const [modalOpen, setModalOpen] = useState(false);
  const [tituloManual, setTituloManual] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valorReferencia, setValorReferencia] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const [automacaoModalOpen, setAutomacaoModalOpen] = useState(false);
  const [configurarModalOpen, setConfigurarModalOpen] = useState(false);

  const [regraParaExcluir, setRegraParaExcluir] = useState<RegraDeteccao | null>(null);
  const [etapaExclusao, setEtapaExclusao] = useState<EtapaExclusao>(null);
  const [quantidadeOcorrencias, setQuantidadeOcorrencias] = useState<number | null>(null);
  const [carregandoQuantidade, setCarregandoQuantidade] = useState(false);

  const [ocorrenciaParaExcluir, setOcorrenciaParaExcluir] = useState<Ocorrencia | null>(null);

  const ocorrenciasFiltradas = useMemo(() => {
    return ocorrencias.filter((o) => {
      const passaStatus = filtroStatus ? o.status === filtroStatus : true;
      const passaTipo = filtroTipo ? o.tipo === filtroTipo : true;
      return passaStatus && passaTipo;
    });
  }, [ocorrencias, filtroStatus, filtroTipo]);

  const totalPaginas = Math.max(1, Math.ceil(ocorrenciasFiltradas.length / porPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const ocorrenciasDaPagina = ocorrenciasFiltradas.slice(
    (paginaAtual - 1) * porPagina,
    paginaAtual * porPagina
  );
  const totalEncontradas = ocorrenciasFiltradas.length;

  const mudarFiltroStatus = (valor: string) => {
    setFiltroStatus(valor);
    setPagina(1);
  };

  const mudarFiltroTipo = (valor: string) => {
    setFiltroTipo(valor);
    setPagina(1);
  };

  const mudarPorPagina = (valor: string) => {
    setPorPagina(Number(valor));
    setPagina(1);
  };

  const abrirCriacao = () => {
    setTituloManual('');
    setDescricao('');
    setValorReferencia('');
    setErro(null);
    setModalOpen(true);
  };

  const fecharModal = () => {
    setModalOpen(false);
    setErro(null);
  };

  const handleSalvar = async () => {
    if (!companyId || !appUser) return;
    if (!tituloManual.trim()) {
      setErro('Dê um título curto pra ocorrência.');
      return;
    }
    if (!descricao.trim()) {
      setErro('Descreva a ocorrência.');
      return;
    }
    const valor = valorReferencia.trim() ? parseFloat(valorReferencia.replace(',', '.')) : null;
    try {
      await criarOcorrencia({
        companyId,
        responsavelUid: appUser.uid,
        tituloManual: tituloManual.trim(),
        descricao: descricao.trim(),
        valorReferencia: valor !== null && !isNaN(valor) ? valor : null,
        projetoId: null,
      });
      fecharModal();
    } catch {
      setErro('Não foi possível registrar a ocorrência. Tente novamente.');
    }
  };

  const handleCriarAutomacao = async (values: CriarAutomacaoValues) => {
    if (!companyId) return;
    await criarRegra({ companyId, ...values });
  };

  const resetarFluxoExclusao = () => {
    setEtapaExclusao(null);
    setRegraParaExcluir(null);
    setQuantidadeOcorrencias(null);
    setCarregandoQuantidade(false);
  };

  const handleSolicitarExclusao = async (regra: RegraDeteccao) => {
    setConfigurarModalOpen(false);
    setRegraParaExcluir(regra);
    setEtapaExclusao('aviso');
    setCarregandoQuantidade(true);
    setQuantidadeOcorrencias(null);
    const quantidade = await contarOcorrenciasDaRegra(regra);
    setQuantidadeOcorrencias(quantidade);
    setCarregandoQuantidade(false);
  };

  const handleProsseguirExclusao = () => {
    setEtapaExclusao('confirmacao');
  };

  const handleConfirmarExclusaoFinal = async () => {
    if (!regraParaExcluir || !companyId) return;
    await excluirRegra(regraParaExcluir);
    resetarFluxoExclusao();
  };

  const handleSolicitarExclusaoOcorrencia = (ocorrencia: Ocorrencia) => {
    setOcorrenciaParaExcluir(ocorrencia);
  };

  const cancelarExclusaoOcorrencia = () => {
    setOcorrenciaParaExcluir(null);
  };

  const confirmarExclusaoOcorrencia = async () => {
    if (!ocorrenciaParaExcluir) return;
    try {
      await excluirOcorrencia(ocorrenciaParaExcluir.id);
      setOcorrenciaParaExcluir(null);
    } catch {
      toast({
        title: 'Não foi possível apagar',
        description: 'A ocorrência continua na lista. Tente novamente.',
      });
    }
  };

  if (isSuperadmin && !companyId) {
    return (
      <div className={styles.container}>
        <p className={styles.empty}>Selecione uma empresa no topo da página para ver as ocorrências.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        {regras.length > 0 && (
          <Button variant="ghost" icon={<Settings size={16} />} onClick={() => setConfigurarModalOpen(true)}>
            Configurar automações
          </Button>
        )}
        <Button variant="ghost" icon={<Settings size={16} />} onClick={() => setAutomacaoModalOpen(true)}>
          Nova automação
        </Button>
        <Button variant="accent" icon={<Plus size={16} />} onClick={abrirCriacao}>
          Nova ocorrência
        </Button>
      </div>

      <div className={styles.filtros}>
        <Select
          value={filtroStatus}
          onValueChange={mudarFiltroStatus}
          options={STATUS_OPTIONS}
          resetOption="Todos os status"
          label='Status'
          placeholder="Status"
          size="sm"
          width={250}
        />
        <Select
          value={filtroTipo}
          onValueChange={mudarFiltroTipo}
          options={TIPO_OPTIONS}
          resetOption="Todos os tipos"
          label='Tipos de ocorrência'
          placeholder="Tipo"
          size="sm"
          width={250}
        />
        <Select
          value={String(porPagina)}
          onValueChange={mudarPorPagina}
          label='Ocorrências por página'
          options={OPCOES_POR_PAGINA}
          size="sm"
          width={250}
        />
        <span className={styles.resumo}>
          {totalEncontradas} {totalEncontradas === 1 ? 'ocorrência encontrada' : 'ocorrências encontradas'}
        </span>
      </div>

      {isError ? (
        <p className={styles.error}>Não foi possível carregar as ocorrências.</p>
      ) : isLoading ? (
        <div className={styles.loadingRow}>
          <Spinner />
        </div>
      ) : (
        <>
          <Table columns={['110px', '200px', '100px', '1fr', '140px', '190px', '56px']}>
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Tipo</th>
                <th>Origem</th>
                <th>Descrição</th>
                <th>Aberta em</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {ocorrenciasDaPagina.map((o) => (
                <tr key={o.id}>
                  <td>
                    <CategoriaTag categoria={categoriaOcorrencia(o)} />
                  </td>
                  <td>
                    <StatusPill label={tipoLabel(o)} tone={tipoTone(o)} />
                  </td>
                  <td>{o.origem === 'manual' ? 'Manual' : 'Automática'}</td>
                  <td>{o.descricao || '—'}</td>
                  <td>{o.criadoEm.toDate().toLocaleDateString('pt-BR')}</td>
                  <td>
                    <Select
                      value={o.status}
                      onValueChange={(value) => atualizarStatus({ id: o.id, status: value as OcorrenciaStatus })}
                      options={STATUS_OPTIONS}
                      size="sm"
                    />
                  </td>
                  <td>
                    <ActionsMenu
                      ariaLabel={`Ações para ${tipoLabel(o)}`}
                      items={[
                        {
                          key: 'apagar',
                          label: 'Apagar',
                          icon: <Trash2 size={14} />,
                          variant: 'danger',
                          onClick: () => handleSolicitarExclusaoOcorrencia(o),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          {totalEncontradas === 0 && <p className={styles.empty}>Nenhuma ocorrência encontrada.</p>}

          <Pagination page={paginaAtual} totalPages={totalPaginas} onPageChange={setPagina} />
        </>
      )}

      <Modal open={modalOpen} onOpenChange={fecharModal} title="Nova ocorrência">
        <div className={styles.form}>
          <Input
            id="ocorrencia-titulo"
            label="Título"
            placeholder="Ex: Capacete não utilizado"
            value={tituloManual}
            onChange={(e) => setTituloManual(e.target.value)}
            maxLength={80}
            showCharCount
            disabled={isCriando}
          />
          <Textarea
            id="ocorrencia-descricao"
            label="Descrição"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            maxLength={500}
            showCharCount
            disabled={isCriando}
          />
          <Input
            id="ocorrencia-valor"
            label="Valor de referência (opcional)"
            placeholder="Ex: 1.15 ou 6.5"
            value={valorReferencia}
            onChange={(e) => setValorReferencia(e.target.value)}
            disabled={isCriando}
          />
          {erro && <p className={styles.formError}>{erro}</p>}
          <Button variant="ok" onClick={handleSalvar} loading={isCriando} disabled={isCriando}>
            Registrar ocorrência
          </Button>
        </div>
      </Modal>

      {automacaoModalOpen && (
        <CriarAutomacaoModal
          open={automacaoModalOpen}
          onOpenChange={setAutomacaoModalOpen}
          onSalvar={handleCriarAutomacao}
          regrasExistentes={regras}
          saving={isCriandoRegra}
        />
      )}

      <ConfigurarAutomacoesModal
        open={configurarModalOpen}
        onOpenChange={setConfigurarModalOpen}
        regras={regras}
        onSolicitarExclusao={handleSolicitarExclusao}
      />

      <ConfirmarRemocaoAutomacaoModal
        open={etapaExclusao === 'aviso'}
        onOpenChange={(open) => {
          if (!open) resetarFluxoExclusao();
        }}
        onProsseguir={handleProsseguirExclusao}
        quantidadeOcorrencias={quantidadeOcorrencias}
        carregandoQuantidade={carregandoQuantidade}
      />

      <ConfirmarRemocaoFinalModal
        open={etapaExclusao === 'confirmacao'}
        onOpenChange={(open) => {
          if (!open) resetarFluxoExclusao();
        }}
        onConfirmar={handleConfirmarExclusaoFinal}
        confirmando={isExcluindoRegra}
      />

      <ConfirmModal
        open={ocorrenciaParaExcluir !== null}
        title="Apagar ocorrência?"
        description={
          ocorrenciaParaExcluir
            ? `Essa ação não pode ser desfeita. "${tipoLabel(ocorrenciaParaExcluir)}" será apagada para sempre.`
            : undefined
        }
        confirmLabel="Apagar"
        cancelLabel="Cancelar"
        tone="danger"
        isConfirming={isExcluindo}
        onConfirm={confirmarExclusaoOcorrencia}
        onCancel={cancelarExclusaoOcorrencia}
      />
    </div>
  );
}
