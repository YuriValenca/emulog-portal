import clsx from 'clsx';
import { paraKg } from '@/helpers/parseNumbers';
import { furosComMaiorDesvio, type FuroDestacado } from '@/lib/detalheOcorrencia';
import { diffPercent, formatarKg } from '@/lib/fogoUtils';
import type { Projeto } from '@/schemas/projeto';
import styles from './DetalheOcorrenciaModal.module.scss';

interface SecaoDiferencaKgProps {
  projeto: Projeto;
  criterio: string;
}

function Barra({ rotulo, kg, maximo, destaque = false }: { rotulo: string; kg: number; maximo: number; destaque?: boolean }) {
  return (
    <>
      <span className={styles.rotuloBarra}>{rotulo}</span>
      <div className={styles.trilho}>
        <div className={clsx(styles.barra, destaque && styles.barraDestaque)} style={{ width: `${(kg / maximo) * 100}%` }} />
      </div>
      <span className={clsx(styles.mono, styles.valorBarra, destaque && styles.destaque)}>{formatarKg(kg)} kg</span>
    </>
  );
}

function resumoDaDiferenca(previsto: number, aplicado: number): string {
  const diferenca = Math.abs(aplicado - previsto);
  return `${formatarKg(diferenca)} kg ${aplicado > previsto ? 'acima' : 'abaixo'} do previsto.`;
}

function TabelaFuros({ furos }: { furos: FuroDestacado[] }) {
  return (
    <section className={styles.secao}>
      <div className={styles.tituloSecao}>
        <h3>Furos com maior desvio de carga</h3>
      </div>
      <div className={styles.tabela}>
        <table>
          <thead>
            <tr>
              <th>Furo</th>
              <th>Carga real</th>
              <th>Desvio do previsto</th>
            </tr>
          </thead>
          <tbody>
            {furos.map((furo) => (
              <tr key={furo.numero}>
                <td>Furo {furo.numero}</td>
                <td className={styles.mono}>{formatarKg(furo.cargaReal)} kg</td>
                <td className={clsx(styles.mono, furo.nivel === 'critico' ? styles.desvioCritico : styles.desvioAlerta)}>
                  {furo.desvio > 0 ? '+' : '−'}{Math.round(Math.abs(furo.desvio) * 100)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function SecaoDiferencaKg({ projeto, criterio }: SecaoDiferencaKgProps) {
  const info = projeto.informacoesOperacao;
  const previsto = paraKg(info?.kgPrevisto ?? null);
  const aplicado = paraKg(info?.kgAplicado ?? null);
  const dif = info ? diffPercent(info.kgPrevisto, info.kgAplicado) : null;
  const furos = projeto.furos ? furosComMaiorDesvio(projeto.furos) : [];

  if (previsto === null || aplicado === null || dif === null) {
    return <p className={styles.aviso}>O Kg previsto ou aplicado deste fogo não está preenchido.</p>;
  }

  const maximo = Math.max(previsto, aplicado);

  return (
    <>
      <section className={clsx(styles.secao, styles.cartao)}>
        <div className={styles.tituloSecao}>
          <h3>Previsto contra aplicado</h3>
          <span className={styles.legenda}>{criterio}</span>
        </div>
        <div className={styles.barras}>
          <Barra rotulo="Previsto" kg={previsto} maximo={maximo} />
          <Barra rotulo="Aplicado" kg={aplicado} maximo={maximo} destaque />
        </div>
        <p className={styles.resumoKg}>
          Diferença de <strong>{dif.toFixed(1).replace('.', ',')}%</strong>. {resumoDaDiferenca(previsto, aplicado)}
        </p>
      </section>

      {furos.length > 0 && <TabelaFuros furos={furos} />}
    </>
  );
}
