'use client';

import { useState } from 'react';
import { FormModal } from '@/components/layout/FormModal/FormModal';
import { Select } from '@/components/ui/Select/Select';
import { Input } from '@/components/ui/Input/Input';
import { Textarea } from '@/components/ui/Textarea/Textarea';
import { useVencimentos } from '@/hooks/vencimentos/useVencimentos';
import { rotuloCaminhao } from '@/helpers/rotuloCaminhao';
import { opcoesDeTipo, type TipoPadrao } from '@/lib/vencimento';
import type { Caminhao, Operador, TipoVencimentoPersonalizado, VencimentoTipo } from '@/types';
import styles from './CriarVencimentoModal.module.scss';

const PLACEHOLDER_DO_TITULO: Partial<Record<VencimentoTipo, string>> = {
  calibracao_equipamento: 'Ex: Sismógrafo SIS-04',
  manual: 'Ex: Alvará da pedreira',
  personalizado: 'Ex: UMB 03 ou Licença de operação',
};

interface CriarVencimentoModalProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  uidUsuario: string;
  companyIds: string[];
  caminhoes: Caminhao[];
  operadores: Operador[];
  tiposPersonalizados: TipoVencimentoPersonalizado[];
}

export default function CriarVencimentoModal({
  open, onClose, companyId, uidUsuario, companyIds, caminhoes, operadores, tiposPersonalizados,
}: CriarVencimentoModalProps) {
  const { criarVencimento, isCriando } = useVencimentos(companyIds);

  const [chaveDoTipo, setChaveDoTipo] = useState<string>('documento_umb');
  const [caminhaoId, setCaminhaoId] = useState('');
  const [operadorId, setOperadorId] = useState('');
  const [tituloManual, setTituloManual] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dataVencimento, setDataVencimento] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const tipoPersonalizado = tiposPersonalizados.find((t) => t.id === chaveDoTipo) ?? null;
  const tipo: VencimentoTipo = tipoPersonalizado ? 'personalizado' : (chaveDoTipo as TipoPadrao);
  const precisaCaminhao = tipo === 'documento_umb';
  const precisaOperador = tipo === 'certificacao_operador';
  const precisaTitulo = tipo === 'manual' || tipo === 'calibracao_equipamento' || tipo === 'personalizado';

  const handleSalvar = async () => {
    if (!dataVencimento) {
      setErro('Informe a data de vencimento.');
      return;
    }
    if (precisaCaminhao && !caminhaoId) {
      setErro('Selecione a UMB.');
      return;
    }
    if (precisaOperador && !operadorId) {
      setErro('Selecione o operador.');
      return;
    }
    if (precisaTitulo && !tituloManual.trim()) {
      setErro('Informe um título.');
      return;
    }

    const [ano, mes, dia] = dataVencimento.split('-').map(Number);
    const data = new Date(ano, mes - 1, dia, 23, 59, 0);

    const caminhao = precisaCaminhao ? caminhoes.find((c) => c.id === caminhaoId) : undefined;
    const operador = precisaOperador ? operadores.find((o) => o.id === operadorId) : undefined;

    setErro(null);
    try {
      await criarVencimento({
        companyId,
        responsavelUid: uidUsuario,
        tipo,
        tipoPersonalizado: tipoPersonalizado ? { id: tipoPersonalizado.id, nome: tipoPersonalizado.nome } : null,
        tituloManual: precisaTitulo ? tituloManual.trim() : null,
        caminhao: caminhao ? { id: caminhao.id, placa: caminhao.placa } : null,
        operador: operador ? { id: operador.id, nome: operador.nome } : null,
        descricao: descricao.trim() || null,
        dataVencimento: data,
      });
      onClose();
    } catch {
      setErro('Não foi possível registrar o vencimento. Tente novamente.');
    }
  };

  return (
    <FormModal
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title="Novo vencimento"
      width={420}
      rotuloAcao="Registrar vencimento"
      onAcao={handleSalvar}
      salvando={isCriando}
      erro={erro}
    >
      <div className={styles.field}>
        <span className={styles.label}>Tipo</span>
        <Select value={chaveDoTipo} onValueChange={setChaveDoTipo} options={opcoesDeTipo(tiposPersonalizados)} disabled={isCriando} />
      </div>

      {precisaCaminhao && (
        <div className={styles.field}>
          <span className={styles.label}>UMB</span>
          <Select
            value={caminhaoId}
            onValueChange={setCaminhaoId}
            options={caminhoes.map((c) => ({ value: c.id, label: rotuloCaminhao(c) }))}
            placeholder="Selecionar UMB"
            disabled={isCriando}
          />
        </div>
      )}

      {precisaOperador && (
        <div className={styles.field}>
          <span className={styles.label}>Operador</span>
          <Select
            value={operadorId}
            onValueChange={setOperadorId}
            options={operadores.map((o) => ({ value: o.id, label: o.nome }))}
            placeholder="Selecionar operador"
            disabled={isCriando}
          />
        </div>
      )}

      {precisaTitulo && (
        <Input
          id="vencimento-titulo"
          label="Título"
          placeholder={PLACEHOLDER_DO_TITULO[tipo]}
          value={tituloManual}
          onChange={(e) => setTituloManual(e.target.value)}
          maxLength={80}
          disabled={isCriando}
        />
      )}

      <Input
        id="vencimento-data"
        type="date"
        label="Vence em"
        value={dataVencimento}
        onChange={(e) => setDataVencimento(e.target.value)}
        disabled={isCriando}
      />

      <Textarea
        id="vencimento-descricao"
        label="Observações (opcional)"
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        maxLength={500}
        disabled={isCriando}
      />
    </FormModal>
  );
}
