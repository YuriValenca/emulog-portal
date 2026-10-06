// TODO: Fase B — peso e densidade passam a ser `number` no schema e estas duas funções saem
// junto com a tolerância de `lib/amostras.ts`, que é o único uso que sobrou.
export function parseFloatAuto(valor: string | number | undefined): number {
  if (valor === undefined || valor === null) return NaN;
  if (typeof valor === 'number') return valor;
  if (valor === '') return NaN;

  const limpo = valor.trim();
  const temVirgula = limpo.includes(',');
  const temPonto = limpo.includes('.');

  if (temVirgula && temPonto) {
    const ultimaVirgula = limpo.lastIndexOf(',');
    const ultimoPonto = limpo.lastIndexOf('.');
    return ultimaVirgula > ultimoPonto
      ? parseFloat(limpo.replace(/\./g, '').replace(',', '.'))
      : parseFloat(limpo.replace(/,/g, ''));
  }
  if (temVirgula) {
    return parseFloat(limpo.replace(',', '.'));
  }
  return parseFloat(limpo);
}

export function paraNumero(valor: string | number | undefined): number {
  if (valor === undefined || valor === null) return NaN;
  if (typeof valor === 'number') return valor;
  return parseFloatAuto(valor);
}

export type ValorKg = string | number | null | undefined;

const SO_MILHAR_COM_PONTO = /^\d{1,3}(\.\d{3})+$/;

function normalizarKgPtBr(texto: string): string {
  if (texto.includes(',')) return texto.replace(/\./g, '').replace(',', '.');
  if (SO_MILHAR_COM_PONTO.test(texto)) return texto.replace(/\./g, '');
  return texto;
}

/**
 * Regra pt-BR única para kg: com vírgula, ponto é milhar ("1.500,5" → 1500.5); só pontos no
 * padrão de milhar também ("1.480" → 1480); qualquer outro ponto é decimal ("12.5" → 12.5).
 */
export function paraKg(valor: ValorKg): number | null {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;

  const limpo = valor.trim();
  if (!limpo) return null;

  const numero = parseFloat(normalizarKgPtBr(limpo));
  return Number.isFinite(numero) ? numero : null;
}
