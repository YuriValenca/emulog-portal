'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Settings, Trash2 } from 'lucide-react';
import { useAppAuth } from '@/hooks/useAppAuth';
import { hojeLocal } from '@/helpers/dataLocal';
import { useCompanyGroup } from '@/hooks/fogos/useCompanyGroup';
import { useOcorrencias } from '@/hooks/ocorrencias/useOcorrencias';
import { useRegrasDeteccao } from '@/hooks/ocorrencias/useRegrasDeteccao';
import { Pagination } from '@/components/ui/Pagination/Pagination';
import { Button } from '@/components/ui/Button/Button';
import { Select } from '@/components/ui/Select/Select';
import { Table } from '@/components/ui/Table/Table';
import { Input } from '@/components/ui/Input/Input';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { StatusPill } from '@/components/ui/StatusPill/StatusPill';
import { Textarea } from '@/components/ui/Textarea/Textarea';
import { ActionsMenu } from '@/components/ui/ActionsMenu/ActionsMenu';
import { useToast } from '@/components/ui/Toast/Toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal/ConfirmModal';
import { FormModal } from '@/components/layout/FormModal/FormModal';
import ConfigurarAutomacoesModal from './components/ConfigurarAutomacoesModal/ConfigurarAutomacoesModal';
import {
  METRICA_CONFIG, METRICA_OPTIONS, OPCOES_POR_PAGINA, OPERADOR_OPTIONS, STATUS_OPTIONS, TIPO_OPTIONS,
  categoriaOcorrencia, dentroDoPeriodoDoFogo, erroDaNovaOcorrencia, erroDosValoresAutomacao,
  lerNumeroDigitado, tipoLabel, tipoTone,
} from './opcoes';
import { useFiltrosOcorrencias, useFormNovaAutomacao, useFormNovaOcorrencia } from './stores';
import type { Ocorrencia, OcorrenciaStatus } from '@/types';
import type { RegraDeteccao, RegraMetrica, RegraOperador } from '@/schemas/regraDeteccao';
import styles from './page.module.scss';

