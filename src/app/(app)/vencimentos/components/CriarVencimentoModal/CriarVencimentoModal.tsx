'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal/Modal';
import { Select } from '@/components/ui/Select/Select';
import { Input } from '@/components/ui/Input/Input';
import { Textarea } from '@/components/ui/Textarea/Textarea';
import { Button } from '@/components/ui/Button/Button';
import { useVencimentos } from '@/hooks/vencimentos/useVencimentos';
import type { Caminhao, Operador, VencimentoTipo } from '@/types';
import styles from './CriarVencimentoModal.module.scss';

const TIPO_OPTIONS: { value: VencimentoTipo; label: string }[] = [
  { value: 'documento_umb', label: 'Documento de UMB' },
  { value: 'certificacao_operador', label: 'Certificação de operador' },
  { value: 'calibracao_equipamento', label: 'Calibração de equipamento' },
  { value: 'manual', label: 'Outro' },
];

interface CriarVencimentoModalProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  uidUsuario: string;
  companyIds: string[];
  caminhoes: Caminhao[];
  operadores: Operador[];
}

export default function CriarVencimentoModal({
  open, onClose, companyId, uidUsuario, companyIds, caminhoes, operadores,
}: CriarVencimentoModalProps) {
  const { criarVencimento, isCriando } = useVencimentos(companyIds);

  const [tipo, setTipo] = useState<VencimentoTipo>('documento_umb');
  const [caminhaoId, setCaminhaoId] = useState('');
  const [operadorId, setOperadorId] = useState('');
  const [tituloManual, setTituloManual] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dataVencimento, setDataVencimento] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const precisaCaminhao = tipo === 'documento_umb';
  const precisaOperador = tipo === 'certificacao_operador';
  const precisaTitulo = tipo === 'manual' || tipo === 'calibracao_equipamento';

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
    <Modal
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title="Novo vencimento"
      width={420}
      footer={
        <Button variant="ok" onClick={handleSalvar} loading={isCriando} disabled={isCriando}>
          Registrar vencimento
        </Button>
      }
    >
      <div className={styles.form}>
        <div className={styles.field}>
          <span className={styles.label}>Tipo</span>
          <Select value={tipo} onValueChange={(v) => setTipo(v as VencimentoTipo)} options={TIPO_OPTIONS} disabled={isCriando} />
        </div>

        {precisaCaminhao && (
          <div className={styles.field}>
            <span className={styles.label}>UMB</span>
            <Select
              value={caminhaoId}
              onValueChange={setCaminhaoId}
              options={caminhoes.map((c) => ({ value: c.id, label: c.tag ?? c.placa }))}
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
            placeholder={tipo === 'calibracao_equipamento' ? 'Ex: Sismógrafo SIS-04' : 'Ex: Alvará da pedreira'}
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

        {erro && <p className={styles.formError}>{erro}</p>}
      </div>
    </Modal>
  );
}
