'use client';

import { useMemo, useState } from 'react';
import { Check, Plus, RefreshCcw, RotateCcw, Settings, Trash2 } from 'lucide-react';
import { useAppAuth } from '@/hooks/useAppAuth';
import { useCompanyGroup } from '@/hooks/fogos/useCompanyGroup';
import { useAgora } from '@/hooks/useAgora';
import { useVencimentos } from '@/hooks/vencimentos/useVencimentos';
import { useCaminhoes } from '@/hooks/cadastro/useCaminhoes';
import { useOperadores } from '@/hooks/cadastro/useOperadores';
import { alertaParaTipo, urgenciaVencimento, formatarHorasRestantes } from '@/lib/vencimento';
import { Button } from '@/components/ui/Button/Button';
import { Select } from '@/components/ui/Select/Select';
import { Table } from '@/components/ui/Table/Table';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { StatusPill } from '@/components/ui/StatusPill/StatusPill';
import { ActionsMenu } from '@/components/ui/ActionsMenu/ActionsMenu';
import { Tabs } from '@/components/ui/Tabs/Tabs';
import ConfirmModal from '@/components/layout/ConfirmModal/ConfirmModal';
import CriarVencimentoModal from './components/CriarVencimentoModal/CriarVencimentoModal';
import RenovarVencimentoModal from './components/RenovarVencimentoModal/RenovarVencimentoModal';
import ConfigurarAlertaModal from './components/ConfigurarAlertaModal/ConfigurarAlertaModal';
import type { Vencimento, VencimentoTipo } from '@/types';
import styles from './page.module.scss';

const TIPO_LABEL: Record<VencimentoTipo, string> = {
  documento_umb: 'Documento de UMB',
  certificacao_operador: 'Certificação de operador',
  calibracao_equipamento: 'Calibração de equipamento',
  manual: 'Outro',
};

const TIPO_OPTIONS = Object.entries(TIPO_LABEL).map(([value, label]) => ({ value, label }));

function itemLabel(v: Vencimento): string {
  if (v.caminhao) return v.caminhao.placa;
  if (v.operador) return v.operador.nome;
  return v.tituloManual || 'Sem título';
}

export default function VencimentosPage() {
  const { companyId, appUser, company, isSuperadmin, isCompanyAdmin } = useAppAuth();
  const agora = useAgora();
  const { companyIds } = useCompanyGroup(companyId);
  const { caminhoes } = useCaminhoes(companyId);
  const { operadores } = useOperadores(companyId);
  const {
    vencimentos, isLoading, isError,
    marcarResolvido, reabrirVencimento, editarDataVencimento, excluirVencimento,
  } = useVencimentos(companyIds);

  const [aba, setAba] = useState<'ativos' | 'resolvidos'>('ativos');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [modalCriarAberto, setModalCriarAberto] = useState(false);
  const [modalConfigAberto, setModalConfigAberto] = useState(false);
  const [vencimentoParaRenovar, setVencimentoParaRenovar] = useState<Vencimento | null>(null);
  const [renovando, setRenovando] = useState(false);
  const [vencimentoParaExcluir, setVencimentoParaExcluir] = useState<Vencimento | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const vencimentosFiltrados = useMemo(() => {
    return vencimentos
      .filter((v) => v.status === (aba === 'ativos' ? 'ativo' : 'resolvido'))
      .filter((v) => (filtroTipo ? v.tipo === filtroTipo : true));
  }, [vencimentos, aba, filtroTipo]);

  const handleRenovar = async (data: Date) => {
    if (!vencimentoParaRenovar) return;
    setRenovando(true);
    try {
      await editarDataVencimento({ id: vencimentoParaRenovar.id, dataVencimento: data });
      setVencimentoParaRenovar(null);
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
    } finally {
      setExcluindo(false);
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
          options={TIPO_OPTIONS}
          resetOption="Todos os tipos"
          placeholder="Tipo"
          size="sm"
          width={220}
        />
        <div className={styles.buttonsHolder}>
          <Button variant="ghost" icon={<Settings size={16} />} onClick={() => setModalConfigAberto(true)}>
            Configurar alertas
          </Button>
          <Button variant="accent" icon={<Plus size={16} />} onClick={() => setModalCriarAberto(true)}>
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
                const alerta = alertaParaTipo(company?.alertaVencimento, v.tipo);
                const dataVencimento = v.dataVencimento.toDate();
                const urgencia = urgenciaVencimento(dataVencimento, alerta, agora);
                const horasRestantes = (dataVencimento.getTime() - agora.getTime()) / 36e5;
                const tone = urgencia === 'critico' ? 'crit' : urgencia === 'alerta' ? 'warn' : 'ok';

                return (
                  <tr key={v.id}>
                    <td>{TIPO_LABEL[v.tipo]}</td>
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
                                { key: 'renovar', label: 'Renovar', icon: <RefreshCcw size={14} />, onClick: () => setVencimentoParaRenovar(v) },
                                { key: 'resolver', label: 'Marcar resolvido', icon: <Check size={14} />, onClick: () => marcarResolvido(v.id) },
                                ...(isSuperadmin
                                  ? [{ key: 'excluir', label: 'Excluir', icon: <Trash2 size={14} />, variant: 'danger' as const, onClick: () => setVencimentoParaExcluir(v) }]
                                  : []),
                              ]
                            : [
                                { key: 'reabrir', label: 'Reabrir', icon: <RotateCcw size={14} />, onClick: () => reabrirVencimento(v.id) },
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

      {isCompanyAdmin && companyId && appUser && modalCriarAberto && (
        <CriarVencimentoModal
          open={modalCriarAberto}
          onClose={() => setModalCriarAberto(false)}
          companyId={companyId}
          uidUsuario={appUser.uid}
          companyIds={companyIds}
          caminhoes={caminhoes}
          operadores={operadores}
        />
      )}

      {companyId && modalConfigAberto && (
        <ConfigurarAlertaModal
          open={modalConfigAberto}
          onClose={() => setModalConfigAberto(false)}
          companyId={companyId}
          alertaVencimentoAtual={company?.alertaVencimento}
        />
      )}

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

      {vencimentoParaRenovar && (
        <RenovarVencimentoModal
          vencimento={vencimentoParaRenovar}
          onClose={() => setVencimentoParaRenovar(null)}
          onSalvar={handleRenovar}
          saving={renovando}
        />
      )}
    </div>
  );
}
