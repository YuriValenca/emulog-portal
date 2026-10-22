'use client';

import { useState, type ReactNode } from 'react';
import { Ban, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Panel } from '@/components/ui/Panel/Panel';
import { Table } from '@/components/ui/Table/Table';
import { Button } from '@/components/ui/Button/Button';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { StatusPill } from '@/components/ui/StatusPill/StatusPill';
import { ActionsMenu } from '@/components/ui/ActionsMenu/ActionsMenu';
import { ConfirmModal } from '@/components/ui/ConfirmModal/ConfirmModal';
import { Select } from '@/components/ui/Select/Select';
import { useToast } from '@/components/ui/Toast/Toast';
import { useAppAuth } from '@/hooks/useAppAuth';
import { useCompanySelection } from '@/stores/useCompanySelection';
import { useLicencas } from '@/hooks/useLicencas';
import { useGerenciarLicencas } from '@/hooks/useGerenciarLicencas';
import {
  rotuloValidadeLicenca, statusExibidoLicenca, toDateLicenca, type StatusLicenca, type ValidadeLicenca,
} from '@/lib/licenca';
import type { License } from '@/types';
import { ModalLicenca } from './ModalLicenca';
import { BarraDeSelecao } from './BarraDeSelecao';
import { aceitaAcao, pluralLicencas, type AcaoDeLicenca } from './acoesDeLicenca';
import styles from './Licencas.module.scss';

const PILL_DO_STATUS: Record<StatusLicenca, { label: string; tone: 'ok' | 'data' | 'crit' | 'neutral' }> = {
  available: { label: 'Disponível', tone: 'data' },
  active: { label: 'Ativa', tone: 'ok' },
  expired: { label: 'Expirada', tone: 'crit' },
  revoked: { label: 'Revogada', tone: 'neutral' },
};

const ORDEM_DO_STATUS: Record<StatusLicenca, number> = { active: 0, available: 1, expired: 2, revoked: 3 };

interface LicencaExibida {
  licenca: License;
  status: StatusLicenca;
}

interface Confirmacao {
  tipo: 'revogar' | 'excluir';
  licencas: License[];
}

const formatarData = (valor: unknown) => toDateLicenca(valor)?.toLocaleDateString('pt-BR') ?? '—';

function rotuloExpiracao(licenca: License, status: StatusLicenca): string {
  if (status === 'available') return 'Na ativação';
  if (!licenca.expiresAt) return status === 'active' ? 'Vitalícia' : '—';
  return formatarData(licenca.expiresAt);
}

function resumo(exibidas: LicencaExibida[]): string {
  const contar = (status: StatusLicenca) => exibidas.filter((item) => item.status === status).length;
  return `${exibidas.length} no total · ${contar('available')} disponíveis · ${contar('active')} ativas`;
}

function descricaoDaConfirmacao({ tipo, licencas }: Confirmacao): string {
  if (licencas.length === 1) {
    const { key } = licencas[0];
    return tipo === 'revogar'
      ? `O aparelho que usa ${key} perde o acesso, e a licença não pode mais ser ativada.`
      : `O registro de ${key} será apagado para sempre.`;
  }
  const alvo = pluralLicencas(licencas.length);
  return tipo === 'revogar'
    ? `Os aparelhos que usam essas ${alvo} perdem o acesso, e elas não podem mais ser ativadas.`
    : `Os registros dessas ${alvo} serão apagados para sempre.`;
}

const ICONE_DA_ACAO: Record<AcaoDeLicenca, ReactNode> = {
  renovar: <RefreshCw size={16} />,
  revogar: <Ban size={16} />,
  excluir: <Trash2 size={16} />,
};

const ROTULO_DA_ACAO: Record<AcaoDeLicenca, string> = { renovar: 'Renovar', revogar: 'Revogar', excluir: 'Excluir' };

function acoesDaLinha(status: StatusLicenca, executar: (acao: AcaoDeLicenca) => void) {
  return (['renovar', 'revogar', 'excluir'] as const)
    .filter((acao) => aceitaAcao(acao, status))
    .map((acao) => ({
      key: acao,
      label: ROTULO_DA_ACAO[acao],
      icon: ICONE_DA_ACAO[acao],
      variant: acao === 'excluir' ? ('danger' as const) : undefined,
      onClick: () => executar(acao),
    }));
}

