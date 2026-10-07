'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal/Modal';
import { Select } from '@/components/ui/Select/Select';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import type { RegraDeteccao, RegraMetrica, RegraOperador } from '@/schemas/regraDeteccao';
import styles from './CriarAutomacaoModal.module.scss';

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

export interface CriarAutomacaoValues {
  metrica: RegraMetrica;
  operador: RegraOperador;
  valor1: number;
  valor2: number | null;
}

interface CriarAutomacaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSalvar: (values: CriarAutomacaoValues) => Promise<void> | void;
  regrasExistentes: RegraDeteccao[];
  saving?: boolean;
}

export default function CriarAutomacaoModal({ open, onOpenChange, onSalvar, regrasExistentes, saving = false }: CriarAutomacaoModalProps) {
  const [metrica, setMetrica] = useState<RegraMetrica>('diferenca_kg');
  const config = METRICA_CONFIG[metrica];
  const jaExisteRegra = regrasExistentes.some((regra) => regra.metrica === metrica);

  const [operadorEscolhido, setOperador] = useState<RegraOperador>('maior');
  const operador = config.operadorFixo ?? operadorEscolhido;
  const [valor1, setValor1] = useState('');
  const [valor2, setValor2] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const parseValor = (raw: string) => {
    const numero = parseFloat(raw.replace(',', '.'));
    return isNaN(numero) ? null : numero;
  };

  const handleSalvar = async () => {
    const v1 = parseValor(valor1);
    if (v1 === null) {
      setErro('Informe um valor numérico válido.');
      return;
    }
    if (config.somenteInteiro && (!Number.isInteger(v1) || v1 < 1)) {
      setErro('Informe um número inteiro de dias, a partir de 1.');
      return;
    }

    let v2: number | null = null;
    if (operador === 'entre') {
      v2 = parseValor(valor2);
      if (v2 === null) {
        setErro('Informe o segundo valor do intervalo.');
        return;
      }
      if (v2 <= v1) {
        setErro('O valor final deve ser maior que o inicial.');
        return;
      }
    }

    setErro(null);
    try {
      await onSalvar({ metrica, operador, valor1: v1, valor2: v2 });
      onOpenChange(false);
    } catch {
      setErro('Não foi possível salvar a automação. Tente novamente.');
    }
  };

  const mudarMetrica = (valor: string) => {
    setMetrica(valor as RegraMetrica);
    setValor1('');
    setValor2('');
    setErro(null);
  };

  const footerContent = (
    <div className={styles.footerContent}>
      <p className={styles.contatoNota}>
        Tem mais ideias para incluir aqui? Entre em contato conosco no emulo.app@gmail.com
      </p>
      <Button variant="ok" onClick={handleSalvar} loading={saving} disabled={saving || jaExisteRegra}>
        Criar automação
      </Button>
    </div>
  );

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Nova automação"
      description={config.descricao}
      width={420}
      footer={footerContent}
    >
      <div className={styles.form}>
        <div className={styles.field}>
          <span className={styles.label}>Tipo de automação</span>
          <Select value={metrica} onValueChange={mudarMetrica} options={METRICA_OPTIONS} disabled={saving} />
        </div>

        {jaExisteRegra ? (
          <p className={styles.formError}>{config.avisoJaExiste}</p>
        ) : (
          <>
            {!config.operadorFixo && (
              <div className={styles.field}>
                <span className={styles.label}>Condição</span>
                <Select value={operador} onValueChange={(v) => setOperador(v as RegraOperador)} options={OPERADOR_OPTIONS} disabled={saving} />
              </div>
            )}

            {operador === 'entre' ? (
              <div className={styles.row}>
                <Input id="automacao-valor1" label={config.labelDe} value={valor1} onChange={(e) => setValor1(e.target.value)} disabled={saving} />
                <Input id="automacao-valor2" label={config.labelAte} value={valor2} onChange={(e) => setValor2(e.target.value)} disabled={saving} />
              </div>
            ) : (
              <Input id="automacao-valor1" label={config.labelValor} value={valor1} onChange={(e) => setValor1(e.target.value)} disabled={saving} />
            )}
          </>
        )}

        {erro && <p className={styles.formError}>{erro}</p>}
      </div>
    </Modal>
  );
}
