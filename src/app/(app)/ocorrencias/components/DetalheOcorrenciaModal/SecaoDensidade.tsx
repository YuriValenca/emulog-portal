import clsx from 'clsx';
import { StatusPill } from '@/components/ui/StatusPill/StatusPill';
import { avaliarAmostras } from '@/lib/detalheOcorrencia';
import type { FaixaResolvida } from '@/lib/densidade';
import type { Projeto } from '@/schemas/projeto';
import { GraficoAmostras } from './GraficoAmostras';
import styles from './DetalheOcorrenciaModal.module.scss';

const formatarDensidade = (valor: number | null) => (valor === null ? '—' : valor.toFixed(2).replace('.', ','));

function formatarDistancia(distancia: number | null): string {
  if (distancia === null) return '—';
  const sinal = distancia > 0 ? '+' : '−';
  return `${sinal}${Math.abs(distancia).toFixed(2).replace('.', ',')}`;
}

function resultado(distancia: number | null, temFinal: boolean) {
  if (!temFinal) return <StatusPill label="Sem final" tone="neutral" />;
  if (distancia === null) return <StatusPill label="Na faixa" tone="ok" />;
  return <StatusPill label={distancia > 0 ? 'Acima da faixa' : 'Abaixo da faixa'} tone="crit" />;
}

export function SecaoDensidade({ projeto, faixa }: { projeto: Projeto; faixa: FaixaResolvida }) {
  const amostras = avaliarAmostras(projeto.amostras, faixa);

  if (amostras.length === 0) {
    return <p className={styles.aviso}>Este fogo não tem amostras registradas.</p>;
  }

  return (
    <section className={styles.secao}>
      <div className={styles.tituloSecao}>
        <h3>Amostras contra a faixa {faixa.origem}</h3>
        <span className={styles.mono}>
          {formatarDensidade(faixa.min)} – {formatarDensidade(faixa.max)} g/cm³
        </span>
        <span className={styles.legenda}>
          <span className={styles.marcadorInicial} /> Inicial
          <span className={styles.marcadorFinal} /> Final
        </span>
      </div>

      <GraficoAmostras amostras={amostras} faixa={faixa} />

      <div className={styles.tabela}>
        <table>
          <thead>
            <tr>
              <th>Amostra</th>
              <th>Dens. inicial</th>
              <th>Dens. final</th>
              <th>Fora da faixa</th>
              <th>Resultado</th>
            </tr>
          </thead>
          <tbody>
            {amostras.map((amostra) => (
              <tr key={amostra.numero} className={clsx(amostra.foraDaFaixa !== null && styles.linhaFora)}>
                <td>Amostra {amostra.numero}</td>
                <td className={styles.mono}>{formatarDensidade(amostra.inicial)}</td>
                <td className={clsx(styles.mono, styles.destaque)}>{formatarDensidade(amostra.final)}</td>
                <td className={styles.mono}>{formatarDistancia(amostra.foraDaFaixa)}</td>
                <td>{resultado(amostra.foraDaFaixa, amostra.final !== null)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