// O Topbar esconde o seletor em /empresas; este usa a mesma seleção global, que segue valendo nas outras telas.
export function SeletorDeEmpresa() {
  const { companies } = useAppAuth();
  const selecionada = useCompanySelection((state) => state.selectedCompanyId);
  const selecionar = useCompanySelection((state) => state.setSelectedCompanyId);

  return (
    <Select
      options={(companies ?? []).map((empresa) => ({ value: empresa.id, label: empresa.name }))}
      value={selecionada ?? undefined}
      onValueChange={selecionar}
      placeholder="Selecionar empresa"
      size="sm"
      width={260}
    />
  );
}

export function AbaLicencas() {
  const { companyId, company } = useAppAuth();

  if (!companyId) {
    return <p className={styles.vazio}>Selecione uma empresa para ver as licenças dela.</p>;
  }
  if (company?.founding) {
    return <p className={styles.vazio}>Empresa fundadora: os aparelhos dela não usam licença.</p>;
  }
  return <ListaDeLicencas key={companyId} companyId={companyId} />;
}

function ListaDeLicencas({ companyId }: { companyId: string }) {
  const { toast } = useToast();
  const { data: licencas, isLoading } = useLicencas(companyId);
  const gerenciar = useGerenciarLicencas(companyId);

  const [modalAberto, setModalAberto] = useState(false);
  const [licencasParaRenovar, setLicencasParaRenovar] = useState<License[] | null>(null);
  const [erroDaModal, setErroDaModal] = useState<string | null>(null);
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());

  const agora = new Date();
  const exibidas: LicencaExibida[] = (licencas ?? [])
    .map((licenca) => ({ licenca, status: statusExibidoLicenca(licenca, agora) }))
    .sort((a, b) => ORDEM_DO_STATUS[a.status] - ORDEM_DO_STATUS[b.status]);

  const marcadas = exibidas.filter((item) => selecionadas.has(item.licenca.id));
  const todasMarcadas = exibidas.length > 0 && marcadas.length === exibidas.length;

  const aplicaveis = (acao: AcaoDeLicenca, itens: LicencaExibida[]) =>
    itens.filter((item) => aceitaAcao(acao, item.status)).map((item) => item.licenca);

  const alternar = (id: string) => {
    const proximas = new Set(selecionadas);
    if (proximas.has(id)) proximas.delete(id);
    else proximas.add(id);
    setSelecionadas(proximas);
  };

  const alternarTodas = () =>
    setSelecionadas(todasMarcadas ? new Set() : new Set(exibidas.map((item) => item.licenca.id)));

  const abrirModal = (paraRenovar: License[] | null) => {
    setLicencasParaRenovar(paraRenovar);
    setErroDaModal(null);
    setModalAberto(true);
  };

  const executar = (acao: AcaoDeLicenca, alvo: License[]) => {
    if (acao === 'renovar') abrirModal(alvo);
    else setConfirmacao({ tipo: acao, licencas: alvo });
  };

  const gerar = async (quantidade: number, validade: ValidadeLicenca) => {
    try {
      await gerenciar.gerarLote({ quantidade, validade });
      setModalAberto(false);
    } catch (erro) {
      console.error('[AbaLicencas] falha ao gerar licenças:', erro);
      setErroDaModal('Não foi possível gerar as licenças. Nenhuma foi criada; tente novamente.');
    }
  };

  const renovar = async (alvo: License[], validade: ValidadeLicenca) => {
    try {
      await gerenciar.renovar({ licenseIds: alvo.map((l) => l.id), validade });
      setModalAberto(false);
      setSelecionadas(new Set());
    } catch (erro) {
      console.error('[AbaLicencas] falha ao renovar licenças:', erro);
      setErroDaModal('Não foi possível renovar. Confira a lista: parte pode ter sido renovada.');
    }
  };

  const confirmar = async () => {
    if (!confirmacao) return;
    const { tipo, licencas: alvo } = confirmacao;
    const ids = alvo.map((l) => l.id);
    try {
      if (tipo === 'revogar') await gerenciar.revogar(ids);
      else await gerenciar.excluir(ids);
      setConfirmacao(null);
      setSelecionadas(new Set());
    } catch (erro) {
      console.error(`[AbaLicencas] falha ao ${tipo} licenças:`, erro);
      toast({
        title: tipo === 'revogar' ? 'Não foi possível revogar' : 'Não foi possível excluir',
        description: 'Confira a lista: parte das licenças pode não ter sido alterada.',
      });
    }
  };

  const revogando = confirmacao?.tipo === 'revogar';

  return (
    <Panel
      title="Licenças"
      action={
        <Button variant="brand" icon={<Plus size={16} />} onClick={() => abrirModal(null)}>
          Gerar licenças
        </Button>
      }
    >
      {isLoading ? (
        <div className={styles.carregando}>
          <Spinner />
        </div>
      ) : (
        <>
          {marcadas.length > 0 ? (
            <BarraDeSelecao
              selecionadas={marcadas.length}
              aplicaveis={{
                renovar: aplicaveis('renovar', marcadas).length,
                revogar: aplicaveis('revogar', marcadas).length,
                excluir: aplicaveis('excluir', marcadas).length,
              }}
              onAcao={(acao) => executar(acao, aplicaveis(acao, marcadas))}
              onLimpar={() => setSelecionadas(new Set())}
            />
          ) : (
            <p className={styles.resumo}>{resumo(exibidas)}</p>
          )}
          <Table columns={['44px', '25%', '11%', '10%', '20%', '11%', '11%', '6%']}>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={todasMarcadas}
                    onChange={alternarTodas}
                    aria-label="Selecionar todas"
                  />
                </th>
                <th>Chave</th>
                <th>Status</th>
                <th>Validade</th>
                <th>Aparelho</th>
                <th>Ativada em</th>
                <th>Expira em</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {exibidas.map(({ licenca, status }) => {
                const pill = PILL_DO_STATUS[status];
                return (
                  <tr key={licenca.id} className={styles.linha} onClick={() => alternar(licenca.id)}>
                    <td>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={selecionadas.has(licenca.id)}
                        onChange={() => alternar(licenca.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Selecionar ${licenca.key}`}
                      />
                    </td>
                    <td className={styles.chave}>{licenca.key}</td>
                    <td><StatusPill label={pill.label} tone={pill.tone} /></td>
                    <td>{rotuloValidadeLicenca(licenca.validityMonths)}</td>
                    <td className={styles.aparelho} title={licenca.deviceId ?? undefined}>{licenca.deviceId ?? '—'}</td>
                    <td>{formatarData(licenca.claimedAt)}</td>
                    <td>{rotuloExpiracao(licenca, status)}</td>
                    <td className={styles.acoes} onClick={(e) => e.stopPropagation()}>
                      <ActionsMenu
                        ariaLabel={`Ações para ${licenca.key}`}
                        items={acoesDaLinha(status, (acao) => executar(acao, [licenca]))}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          {exibidas.length === 0 && <p className={styles.vazio}>Nenhuma licença gerada para esta empresa.</p>}
        </>
      )}

      {modalAberto && (
        <ModalLicenca
          licencasParaRenovar={licencasParaRenovar}
          salvando={gerenciar.isGerando || gerenciar.isRenovando}
          erro={erroDaModal}
          onGerar={gerar}
          onRenovar={renovar}
          onFechar={() => setModalAberto(false)}
        />
      )}

      <ConfirmModal
        open={confirmacao !== null}
        title={revogando ? 'Revogar licenças?' : 'Excluir licenças?'}
        description={confirmacao ? descricaoDaConfirmacao(confirmacao) : undefined}
        confirmLabel={revogando ? 'Revogar' : 'Excluir'}
        cancelLabel="Cancelar"
        tone="danger"
        isConfirming={gerenciar.isAlterando}
        onConfirm={confirmar}
        onCancel={() => !gerenciar.isAlterando && setConfirmacao(null)}
      />
    </Panel>
  );
}
