'use client';

import { useEffect, useRef, useState, type Dispatch, type KeyboardEvent, type SetStateAction } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/Switch/Switch';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import { ConfirmModal } from '@/components/ui/ConfirmModal/ConfirmModal';
import { formatarKg } from '@/lib/fogoUtils';
import {
  aplicarProfundidadePrevista, criarFuro, criarFurosVazios, furoDigitado, furosTemDados, somarCargasDigitadas,
  type FuroFormulario, type FurosFormulario,
} from './furosFormulario';
import styles from './CriarFogoModal.module.scss';

interface SecaoFurosFormularioProps {
  furos: FurosFormulario | null;
  setFuros: Dispatch<SetStateAction<FurosFormulario | null>>;
}

type Campo = 'profundidadeReal' | 'cargaReal';

export function SecaoFurosFormulario({ furos, setFuros }: SecaoFurosFormularioProps) {
  const [confirmarDesligar, setConfirmarDesligar] = useState(false);
  const [furoParaApagar, setFuroParaApagar] = useState<{ id: string; numero: number } | null>(null);
  const inputs = useRef(new Map<string, HTMLInputElement>());
  const idParaFocar = useRef<string | null>(null);
  const itens = furos?.itens ?? [];

  useEffect(() => {
    if (!idParaFocar.current) return;
    inputs.current.get(`${idParaFocar.current}:cargaReal`)?.focus();
    idParaFocar.current = null;
  }, [itens.length]);

  const alternar = (ligar: boolean) => {
    if (ligar) return setFuros(criarFurosVazios());
    if (furos && furosTemDados(furos)) return setConfirmarDesligar(true);
    setFuros(null);
  };

  const alterarFuro = (id: string, campo: Campo, texto: string) =>
    setFuros((atuais) => atuais && {
      ...atuais,
      itens: atuais.itens.map((furo) => (furo.id === id ? { ...furo, [campo]: texto } : furo)),
    });

  const adicionarFuro = (focar = false) => {
    const novo = criarFuro(furos?.profundidadePrevista ?? '');
    if (focar) idParaFocar.current = novo.id;
    setFuros((atuais) => atuais && { ...atuais, itens: [...atuais.itens, novo] });
  };

  const removerFuro = (id: string) =>
    setFuros((atuais) => atuais && { ...atuais, itens: atuais.itens.filter((furo) => furo.id !== id) });

  const pedirRemocao = (furo: FuroFormulario, numero: number) => {
    if (furos && furoDigitado(furo, furos.profundidadePrevista)) return setFuroParaApagar({ id: furo.id, numero });
    removerFuro(furo.id);
  };

  const aoTeclar = (evento: KeyboardEvent<HTMLInputElement>, indice: number, campo: Campo) => {
    if (evento.key !== 'Enter') return;
    evento.preventDefault();
    const furo = itens[indice];
    if (campo === 'profundidadeReal') return inputs.current.get(`${furo.id}:cargaReal`)?.focus();
    const proximo = itens[indice + 1];
    if (proximo) return inputs.current.get(`${proximo.id}:cargaReal`)?.focus();
    if (furo.cargaReal.trim()) adicionarFuro(true);
  };

  const registrarInput = (chave: string) => (input: HTMLInputElement | null) => {
    if (input) inputs.current.set(chave, input);
    else inputs.current.delete(chave);
  };

  return (
    <div className={styles.secaoFuros}>
      <Switch checked={furos !== null} onCheckedChange={alternar} label="Registrar furos" />

      {furos && (
        <>
          <div className={styles.row}>
            <Input
              label="Profundidade prevista (m)"
              value={furos.profundidadePrevista}
              onChange={(e) => setFuros((atuais) => atuais && aplicarProfundidadePrevista(atuais, e.target.value))}
            />
            <Input
              label="Carga prevista por furo (kg)"
              value={furos.cargaPrevista}
              onChange={(e) => setFuros((atuais) => atuais && { ...atuais, cargaPrevista: e.target.value })}
            />
          </div>

          <div className={styles.resumoFuros}>
            <span>{itens.length === 1 ? '1 furo' : `${itens.length} furos`}</span>
            <span>Total aplicado: {formatarKg(somarCargasDigitadas(itens))} kg</span>
          </div>

          <div className={styles.listaFuros}>
            {itens.map((furo, indice) => (
              <div key={furo.id} className={styles.linhaFuro}>
                <span className={styles.rotuloFuro}>Furo {indice + 1}</span>
                <input
                  ref={registrarInput(`${furo.id}:profundidadeReal`)}
                  className={styles.inputFuro}
                  placeholder="Prof. (m)"
                  aria-label={`Profundidade real do furo ${indice + 1}`}
                  value={furo.profundidadeReal}
                  onChange={(e) => alterarFuro(furo.id, 'profundidadeReal', e.target.value)}
                  onKeyDown={(e) => aoTeclar(e, indice, 'profundidadeReal')}
                />
                <input
                  ref={registrarInput(`${furo.id}:cargaReal`)}
                  className={styles.inputFuro}
                  placeholder="Carga (kg)"
                  aria-label={`Carga real do furo ${indice + 1}`}
                  value={furo.cargaReal}
                  onChange={(e) => alterarFuro(furo.id, 'cargaReal', e.target.value)}
                  onKeyDown={(e) => aoTeclar(e, indice, 'cargaReal')}
                />
                <button
                  type="button"
                  className={styles.removeBtn}
                  aria-label={`Apagar furo ${indice + 1}`}
                  onClick={() => pedirRemocao(furo, indice + 1)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <Button type="button" variant="ghost" icon={<Plus size={16} />} onClick={() => adicionarFuro()}>
            Adicionar furo
          </Button>
        </>
      )}

      <ConfirmModal
        open={confirmarDesligar}
        title="Desligar registro de furos?"
        description="Os dados dos furos serão perdidos."
        confirmLabel="Desligar"
        tone="danger"
        onConfirm={() => {
          setFuros(null);
          setConfirmarDesligar(false);
        }}
        onCancel={() => setConfirmarDesligar(false)}
      />

      <ConfirmModal
        open={furoParaApagar !== null}
        title={`Apagar o Furo ${furoParaApagar?.numero ?? ''}?`}
        description="Os dados digitados serão perdidos."
        confirmLabel="Apagar"
        tone="danger"
        onConfirm={() => {
          if (furoParaApagar) removerFuro(furoParaApagar.id);
          setFuroParaApagar(null);
        }}
        onCancel={() => setFuroParaApagar(null)}
      />
    </div>
  );
}
