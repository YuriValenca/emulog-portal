'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Plus, RefreshCcw, RotateCcw, Settings, Trash2 } from 'lucide-react';
import { useAppAuth } from '@/hooks/useAppAuth';
import { useCompanyGroup } from '@/hooks/fogos/useCompanyGroup';
import { useAgora } from '@/hooks/useAgora';
import { useVencimentos } from '@/hooks/vencimentos/useVencimentos';
import { contarVencimentosDoTipo, useTiposVencimento } from '@/hooks/vencimentos/useTiposVencimento';
import { useCaminhoes } from '@/hooks/cadastro/useCaminhoes';
import { useOperadores } from '@/hooks/cadastro/useOperadores';
import {
  alertaParaChave, chaveDoTipo, formatarHorasRestantes, opcoesDeTipo, rotuloDoTipo, urgenciaVencimento,
} from '@/lib/vencimento';
import { Button } from '@/components/ui/Button/Button';
import { Select } from '@/components/ui/Select/Select';
import { Table } from '@/components/ui/Table/Table';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { StatusPill } from '@/components/ui/StatusPill/StatusPill';
import { ActionsMenu } from '@/components/ui/ActionsMenu/ActionsMenu';
import { Tabs } from '@/components/ui/Tabs/Tabs';
import { Input } from '@/components/ui/Input/Input';
import { ConfirmModal } from '@/components/ui/ConfirmModal/ConfirmModal';
import { useToast } from '@/components/ui/Toast/Toast';
import { FormModal } from '@/components/layout/FormModal/FormModal';
import CriarVencimentoModal from './components/CriarVencimentoModal/CriarVencimentoModal';
import ConfigurarAlertaModal from './components/ConfigurarAlertaModal/ConfigurarAlertaModal';
import type { TipoVencimentoPersonalizado, Vencimento } from '@/types';
import styles from './page.module.scss';

function itemLabel(v: Vencimento): string {
  if (v.caminhao) return v.caminhao.placa;
  if (v.operador) return v.operador.nome;
  return v.tituloManual || 'Sem título';
}

