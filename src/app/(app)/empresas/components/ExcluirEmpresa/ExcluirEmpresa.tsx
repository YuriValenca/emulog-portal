'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button/Button';
import { ConfirmModal } from '@/components/ui/ConfirmModal/ConfirmModal';
import { useToast } from '@/components/ui/Toast/Toast';
import { MENSAGEM_BLOQUEIO, useExcluirEmpresa, verificarBloqueioExclusao } from '@/hooks/useExcluirEmpresa';
import type { Company } from '@/types';
import styles from './ExcluirEmpresa.module.scss';

interface ExcluirEmpresaProps {
  empresa: Company;
  disabled?: boolean;
  onExcluida: () => void;
}

export function ExcluirEmpresa({ empresa, disabled, onExcluida }: ExcluirEmpresaProps) {
  const { toast } = useToast();
  const excluir = useExcluirEmpresa();
  const [verificando, setVerificando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  const handlePedirExclusao = async () => {
    setVerificando(true);
    try {
      const bloqueio = await verificarBloqueioExclusao(empresa);
      if (bloqueio) {
        toast({ title: 'Não é possível excluir', description: MENSAGEM_BLOQUEIO[bloqueio] });
        return;
      }
      setConfirmando(true);
    } catch (erro) {
      console.error('[ExcluirEmpresa] falha ao verificar bloqueios', erro);
      toast({ title: 'Não foi possível verificar a empresa', description: 'Tente novamente.' });
    } finally {
      setVerificando(false);
    }
  };

  const handleConfirmar = async () => {
    try {
      const { falhas } = await excluir.mutateAsync(empresa);
      toast({
        title: 'Empresa excluída',
        description: falhas > 0
          ? `${falhas} registro(s) da empresa não puderam ser apagados. Veja o console.`
          : `"${empresa.name}" e os dados dela foram apagados.`,
      });
      setConfirmando(false);
      onExcluida();
    } catch (erro) {
      console.error('[ExcluirEmpresa] falha ao excluir', erro);
      toast({
        title: 'Não foi possível excluir',
        description: erro instanceof Error ? erro.message : 'Nada foi apagado. Tente novamente.',
      });
    }
  };

  return (
    <>
      <Button
        variant="cancel"
        icon={<Trash2 size={14} />}
        onClick={handlePedirExclusao}
        loading={verificando}
        disabled={disabled}
        className={styles.botao}
      >
        Excluir empresa
      </Button>
      <ConfirmModal
        open={confirmando}
        title={`Excluir "${empresa.name}"?`}
        description="Apaga a empresa, as licenças, os usuários, UMBs, operadores, produtos, clientes, ocorrências, vencimentos e automações. As contas de login continuam existindo no Firebase Auth. Não dá para desfazer."
        confirmLabel="Excluir empresa"
        tone="danger"
        isConfirming={excluir.isPending}
        onConfirm={handleConfirmar}
        onCancel={() => setConfirmando(false)}
      />
    </>
  );
}
