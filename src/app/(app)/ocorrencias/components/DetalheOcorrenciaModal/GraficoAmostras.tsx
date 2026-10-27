import clsx from 'clsx';
import type { FaixaDensidade } from '@/lib/densidade';
import type { AmostraAvaliada } from '@/lib/detalheOcorrencia';
import styles from './DetalheOcorrenciaModal.module.scss';

const LARGURA = 640;
const ALTURA = 170;
const MARGEM = { topo: 14, base: 28, esquerda: 44, direita: 12 };
const MAXIMO_DE_ROTULOS = 20;
const DISTANCIA_MINIMA_ENTRE_MARCAS = 14;

interface Escala {
  x: (indice: number) => number;
  y: (valor: number) => number;
}

const formatarMarca = (valor: number) => valor.toFixed(2).replace('.', ',');

function densidadesDoGrafico(amostras: AmostraAvaliada[]): number[] {
  return amostras.flatMap((a) => [a.inicial, a.final]).filter((v): v is number => v !== null);
}

function criarEscala(amostras: AmostraAvaliada[], faixa: FaixaDensidade): Escala {
  const valores = densidadesDoGrafico(amostras);
  const menor = Math.min(faixa.min, ...valores);
  const maior = Math.max(faixa.max, ...valores);
  const folga = Math.max((maior - menor) * 0.15, 0.02);
  const [inferior, superior] = [menor - folga, maior + folga];

  const larguraUtil = LARGURA - MARGEM.esquerda - MARGEM.direita;
  const alturaUtil = ALTURA - MARGEM.topo - MARGEM.base;
  return {
    x: (indice) => MARGEM.esquerda + ((indice + 0.5) * larguraUtil) / amostras.length,
    y: (valor) => MARGEM.topo + ((superior - valor) / (superior - inferior)) * alturaUtil,
  };
}

/** Maior densidade acima da faixa e menor abaixo dela, quando não ficam coladas nas marcas da faixa. */
function marcasForaDaFaixa(amostras: AmostraAvaliada[], faixa: FaixaDensidade, y: Escala['y']): number[] {
  const valores = densidadesDoGrafico(amostras);
  if (valores.length === 0) return [];

  const maior = Math.max(...valores);
  const menor = Math.min(...valores);
  const distante = (valor: number, limite: number) => Math.abs(y(limite) - y(valor)) >= DISTANCIA_MINIMA_ENTRE_MARCAS;
  return [
    ...(maior > faixa.max && distante(maior, faixa.max) ? [maior] : []),
    ...(menor < faixa.min && distante(menor, faixa.min) ? [menor] : []),
  ];
}

function descreverGrafico(amostras: AmostraAvaliada[], faixa: FaixaDensidade): string {
  const fora = amostras.filter((a) => a.foraDaFaixa !== null).map((a) => a.numero);
  const faixaTexto = `faixa de ${faixa.min.toFixed(2)} a ${faixa.max.toFixed(2)} g/cm³`;
  if (fora.length === 0) return `Densidades de ${amostras.length} amostras, todas dentro da ${faixaTexto}`;
  return `Densidades de ${amostras.length} amostras contra a ${faixaTexto}; fora da faixa: amostra ${fora.join(', ')}`;
}

export function GraficoAmostras({ amostras, faixa }: { amostras: AmostraAvaliada[]; faixa: FaixaDensidade }) {
  const { x, y } = criarEscala(amostras, faixa);
  const fimDoEixo = LARGURA - MARGEM.direita;
  return (
    <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} className={styles.grafico} role="img" aria-label={descreverGrafico(amostras, faixa)}>
      <rect className={styles.faixa} x={MARGEM.esquerda} y={y(faixa.max)} width={fimDoEixo - MARGEM.esquerda} height={y(faixa.min) - y(faixa.max)} />
      {[faixa.max, faixa.min].map((limite) => (
        <g key={limite}>
          <line className={styles.bordaFaixa} x1={MARGEM.esquerda} x2={fimDoEixo} y1={y(limite)} y2={y(limite)} />
          <text className={styles.eixo} x={MARGEM.esquerda - 8} y={y(limite) + 4} textAnchor="end">
            {formatarMarca(limite)}
          </text>
        </g>
      ))}
      {marcasForaDaFaixa(amostras, faixa, y).map((valor) => (
        <g key={valor}>
          <line className={styles.marcaAmostra} x1={MARGEM.esquerda} x2={fimDoEixo} y1={y(valor)} y2={y(valor)} />
          <text className={styles.eixo} x={MARGEM.esquerda - 8} y={y(valor) + 4} textAnchor="end">
            {formatarMarca(valor)}
          </text>
        </g>
      ))}

      {amostras.map((amostra, indice) => (
        <g key={amostra.numero}>
          {amostra.inicial !== null && amostra.final !== null && (
            <line className={styles.haste} x1={x(indice)} x2={x(indice)} y1={y(amostra.inicial)} y2={y(amostra.final)} />
          )}
          {amostra.inicial !== null && <circle className={styles.pontoInicial} cx={x(indice)} cy={y(amostra.inicial)} r={4} />}
          {amostra.final !== null && (
            <circle
              className={clsx(amostra.foraDaFaixa === null ? styles.pontoFinal : styles.pontoFora)}
              cx={x(indice)}
              cy={y(amostra.final)}
              r={amostra.foraDaFaixa === null ? 5 : 7}
            />
          )}
          {amostras.length <= MAXIMO_DE_ROTULOS && (
            <text className={styles.eixo} x={x(indice)} y={ALTURA - 8} textAnchor="middle">
              A{amostra.numero}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