export default function VencimentosPage() {
  const { companyId, appUser, company, isSuperadmin } = useAppAuth();
  const agora = useAgora();
  const { toast } = useToast();
  const { companyIds } = useCompanyGroup(companyId);
  const { itens: caminhoes } = useCaminhoes(companyId);
  const { itens: operadores } = useOperadores(companyId);
  const {
    vencimentos, isLoading, isError,
    marcarResolvido, reabrirVencimento, editarDataVencimento, excluirVencimento,
  } = useVencimentos(companyIds);
  const { excluirTipo, isExcluindo: isExcluindoTipo } = useTiposVencimento();
  const tiposPersonalizados = useMemo(() => company?.tiposVencimento ?? [], [company?.tiposVencimento]);

  const [aba, setAba] = useState<'ativos' | 'resolvidos'>('ativos');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [modalCriarAberto, setModalCriarAberto] = useState(false);
  const [modalConfigAberto, setModalConfigAberto] = useState(false);
  const [vencimentoParaRenovar, setVencimentoParaRenovar] = useState<Vencimento | null>(null);
  const [novaDataVencimento, setNovaDataVencimento] = useState('');
  const [renovando, setRenovando] = useState(false);
  const [vencimentoParaExcluir, setVencimentoParaExcluir] = useState<Vencimento | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [tipoParaExcluir, setTipoParaExcluir] = useState<TipoVencimentoPersonalizado | null>(null);

  const quantidadeDoTipoQuery = useQuery({
    queryKey: ['vencimentosDoTipo', companyId, tipoParaExcluir?.id],
    queryFn: () => contarVencimentosDoTipo({ companyId: companyId!, tipoId: tipoParaExcluir!.id }),
    enabled: tipoParaExcluir !== null && companyId !== null,
    gcTime: 0,
  });

  const vencimentosFiltrados = useMemo(() => {
    return vencimentos
      .filter((v) => v.status === (aba === 'ativos' ? 'ativo' : 'resolvido'))
      .filter((v) => (filtroTipo ? chaveDoTipo(v) === filtroTipo : true));
  }, [vencimentos, aba, filtroTipo]);

  const abrirRenovacao = (vencimento: Vencimento) => {
    setNovaDataVencimento('');
    setVencimentoParaRenovar(vencimento);
  };

  const handleRenovar = async () => {
    if (!vencimentoParaRenovar || !novaDataVencimento) return;
    const [ano, mes, dia] = novaDataVencimento.split('-').map(Number);
    setRenovando(true);
    try {
      await editarDataVencimento({ id: vencimentoParaRenovar.id, dataVencimento: new Date(ano, mes - 1, dia, 23, 59, 0) });
      setVencimentoParaRenovar(null);
    } catch {
      toast({ title: 'Não foi possível renovar', description: 'O vencimento continua com a data anterior. Tente novamente.' });
    } finally {
      setRenovando(false);
    }
  };

  const confirmarExclusao = async () => {
    if (!vencimentoParaExcluir) return;
    setExcluindo(true);
    try {
      await excluirVencimento(vencimentoParaExcluir.id);
      setVencimentoParaExcluir(null);
    } catch {
      toast({ title: 'Não foi possível excluir', description: 'O vencimento continua na lista. Tente novamente.' });
    } finally {
      setExcluindo(false);
    }
  };

  const solicitarExclusaoDoTipo = (tipo: TipoVencimentoPersonalizado) => {
    setModalConfigAberto(false);
    setTipoParaExcluir(tipo);
  };

  const confirmarExclusaoDoTipo = async () => {
    if (!tipoParaExcluir || !companyId) return;
    try {
      await excluirTipo({
        companyId,
        tipoId: tipoParaExcluir.id,
        tiposAtuais: tiposPersonalizados,
        alertaAtual: company?.alertaVencimento,
      });
      if (filtroTipo === tipoParaExcluir.id) setFiltroTipo('');
      setTipoParaExcluir(null);
    } catch {
      toast({ title: 'Não foi possível excluir o tipo', description: 'O tipo continua cadastrado. Tente novamente.' });
    }
  };

  const resolver = async (vencimento: Vencimento) => {
    try {
      await marcarResolvido(vencimento.id);
    } catch {
      toast({ title: 'Não foi possível marcar como resolvido', description: 'O vencimento continua ativo. Tente novamente.' });
    }
  };

  const reabrir = async (vencimento: Vencimento) => {
    try {
      await reabrirVencimento(vencimento.id);
    } catch {
      toast({ title: 'Não foi possível reabrir', description: 'O vencimento continua resolvido. Tente novamente.' });
    }
  };

  if (isSuperadmin && !companyId) {
    return (
      <div className={styles.container}>
        <p className={styles.empty}>Selecione uma empresa no topo da página para ver os vencimentos.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Select
          value={filtroTipo}
          onValueChange={setFiltroTipo}
          options={opcoesDeTipo(tiposPersonalizados)}
          resetOption="Todos os tipos"
          placeholder="Tipo"
          size="sm"
          width={220}
        />
        <div className={styles.buttonsHolder}>
          <Button variant="ghost" icon={<Settings size={16} />} onClick={() => setModalConfigAberto(true)}>
            Tipos e alertas
          </Button>
          <Button variant="brand" icon={<Plus size={16} />} onClick={() => setModalCriarAberto(true)}>
            Novo vencimento
          </Button>
        </div>
      </div>

      <Tabs
        value={aba}
        onValueChange={(v) => setAba(v as 'ativos' | 'resolvidos')}
        items={[
          { value: 'ativos', label: 'Ativos', content: null },
          { value: 'resolvidos', label: 'Resolvidos', content: null },
        ]}
      />

      {isError ? (
        <p className={styles.error}>Não foi possível carregar os vencimentos.</p>
      ) : isLoading ? (
        <div className={styles.loadingRow}>
          <Spinner />
        </div>
      ) : (
        <>
          <Table columns={['225px', '250px', '1fr', '200px', '140px', '56px']}>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Referência</th>
                <th>Observações</th>
                <th>Vence em</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {vencimentosFiltrados.map((v) => {
                const alerta = alertaParaChave(company?.alertaVencimento, chaveDoTipo(v));
                const dataVencimento = v.dataVencimento.toDate();
                const urgencia = urgenciaVencimento(dataVencimento, alerta, agora);
                const horasRestantes = (dataVencimento.getTime() - agora.getTime()) / 36e5;
                const tone = urgencia === 'critico' ? 'crit' : urgencia === 'alerta' ? 'warn' : 'ok';

                return (
                  <tr key={v.id}>
                    <td>{rotuloDoTipo(v)}</td>
                    <td>{itemLabel(v)}</td>
                    <td>{v.descricao || '—'}</td>
                    <td>
                      {dataVencimento.toLocaleDateString('pt-BR')}
                      {aba === 'ativos' && ` (${formatarHorasRestantes(horasRestantes)})`}
                    </td>
                    <td>
                      <StatusPill
                        label={aba === 'ativos' ? (urgencia === 'critico' ? 'Crítico' : urgencia === 'alerta' ? 'Alerta' : 'Ok') : 'Resolvido'}
                        tone={aba === 'ativos' ? tone : 'neutral'}
                      />
                    </td>
                    <td>
                      <ActionsMenu
                        ariaLabel={`Ações para ${itemLabel(v)}`}
                        items={
                          aba === 'ativos'
                            ? [
                                { key: 'renovar', label: 'Renovar', icon: <RefreshCcw size={14} />, onClick: () => abrirRenovacao(v) },
                                { key: 'resolver', label: 'Marcar resolvido', icon: <Check size={14} />, onClick: () => resolver(v) },
                                ...(isSuperadmin
                                  ? [{ key: 'excluir', label: 'Excluir', icon: <Trash2 size={14} />, variant: 'danger' as const, onClick: () => setVencimentoParaExcluir(v) }]
                                  : []),
                              ]
                            : [
                                { key: 'reabrir', label: 'Reabrir', icon: <RotateCcw size={14} />, onClick: () => reabrir(v) },
                                ...(isSuperadmin
                                  ? [{ key: 'excluir', label: 'Excluir', icon: <Trash2 size={14} />, variant: 'danger' as const, onClick: () => setVencimentoParaExcluir(v) }]
                                  : []),
                              ]
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>

          {vencimentosFiltrados.length === 0 && <p className={styles.empty}>Nenhum vencimento {aba === 'ativos' ? 'ativo' : 'resolvido'}.</p>}
        </>
      )}

      {companyId && appUser && modalCriarAberto && (
        <CriarVencimentoModal
          open={modalCriarAberto}
          onClose={() => setModalCriarAberto(false)}
          companyId={companyId}
          uidUsuario={appUser.uid}
          companyIds={companyIds}
          caminhoes={caminhoes}
          operadores={operadores}
          tiposPersonalizados={tiposPersonalizados}
        />
      )}

      {companyId && modalConfigAberto && (
        <ConfigurarAlertaModal
          open={modalConfigAberto}
          onClose={() => setModalConfigAberto(false)}
          companyId={companyId}
          alertaVencimentoAtual={company?.alertaVencimento}
          tiposAtuais={tiposPersonalizados}
          onSolicitarExclusao={solicitarExclusaoDoTipo}
        />
      )}

      <ConfirmModal
        open={tipoParaExcluir !== null}
        etapas={[
          {
            title: `Excluir o tipo "${tipoParaExcluir?.nome ?? ''}"?`,
            tone: 'danger',
            confirmLabel: 'Continuar',
            carregando: quantidadeDoTipoQuery.isPending,
            textoCarregando: 'Verificando vencimentos cadastrados...',
            description: (
              <p>
                Esse tipo tem <strong>{quantidadeDoTipoQuery.data ?? 0} vencimento(s)</strong> cadastrado(s), ativos e
                resolvidos. Ao excluir o tipo, todos eles serão apagados permanentemente.
              </p>
            ),
          },
          {
            title: 'Confirmar exclusão definitiva',
            tone: 'danger',
            description: 'O tipo, os prazos de alerta dele e todos os vencimentos desse tipo serão removidos. Essa ação não pode ser desfeita.',
            confirmLabel: 'Excluir tipo e vencimentos',
          },
        ]}
        isConfirming={isExcluindoTipo}
        onConfirm={confirmarExclusaoDoTipo}
        onCancel={() => !isExcluindoTipo && setTipoParaExcluir(null)}
      />

      <ConfirmModal
        open={vencimentoParaExcluir !== null}
        title="Apagar vencimento?"
        description={
          vencimentoParaExcluir
            ? `"${itemLabel(vencimentoParaExcluir)}" sai da lista para sempre. Essa ação não pode ser desfeita.`
            : undefined
        }
        confirmLabel="Apagar"
        cancelLabel="Cancelar"
        tone="danger"
        isConfirming={excluindo}
        onConfirm={confirmarExclusao}
        onCancel={() => !excluindo && setVencimentoParaExcluir(null)}
      />

      <FormModal
        open={vencimentoParaRenovar !== null}
        onOpenChange={(aberto) => !aberto && setVencimentoParaRenovar(null)}
        title="Renovar vencimento"
        width={340}
        rotuloAcao="Salvar nova data"
        onAcao={handleRenovar}
        salvando={renovando}
        desabilitado={!novaDataVencimento}
      >
        <Input
          id="renovar-data"
          type="date"
          label="Nova data de vencimento"
          value={novaDataVencimento}
          onChange={(e) => setNovaDataVencimento(e.target.value)}
          disabled={renovando}
        />
      </FormModal>
    </div>
  );
}
