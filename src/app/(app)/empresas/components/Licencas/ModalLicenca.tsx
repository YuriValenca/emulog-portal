'use client';

import { useState } from 'react';
import { FormModal } from '@/components/layout/FormModal/FormModal';
import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { LIMITE_LICENCAS_POR_LOTE } from '@/hooks/useGerenciarLicencas';
import { OPCOES_VALIDADE_LICENCA, validadeDoValor, type ValidadeLicenca } from '@/lib/licenca';
import type { License } from '@/types';
import { pluralLicencas } from './acoesDeLicenca';
import styles from './Licencas.module.scss';

const OPCOES_SELECT_VALIDADE = OPCOES_VALIDADE_LICENCA.map((opcao) => ({ value: String(opcao.value), label: opcao.label }));

interface ModalLicencaProps {
  licencasParaRenovar: License[] | null;
  salvando: boolean;
  erro: string | null;
  onGerar: (quantidade: number, validade: ValidadeLicenca) => void;
  onRenovar: (licencas: License[], validade: ValidadeLicenca) => void;
  onFechar: () => void;
}

function erroDaQuantidade(texto: string): string | null {
  const quantidade = Number(texto);
  if (!Number.isInteger(quantidade) || quantidade < 1) return 'Informe um número inteiro a partir de 1.';
  if (quantidade > LIMITE_LICENCAS_POR_LOTE) return `Gere no máximo ${LIMITE_LICENCAS_POR_LOTE} por vez.`;
  return null;
}

export function ModalLicenca({ licencasParaRenovar, salvando, erro, onGerar, onRenovar, onFechar }: ModalLicencaProps) {
  const [quantidade, setQuantidade] = useState('1');
  const [validade, setValidade] = useState('12');

  const renovando = licencasParaRenovar !== null;
  const erroQuantidade = renovando ? null : erroDaQuantidade(quantidade);

  const confirmar = () => {
    if (licencasParaRenovar) onRenovar(licencasParaRenovar, validadeDoValor(validade));
    else onGerar(Number(quantidade), validadeDoValor(validade));
  };

  return (
    <FormModal
      open
      onOpenChange={(aberto) => !aberto && onFechar()}
      title={renovando ? 'Renovar licenças' : 'Gerar licenças'}
      description="O prazo começa a contar na ativação do aparelho."
      rotuloAcao={renovando ? 'Renovar' : 'Gerar'}
      onAcao={confirmar}
      salvando={salvando}
      desabilitado={erroQuantidade !== null}
      erro={erro}
    >
      {licencasParaRenovar ? (
        <p className={styles.chaveNaModal}>
          {licencasParaRenovar.length === 1 ? licencasParaRenovar[0].key : pluralLicencas(licencasParaRenovar.length)}
        </p>
      ) : (
        <Input
          label="Quantidade"
          inputMode="numeric"
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
          errorMessage={erroQuantidade ?? undefined}
        />
      )}
      <Select label="Validade" value={validade} onValueChange={setValidade} options={OPCOES_SELECT_VALIDADE} />
    </FormModal>
  );
}
