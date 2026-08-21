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

export function parseFloatPTBR(valor: string | undefined): number {
  if (!valor) return NaN;
  const limpo = valor
    .trim()
    .replace(/\./g, '')
    .replace(',', '.');
  return parseFloat(limpo);
}

export function paraNumero(valor: string | number | undefined): number {
  if (valor === undefined || valor === null) return NaN;
  if (typeof valor === 'number') return valor;
  return parseFloatAuto(valor);
}
