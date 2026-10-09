'use client';

import { useState } from 'react';
import { Plus, ChevronDown, ChevronUp, Check, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import styles from './CriarFogoModal.module.scss';

export type TipoDensidade = 'inicial' | 'final';

export interface AmostraValores {
  densidadeInicial: number | null;
  densidadeFinal: number | null;
}

export function parseDensidade(value: string): number | null {
  if (!value) return null;
  const numero = Number(value.replace(',', '.').trim());
  return Number.isFinite(numero) ? numero : null;
}

export const isAmostraCompleta = (amostra: AmostraValores) =>
  amostra.densidadeInicial !== null && amostra.densidadeFinal !== null;

interface SecaoAmostrasProps {
  campos: { id: string }[];
  amostras: AmostraValores[];
  mensagemDeErro: (amostraIndex: number, tipo: TipoDensidade) => string | undefined;
  onAdicionar: () => void;
  onPedirConfirmacao: (amostraIndex: number, tipo: TipoDensidade, numero: number) => void;
}

/** Recolhimento e texto digitado vivem aqui; para zerar tudo, o pai remonta com outra `key`. */
export function SecaoAmostras({ campos, amostras, mensagemDeErro, onAdicionar, onPedirConfirmacao }: SecaoAmostrasProps) {
  const [recolhidas, setRecolhidas] = useState<Set<string>>(new Set());
  const [digitado, setDigitado] = useState<Record<string, Record<TipoDensidade, string>>>({});

  const alternarRecolhida = (id: string) => {
    setRecolhidas((atuais) => {
      const proximas = new Set(atuais);
      if (proximas.has(id)) proximas.delete(id);
      else proximas.add(id);
      return proximas;
    });
  };

  const textoDigitado = (id: string, tipo: TipoDensidade) => digitado[id]?.[tipo] ?? '';

  const digitar = (id: string, tipo: TipoDensidade, valor: string) =>
    setDigitado((atuais) => ({ ...atuais, [id]: { ...atuais[id], [tipo]: valor } }));

  const confirmar = (amostraIndex: number, id: string, tipo: TipoDensidade) => {
    const numero = parseDensidade(textoDigitado(id, tipo));
    if (numero !== null) onPedirConfirmacao(amostraIndex, tipo, numero);
  };

  return (
    <div className={styles.amostras}>
      {campos.map((campo, amostraIndex) => {
        const amostraAtual = amostras[amostraIndex];
        const completa = amostraAtual ? isAmostraCompleta(amostraAtual) : false;
        const recolhida = recolhidas.has(campo.id);

        return (
          <div key={campo.id} className={styles.amostraBox}>
            <div className={styles.amostraHeader}>
              <span className={styles.amostraTitulo}>Amostra {amostraIndex + 1}</span>
              <span className={clsx(styles.amostraProgress, completa && styles.amostraProgressDone)}>
                {completa ? 'Completa' : 'Incompleta'}
              </span>
              <button
                type="button"
                className={styles.collapseBtn}
                onClick={() => alternarRecolhida(campo.id)}
                aria-expanded={!recolhida}
                aria-label={recolhida ? 'Expandir amostra' : 'Recolher amostra'}
              >
                {recolhida ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </button>
            </div>

            <div className={clsx(styles.collapseWrapper, !recolhida && styles.collapseWrapperOpen)} aria-hidden={recolhida}>
              <div className={styles.collapseInner}>
                {(['inicial', 'final'] as TipoDensidade[]).map((tipo) => {
                  const confirmado = tipo === 'inicial' ? amostraAtual?.densidadeInicial : amostraAtual?.densidadeFinal;
                  const label = tipo === 'inicial' ? 'Densidade inicial' : 'Densidade final';
                  const errorMessage = mensagemDeErro(amostraIndex, tipo);

                  if (confirmado !== null && confirmado !== undefined) {
                    return (
                      <div key={tipo} className={styles.densidadeConfirmedRow}>
                        <CheckCircle2 size={16} color="var(--ok)" />
                        <span>{label}: {confirmado.toFixed(2)} g/cm³</span>
                      </div>
                    );
                  }

                  return (
                    <div key={tipo} className={styles.densidadeRow}>
                      <div className={styles.densidadeInputWrapper}>
                        <Input
                          label={label}
                          placeholder="g/cm³"
                          value={textoDigitado(campo.id, tipo)}
                          onChange={(e) => digitar(campo.id, tipo, e.target.value)}
                          errorMessage={errorMessage}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        icon={<Check size={20} />}
                        disabled={parseDensidade(textoDigitado(campo.id, tipo)) === null}
                        onClick={() => confirmar(amostraIndex, campo.id, tipo)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}

      <Button type="button" variant="ghost" icon={<Plus size={16} />} onClick={onAdicionar}>
        Adicionar amostra
      </Button>
    </div>
  );
}
