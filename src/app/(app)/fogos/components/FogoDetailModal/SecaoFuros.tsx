'use client';

import clsx from 'clsx';
import {
  LIMIARES_DESVIO_FURO, desvioRelativo, formatarPercentual, nivelDoDesvio,
  somarCargasReais, totalPrevistoDosFuros, type NivelDesvio,
} from '@/lib/furos';
import { formatarKg } from '@/lib/fogoUtils';
import type { FurosEmPreenchimento } from '@/schemas/projeto';
import styles from './FogoDetailModal.module.scss';

const formatarMetros = (valor: number | null) =>
  valor === null ? '—' : `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} m`;

const formatarCarga = (valor: number | null) => (valor === null ? '—' : `${formatarKg(valor)} kg`);

const CLASSE_DO_NIVEL: Record<NivelDesvio, string | undefined> = {
  normal: undefined,
  alerta: styles.desvioAlerta,
  critico: styles.desvioCritico,
};

function Resumo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className={styles.box}>
      <span className={styles.label}>{rotulo}</span>
      <span className={styles.mono}>{valor}</span>
    </div>
  );
}

function Legenda() {
  const { profundidade, carga } = LIMIARES_DESVIO_FURO;
  return (
    <p className={styles.legendaFuros}>
      Destaque pelo desvio do previsto. Profundidade:{' '}
      <span className={styles.desvioAlerta}>a partir de {formatarPercentual(profundidade.alerta)}</span>{' '}
      <span className={styles.desvioCritico}>a partir de {formatarPercentual(profundidade.critico)}</span>. Carga:{' '}
      <span className={styles.desvioAlerta}>a partir de {formatarPercentual(carga.alerta)}</span>{' '}
      <span className={styles.desvioCritico}>a partir de {formatarPercentual(carga.critico)}</span>.
    </p>
  );
}

export function SecaoFuros({ furos }: { furos: FurosEmPreenchimento }) {
  const { profundidadePrevista, cargaPrevista, itens } = furos;

  return (
    <div className={styles.section}>
      <div className={styles.grid}>
        <Resumo rotulo="Profundidade prevista" valor={formatarMetros(profundidadePrevista)} />
        <Resumo rotulo="Carga prevista por furo" valor={formatarCarga(cargaPrevista)} />
        <Resumo rotulo="Previsto pelos furos" valor={formatarCarga(totalPrevistoDosFuros(furos))} />
        <Resumo rotulo="Aplicado nos furos" valor={formatarCarga(somarCargasReais(itens))} />
      </div>

      <Legenda />

      <div className={styles.tabelaFuros}>
        <table>
          <thead>
            <tr>
              <th>Nº</th>
              <th>Prof. prevista</th>
              <th>Prof. real</th>
              <th>Carga prevista</th>
              <th>Carga real</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((furo, indice) => {
              const nivelProfundidade = nivelDoDesvio(
                desvioRelativo(furo.profundidadeReal, profundidadePrevista),
                LIMIARES_DESVIO_FURO.profundidade
              );
              const nivelCarga = nivelDoDesvio(desvioRelativo(furo.cargaReal, cargaPrevista), LIMIARES_DESVIO_FURO.carga);
              return (
                <tr key={indice}>
                  <td>{indice + 1}</td>
                  <td>{formatarMetros(profundidadePrevista)}</td>
                  <td className={clsx(CLASSE_DO_NIVEL[nivelProfundidade])}>{formatarMetros(furo.profundidadeReal)}</td>
                  <td>{formatarCarga(cargaPrevista)}</td>
                  <td className={clsx(CLASSE_DO_NIVEL[nivelCarga])}>{formatarCarga(furo.cargaReal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
