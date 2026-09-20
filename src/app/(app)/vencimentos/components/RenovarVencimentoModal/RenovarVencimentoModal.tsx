'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import type { Vencimento } from '@/types';

interface RenovarVencimentoModalProps {
  vencimento: Vencimento | null;
  onClose: () => void;
  onSalvar: (data: Date) => Promise<void> | void;
  saving?: boolean;
}

export default function RenovarVencimentoModal({ vencimento, onClose, onSalvar, saving = false }: RenovarVencimentoModalProps) {
  const [dataVencimento, setDataVencimento] = useState('');

  useEffect(() => {
    if (vencimento) setDataVencimento('');
  }, [vencimento]);

  const handleSalvar = async () => {
    if (!dataVencimento) return;
    const [ano, mes, dia] = dataVencimento.split('-').map(Number);
    await onSalvar(new Date(ano, mes - 1, dia, 23, 59, 0));
  };

  return (
    <Modal
      open={vencimento !== null}
      onOpenChange={(v) => !v && onClose()}
      title="Renovar vencimento"
      width={340}
      footer={
        <Button variant="ok" onClick={handleSalvar} loading={saving} disabled={saving || !dataVencimento}>
          Salvar nova data
        </Button>
      }
    >
      <Input
        id="renovar-data"
        type="date"
        label="Nova data de vencimento"
        value={dataVencimento}
        onChange={(e) => setDataVencimento(e.target.value)}
        disabled={saving}
      />
    </Modal>
  );
}
