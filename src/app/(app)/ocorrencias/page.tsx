'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { Input, DATA_MINIMA } from '@/components/ui/Input/Input';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { StatusPill } from '@/components/ui/StatusPill/StatusPill';
import { Textarea } from '@/components/ui/Textarea/Textarea';
import { ActionsMenu } from '@/components/ui/ActionsMenu/ActionsMenu';
import { useToast } from '@/components/ui/Toast/Toast';
import ConfigurarAutomacoesModal from './components/ConfigurarAutomacoesModal/ConfigurarAutomacoesModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal/ConfirmModal';
import { FormModal } from '@/components/layout/FormModal/FormModal';
import type { Ocorrencia, OcorrenciaStatus, OcorrenciaTipo } from '@/types';
import type { RegraDeteccao, RegraMetrica, RegraOperador } from '@/schemas/regraDeteccao';
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

const doisDigitos = (n: number) => String(n).padStart(2, '0');

function dataLocalISO(data: Date): string {
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`;
}

function dentroDoPeriodoDoFogo(o: Ocorrencia, inicio: string, fim: string): boolean {
  if (!inicio && !fim) return true;
  if (!o.dataFogo) return false;
  const data = dataLocalISO(o.dataFogo.toDate());
  return (!inicio || data >= inicio) && (!fim || data <= fim);
}

const OPCOES_POR_PAGINA = PAGE_SIZE_OPTIONS.map((n) => ({ value: String(n), label: `${n} por página` }));

const OPERADOR_OPTIONS: { value: RegraOperador; label: string }[] = [
  { value: 'entre', label: 'Entre' },
  { value: 'maior', label: 'Maior que' },
  { value: 'menor', label: 'Menor que' },
  { value: 'igual', label: 'Igual a' },
];

interface MetricaConfig {
  descricao: string;
  labelValor: string;
  labelDe?: string;
  labelAte?: string;
  operadorFixo?: RegraOperador;
  somenteInteiro?: boolean;
  avisoJaExiste: string;
}

const METRICA_CONFIG: Record<RegraMetrica, MetricaConfig> = {
  diferenca_kg: {
    descricao: 'Gera ocorrência quando a diferença entre Kg previsto e aplicado de um fogo bate a condição.',
    labelValor: 'Valor (%)',
    labelDe: 'De (%)',
    labelAte: 'Até (%)',
    avisoJaExiste: 'Já existe uma automação de diferença de Kg. Remova-a antes de criar outra.',
  },
  rascunho_parado: {
    descricao: 'Gera ocorrência quando um fogo em andamento fica mais de X dias sem atualização.',
    labelValor: 'Dias sem atualização',
    operadorFixo: 'maior',
    somenteInteiro: true,
    avisoJaExiste: 'Já existe uma automação de rascunho parado. Remova-a antes de criar outra.',
  },
};

const METRICA_OPTIONS: { value: RegraMetrica; label: string }[] = [
  { value: 'diferenca_kg', label: 'Diferença de Kg previsto/aplicado' },
  { value: 'rascunho_parado', label: 'Rascunho parado' },
];

function lerNumeroDigitado(texto: string): number | null {
  const numero = parseFloat(texto.replace(',', '.'));
  return isNaN(numero) ? null : numero;
}

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
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(DEFAULT_PAGE_SIZE);

  const [novaOcorrenciaAberta, setNovaOcorrenciaAberta] = useState(false);
  const [tituloManual, setTituloManual] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valorReferencia, setValorReferencia] = useState('');
  const [erroOcorrencia, setErroOcorrencia] = useState<string | null>(null);

  const [novaAutomacaoAberta, setNovaAutomacaoAberta] = useState(false);
  const [metrica, setMetrica] = useState<RegraMetrica>('diferenca_kg');
  const [operadorEscolhido, setOperadorEscolhido] = useState<RegraOperador>('maior');
  const [valor1, setValor1] = useState('');
  const [valor2, setValor2] = useState('');
  const [erroAutomacao, setErroAutomacao] = useState<string | null>(null);
  const [configurarModalOpen, setConfigurarModalOpen] = useState(false);

  const [regraParaExcluir, setRegraParaExcluir] = useState<RegraDeteccao | null>(null);

  const [ocorrenciaParaExcluir, setOcorrenciaParaExcluir] = useState<Ocorrencia | null>(null);

  const ocorrenciasFiltradas = useMemo(() => {
    return ocorrencias.filter((o) => {
      const passaStatus = filtroStatus ? o.status === filtroStatus : true;
      const passaTipo = filtroTipo ? o.tipo === filtroTipo : true;
      return passaStatus && passaTipo && dentroDoPeriodoDoFogo(o, filtroDataInicio, filtroDataFim);
    });
  }, [ocorrencias, filtroStatus, filtroTipo, filtroDataInicio, filtroDataFim]);

  const totalPaginas = Math.max(1, Math.ceil(ocorrenciasFiltradas.length / porPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const ocorrenciasDaPagina = ocorrenciasFiltradas.slice(
    (paginaAtual - 1) * porPagina,
    paginaAtual * porPagina
  );
  const totalEncontradas = ocorrenciasFiltradas.length;
  const hoje = dataLocalISO(new Date());

  const mudarFiltroStatus = (valor: string) => {
    setFiltroStatus(valor);
    setPagina(1);
  };

  const mudarFiltroTipo = (valor: string) => {
    setFiltroTipo(valor);
    setPagina(1);
  };

  const mudarDataInicio = (valor: string) => {
    setFiltroDataInicio(valor);
    if (filtroDataFim && valor > filtroDataFim) setFiltroDataFim(valor);
    setPagina(1);
  };

  const mudarDataFim = (valor: string) => {
    setFiltroDataFim(valor);
    if (valor >= DATA_MINIMA && filtroDataInicio && valor < filtroDataInicio) setFiltroDataInicio(valor);
    setPagina(1);
  };

  const mudarPorPagina = (valor: string) => {
    setPorPagina(Number(valor));
    setPagina(1);
  };

  const configMetrica = METRICA_CONFIG[metrica];
  const operador = configMetrica.operadorFixo ?? operadorEscolhido;
  const jaExisteRegra = regras.some((regra) => regra.metrica === metrica);

  const abrirNovaOcorrencia = () => {
    setTituloManual('');
    setDescricao('');
    setValorReferencia('');
    setErroOcorrencia(null);
    setNovaOcorrenciaAberta(true);
  };

  const handleCriarOcorrencia = async () => {
    if (!companyId || !appUser) return;
    if (!tituloManual.trim()) {
      setErroOcorrencia('Dê um título curto pra ocorrência.');
      return;
    }
    if (!descricao.trim()) {
      setErroOcorrencia('Descreva a ocorrência.');
      return;
    }
    try {
      await criarOcorrencia({
        companyId,
        responsavelUid: appUser.uid,
        tituloManual: tituloManual.trim(),
        descricao: descricao.trim(),
        valorReferencia: lerNumeroDigitado(valorReferencia),
        projetoId: null,
      });
      setNovaOcorrenciaAberta(false);
    } catch {
      setErroOcorrencia('Não foi possível registrar a ocorrência. Tente novamente.');
    }
  };

  const limparValoresAutomacao = () => {
    setValor1('');
    setValor2('');
    setErroAutomacao(null);
  };

  const abrirNovaAutomacao = () => {
    setMetrica('diferenca_kg');
    setOperadorEscolhido('maior');
    limparValoresAutomacao();
    setNovaAutomacaoAberta(true);
  };

  const mudarMetrica = (valor: string) => {
    setMetrica(valor as RegraMetrica);
    limparValoresAutomacao();
  };

  const erroDosValoresAutomacao = (v1: number | null, v2: number | null): string | null => {
    if (v1 === null) return 'Informe um valor numérico válido.';
    if (configMetrica.somenteInteiro && (!Number.isInteger(v1) || v1 < 1)) {
      return 'Informe um número inteiro de dias, a partir de 1.';
    }
    if (operador !== 'entre') return null;
    if (v2 === null) return 'Informe o segundo valor do intervalo.';
    if (v2 <= v1) return 'O valor final deve ser maior que o inicial.';
    return null;
  };

  const handleCriarAutomacao = async () => {
    if (!companyId) return;
    const v1 = lerNumeroDigitado(valor1);
    const v2 = operador === 'entre' ? lerNumeroDigitado(valor2) : null;
    const erroValidacao = erroDosValoresAutomacao(v1, v2);
    if (erroValidacao || v1 === null) {
      setErroAutomacao(erroValidacao);
      return;
    }
    setErroAutomacao(null);
    try {
      await criarRegra({ companyId, metrica, operador, valor1: v1, valor2: v2 });
      setNovaAutomacaoAberta(false);
    } catch {
      setErroAutomacao('Não foi possível salvar a automação. Tente novamente.');
    }
  };

  const quantidadeDaRegraQuery = useQuery({
    queryKey: ['ocorrenciasDaRegra', regraParaExcluir?.id],
    queryFn: () => contarOcorrenciasDaRegra(regraParaExcluir!),
    enabled: regraParaExcluir !== null,
    gcTime: 0,
  });

  const handleSolicitarExclusao = (regra: RegraDeteccao) => {
    setConfigurarModalOpen(false);
    setRegraParaExcluir(regra);
  };

  const handleConfirmarExclusaoRegra = async () => {
    if (!regraParaExcluir || !companyId) return;
    await excluirRegra(regraParaExcluir);
    setRegraParaExcluir(null);
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
        <Button variant="ghost" icon={<Settings size={16} />} onClick={abrirNovaAutomacao}>
          Nova automação
        </Button>
        <Button variant="accent" icon={<Plus size={16} />} onClick={abrirNovaOcorrencia}>
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
        <Input
          id="ocorrencias-data-inicio"
          type="date"
          label="Fogo de"
          value={filtroDataInicio}
          max={filtroDataFim || hoje}
          onChange={(e) => mudarDataInicio(e.target.value)}
          size="sm"
        />
        <Input
          id="ocorrencias-data-fim"
          type="date"
          label="Fogo até"
          value={filtroDataFim}
          min={filtroDataInicio || undefined}
          max={hoje}
          onChange={(e) => mudarDataFim(e.target.value)}
          size="sm"
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
          <Table columns={['110px', '200px', '100px', '1fr', '120px', '120px', '190px', '56px']}>
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Tipo</th>
                <th>Origem</th>
                <th>Descrição</th>
                <th>Data do fogo</th>
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
                  <td>{o.dataFogo ? o.dataFogo.toDate().toLocaleDateString('pt-BR') : '—'}</td>
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

      <FormModal
        open={novaOcorrenciaAberta}
        onOpenChange={setNovaOcorrenciaAberta}
        title="Nova ocorrência"
        rotuloAcao="Registrar ocorrência"
        onAcao={handleCriarOcorrencia}
        salvando={isCriando}
        erro={erroOcorrencia}
      >
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
      </FormModal>

      <FormModal
        open={novaAutomacaoAberta}
        onOpenChange={setNovaAutomacaoAberta}
        title="Nova automação"
        description={configMetrica.descricao}
        width={420}
        rotuloAcao="Criar automação"
        onAcao={handleCriarAutomacao}
        salvando={isCriandoRegra}
        desabilitado={jaExisteRegra}
        erro={jaExisteRegra ? configMetrica.avisoJaExiste : erroAutomacao}
      >
        <div className={styles.field}>
          <span className={styles.label}>Tipo de automação</span>
          <Select value={metrica} onValueChange={mudarMetrica} options={METRICA_OPTIONS} disabled={isCriandoRegra} />
        </div>

        {!jaExisteRegra && !configMetrica.operadorFixo && (
          <div className={styles.field}>
            <span className={styles.label}>Condição</span>
            <Select
              value={operador}
              onValueChange={(v) => setOperadorEscolhido(v as RegraOperador)}
              options={OPERADOR_OPTIONS}
              disabled={isCriandoRegra}
            />
          </div>
        )}

        {!jaExisteRegra && operador === 'entre' && (
          <div className={styles.linhaDupla}>
            <Input id="automacao-valor1" label={configMetrica.labelDe} value={valor1} onChange={(e) => setValor1(e.target.value)} disabled={isCriandoRegra} />
            <Input id="automacao-valor2" label={configMetrica.labelAte} value={valor2} onChange={(e) => setValor2(e.target.value)} disabled={isCriandoRegra} />
          </div>
        )}

        {!jaExisteRegra && operador !== 'entre' && (
          <Input id="automacao-valor1" label={configMetrica.labelValor} value={valor1} onChange={(e) => setValor1(e.target.value)} disabled={isCriandoRegra} />
        )}
      </FormModal>

      <ConfigurarAutomacoesModal
        open={configurarModalOpen}
        onOpenChange={setConfigurarModalOpen}
        regras={regras}
        onSolicitarExclusao={handleSolicitarExclusao}
      />

      <ConfirmModal
        open={regraParaExcluir !== null}
        etapas={[
          {
            title: 'Remover automação?',
            tone: 'danger',
            confirmLabel: 'Continuar',
            carregando: quantidadeDaRegraQuery.isPending,
            textoCarregando: 'Verificando ocorrências vinculadas...',
            description: (
              <>
                <p>
                  Essa automação já gerou <strong>{quantidadeDaRegraQuery.data ?? 0} ocorrência(s)</strong>. Ao
                  remover a automação, todas elas serão apagadas permanentemente, mesmo as que já estiverem em
                  acompanhamento.
                </p>
                <p>
                  Se você recriar uma automação equivalente, os fogos que ainda se enquadrarem vão gerar novas
                  ocorrências, mas o histórico das atuais não volta.
                </p>
              </>
            ),
          },
          {
            title: 'Confirmar exclusão definitiva',
            tone: 'danger',
            description: 'Essa automação e todas as ocorrências geradas por ela serão removidas. Essa ação não pode ser desfeita.',
            confirmLabel: 'Remover automação e ocorrências',
          },
        ]}
        isConfirming={isExcluindoRegra}
        onConfirm={handleConfirmarExclusaoRegra}
        onCancel={() => setRegraParaExcluir(null)}
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