function CategoriaTag({ categoria }: { categoria: 'fogo' | 'geral' }) {
  return (
    <span className={categoria === 'fogo' ? `${styles.tagPill} ${styles.tagFogo}` : `${styles.tagPill} ${styles.tagGeral}`}>
      {categoria === 'fogo' ? 'Fogo' : 'Geral'}
    </span>
  );
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

  const filtros = useFiltrosOcorrencias();
  const novaOcorrencia = useFormNovaOcorrencia();
  const novaAutomacao = useFormNovaAutomacao();

  // Os formulários vivem num store global: sem isso, sair da página com um deles aberto o reabriria na volta
  useEffect(() => () => {
    useFormNovaOcorrencia.getState().fechar();
    useFormNovaAutomacao.getState().fechar();
  }, []);

  const [configurarModalOpen, setConfigurarModalOpen] = useState(false);
  const [regraParaExcluir, setRegraParaExcluir] = useState<RegraDeteccao | null>(null);
  const [ocorrenciaParaExcluir, setOcorrenciaParaExcluir] = useState<Ocorrencia | null>(null);

  const ocorrenciasFiltradas = useMemo(() => {
    return ocorrencias.filter((o) => {
      const passaStatus = filtros.status ? o.status === filtros.status : true;
      const passaTipo = filtros.tipo ? o.tipo === filtros.tipo : true;
      return passaStatus && passaTipo && dentroDoPeriodoDoFogo(o, filtros.dataInicio, filtros.dataFim);
    });
  }, [ocorrencias, filtros.status, filtros.tipo, filtros.dataInicio, filtros.dataFim]);

  const totalPaginas = Math.max(1, Math.ceil(ocorrenciasFiltradas.length / filtros.porPagina));
  const paginaAtual = Math.min(filtros.pagina, totalPaginas);
  const ocorrenciasDaPagina = ocorrenciasFiltradas.slice(
    (paginaAtual - 1) * filtros.porPagina,
    paginaAtual * filtros.porPagina
  );
  const totalEncontradas = ocorrenciasFiltradas.length;
  const hoje = hojeLocal();

  const configMetrica = METRICA_CONFIG[novaAutomacao.metrica];
  const operador = configMetrica.operadorFixo ?? novaAutomacao.operadorEscolhido;
  const jaExisteRegra = regras.some((regra) => regra.metrica === novaAutomacao.metrica);

  const salvarNovaOcorrencia = async () => {
    if (!companyId || !appUser) return;
    const { tituloManual, descricao, valorReferencia } = novaOcorrencia;
    const erroValidacao = erroDaNovaOcorrencia(tituloManual, descricao);
    if (erroValidacao) return novaOcorrencia.mostrarErro(erroValidacao);
    try {
      await criarOcorrencia({
        companyId,
        responsavelUid: appUser.uid,
        tituloManual: tituloManual.trim(),
        descricao: descricao.trim(),
        valorReferencia: lerNumeroDigitado(valorReferencia),
        projetoId: null,
      });
      novaOcorrencia.fechar();
    } catch {
      novaOcorrencia.mostrarErro('Não foi possível registrar a ocorrência. Tente novamente.');
    }
  };

  const salvarNovaAutomacao = async () => {
    if (!companyId) return;
    const v1 = lerNumeroDigitado(novaAutomacao.valor1);
    const v2 = operador === 'entre' ? lerNumeroDigitado(novaAutomacao.valor2) : null;
    const erroValidacao = erroDosValoresAutomacao(configMetrica, operador, v1, v2);
    if (erroValidacao || v1 === null) return novaAutomacao.mostrarErro(erroValidacao);
    novaAutomacao.mostrarErro(null);
    try {
      await criarRegra({ companyId, metrica: novaAutomacao.metrica, operador, valor1: v1, valor2: v2 });
      novaAutomacao.fechar();
    } catch {
      novaAutomacao.mostrarErro('Não foi possível salvar a automação. Tente novamente.');
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
    try {
      await excluirRegra(regraParaExcluir);
      setRegraParaExcluir(null);
    } catch {
      toast({
        title: 'Não foi possível excluir a automação',
        description: 'A automação e as ocorrências dela continuam. Tente novamente.',
      });
    }
  };

  const mudarStatusOcorrencia = async (ocorrencia: Ocorrencia, status: OcorrenciaStatus) => {
    try {
      await atualizarStatus({ id: ocorrencia.id, status });
    } catch {
      toast({
        title: 'Não foi possível mudar o status',
        description: 'A ocorrência continua com o status anterior. Tente novamente.',
      });
    }
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
        <Button variant="ghost" icon={<Settings size={16} />} onClick={novaAutomacao.abrir}>
          Nova automação
        </Button>
        <Button variant="brand" icon={<Plus size={16} />} onClick={novaOcorrencia.abrir}>
          Nova ocorrência
        </Button>
      </div>

      <div className={styles.filtros}>
        <Select
          value={filtros.status}
          onValueChange={filtros.mudarStatus}
          options={STATUS_OPTIONS}
          resetOption="Todos os status"
          label='Status'
          placeholder="Status"
          size="sm"
          width={250}
        />
        <Select
          value={filtros.tipo}
          onValueChange={filtros.mudarTipo}
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
          value={filtros.dataInicio}
          max={filtros.dataFim || hoje}
          onChange={(e) => filtros.mudarDataInicio(e.target.value)}
          size="sm"
        />
        <Input
          id="ocorrencias-data-fim"
          type="date"
          label="Fogo até"
          value={filtros.dataFim}
          min={filtros.dataInicio || undefined}
          max={hoje}
          onChange={(e) => filtros.mudarDataFim(e.target.value)}
          size="sm"
        />
        <Select
          value={String(filtros.porPagina)}
          onValueChange={(valor) => filtros.mudarPorPagina(Number(valor))}
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
                      onValueChange={(value) => mudarStatusOcorrencia(o, value as OcorrenciaStatus)}
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
                          onClick: () => setOcorrenciaParaExcluir(o),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          {totalEncontradas === 0 && <p className={styles.empty}>Nenhuma ocorrência encontrada.</p>}

          <Pagination page={paginaAtual} totalPages={totalPaginas} onPageChange={filtros.irParaPagina} />
        </>
      )}

      <FormModal
        open={novaOcorrencia.aberta}
        onOpenChange={(aberta) => !aberta && novaOcorrencia.fechar()}
        title="Nova ocorrência"
        rotuloAcao="Registrar ocorrência"
        onAcao={salvarNovaOcorrencia}
        salvando={isCriando}
        erro={novaOcorrencia.erro}
      >
        <Input
          id="ocorrencia-titulo"
          label="Título"
          placeholder="Ex: Capacete não utilizado"
          value={novaOcorrencia.tituloManual}
          onChange={(e) => novaOcorrencia.alterar({ tituloManual: e.target.value })}
          maxLength={80}
          showCharCount
          disabled={isCriando}
        />
        <Textarea
          id="ocorrencia-descricao"
          label="Descrição"
          value={novaOcorrencia.descricao}
          onChange={(e) => novaOcorrencia.alterar({ descricao: e.target.value })}
          maxLength={500}
          showCharCount
          disabled={isCriando}
        />
        <Input
          id="ocorrencia-valor"
          label="Valor de referência (opcional)"
          placeholder="Ex: 1.15 ou 6.5"
          value={novaOcorrencia.valorReferencia}
          onChange={(e) => novaOcorrencia.alterar({ valorReferencia: e.target.value })}
          disabled={isCriando}
        />
      </FormModal>

      <FormModal
        open={novaAutomacao.aberta}
        onOpenChange={(aberta) => !aberta && novaAutomacao.fechar()}
        title="Nova automação"
        description={configMetrica.descricao}
        width={420}
        rotuloAcao="Criar automação"
        onAcao={salvarNovaAutomacao}
        salvando={isCriandoRegra}
        desabilitado={jaExisteRegra}
        erro={jaExisteRegra ? configMetrica.avisoJaExiste : novaAutomacao.erro}
      >
        <div className={styles.field}>
          <span className={styles.label}>Tipo de automação</span>
          <Select
            value={novaAutomacao.metrica}
            onValueChange={(valor) => novaAutomacao.mudarMetrica(valor as RegraMetrica)}
            options={METRICA_OPTIONS}
            disabled={isCriandoRegra}
          />
        </div>

        {!jaExisteRegra && !configMetrica.operadorFixo && (
          <div className={styles.field}>
            <span className={styles.label}>Condição</span>
            <Select
              value={operador}
              onValueChange={(v) => novaAutomacao.alterar({ operadorEscolhido: v as RegraOperador })}
              options={OPERADOR_OPTIONS}
              disabled={isCriandoRegra}
            />
          </div>
        )}

        {!jaExisteRegra && operador === 'entre' && (
          <div className={styles.linhaDupla}>
            <Input
              id="automacao-valor1"
              label={configMetrica.labelDe}
              value={novaAutomacao.valor1}
              onChange={(e) => novaAutomacao.alterar({ valor1: e.target.value })}
              disabled={isCriandoRegra}
            />
            <Input
              id="automacao-valor2"
              label={configMetrica.labelAte}
              value={novaAutomacao.valor2}
              onChange={(e) => novaAutomacao.alterar({ valor2: e.target.value })}
              disabled={isCriandoRegra}
            />
          </div>
        )}

        {!jaExisteRegra && operador !== 'entre' && (
          <Input
            id="automacao-valor1"
            label={configMetrica.labelValor}
            value={novaAutomacao.valor1}
            onChange={(e) => novaAutomacao.alterar({ valor1: e.target.value })}
            disabled={isCriandoRegra}
          />
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
        onCancel={() => setOcorrenciaParaExcluir(null)}
      />
    </div>
  );
}
