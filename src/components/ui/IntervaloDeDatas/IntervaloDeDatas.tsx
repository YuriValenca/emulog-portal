'use client';

import { X } from 'lucide-react';
import { Input, DATA_MINIMA } from '@/components/ui/Input/Input';
import { hojeLocal, type IntervaloDigitado } from '@/helpers/dataLocal';
import styles from './IntervaloDeDatas.module.scss';

interface IntervaloDeDatasProps {
  id: string;
  intervalo: IntervaloDigitado;
  onChange: (intervalo: IntervaloDigitado) => void;
  rotuloInicio?: string;
  rotuloFim?: string;
  /** Fim vazio aparece como hoje, com um botão para voltar a ele. */
  fimVazioEhHoje?: boolean;
}

// O input de data dispara a cada dígito do ano: só empurra a outra ponta quando a data já é completa
const dataCompleta = (data: string) => data >= DATA_MINIMA;

function comInicio({ fim }: IntervaloDigitado, inicio: string): IntervaloDigitado {
  return { inicio, fim: fim && dataCompleta(inicio) && inicio > fim ? inicio : fim };
}

function comFim({ inicio }: IntervaloDigitado, fim: string): IntervaloDigitado {
  return { fim, inicio: inicio && dataCompleta(fim) && fim < inicio ? fim : inicio };
}

export function IntervaloDeDatas({
  id, intervalo, onChange, rotuloInicio = 'De', rotuloFim = 'Até', fimVazioEhHoje = false,
}: IntervaloDeDatasProps) {
  const hoje = hojeLocal();
  const voltarParaHoje = fimVazioEhHoje && intervalo.fim !== '' && (
    <button type="button" className={styles.limpar} aria-label="Voltar o fim para hoje" onClick={() => onChange({ ...intervalo, fim: '' })}>
      <X />
    </button>
  );

  return (
    <>
      <Input
        id={`${id}-inicio`}
        type="date"
        label={rotuloInicio}
        value={intervalo.inicio}
        max={intervalo.fim || hoje}
        onChange={(e) => onChange(comInicio(intervalo, e.target.value))}
        size="sm"
      />
      <Input
        id={`${id}-fim`}
        type="date"
        label={rotuloFim}
        value={fimVazioEhHoje ? intervalo.fim || hoje : intervalo.fim}
        min={intervalo.inicio || undefined}
        max={hoje}
        onChange={(e) => onChange(comFim(intervalo, e.target.value))}
        rightIcon={voltarParaHoje || undefined}
        size="sm"
      />
    </>
  );
}
