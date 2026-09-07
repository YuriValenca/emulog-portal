'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal/Modal';
import { Select } from '@/components/ui/Select/Select';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import type { RegraDeteccao, RegraOperador } from '@/schemas/regraDeteccao';
import styles from './CriarAutomacaoModal.module.scss';

const OPERADOR_OPTIONS: { value: RegraOperador; label: string }[] = [
  { value: 'entre', label: 'Entre' },
  { value: 'maior', label: 'Maior que' },
  { value: 'menor', label: 'Menor que' },
  { value: 'igual', label: 'Igual a' },
];

export interface CriarAutomacaoValues {
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
  const jaExisteRegra = regrasExistentes.length > 0;

  const [operador, setOperador] = useState<RegraOperador>('maior');
  const [valor1, setValor1] = useState('');
  const [valor2, setValor2] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setOperador('maior');
    setValor1('');
    setValor2('');
    setErro(null);
  }, [open]);

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
      await onSalvar({ operador, valor1: v1, valor2: v2 });
      onOpenChange(false);
    } catch {
      setErro('Não foi possível salvar a automação. Tente novamente.');
    }
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
      description="Configure a condição de diferença Kg previsto/aplicado para gerar ocorrências automaticamente"
      width={420}
      footer={footerContent}
    >
      <div className={styles.form}>
        {jaExisteRegra ? (
          <p className={styles.formError}>Já existe uma automação de diferença Kg configurada. Remova-a antes de criar outra.</p>
        ) : (
          <>
            <div className={styles.field}>
              <span className={styles.label}>Condição</span>
              <Select value={operador} onValueChange={(v) => setOperador(v as RegraOperador)} options={OPERADOR_OPTIONS} disabled={saving} />
            </div>

            {operador === 'entre' ? (
              <div className={styles.row}>
                <Input id="automacao-valor1" label="De" value={valor1} onChange={(e) => setValor1(e.target.value)} disabled={saving} />
                <Input id="automacao-valor2" label="Até" value={valor2} onChange={(e) => setValor2(e.target.value)} disabled={saving} />
              </div>
            ) : (
              <Input id="automacao-valor1" label="Valor (%)" value={valor1} onChange={(e) => setValor1(e.target.value)} disabled={saving} />
            )}
          </>
        )}

        {erro && <p className={styles.formError}>{erro}</p>}
      </div>
    </Modal>
  );
}
