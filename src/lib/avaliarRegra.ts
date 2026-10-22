import type { RegraDeteccao } from '@/schemas/regraDeteccao';

export function avaliarRegra(regra: RegraDeteccao, valor: number): boolean {
  if (regra.operador === 'entre') {
    if (regra.valor2 === null) return false;
    return valor >= regra.valor1 && valor <= regra.valor2;
  }
  if (regra.operador === 'maior') return valor > regra.valor1;
  if (regra.operador === 'menor') return valor < regra.valor1;
  return valor === regra.valor1;
}

const LIMITE_DIFERENCA_KG_PADRAO = 5;

/** Sem regra de diferença de Kg cadastrada, vale o limite padrão de 5%. */
export function diferencaKgExcedida(dif: number, regras: RegraDeteccao[]): boolean {
  const regrasDeKg = regras.filter((regra) => regra.metrica === 'diferenca_kg');
  if (regrasDeKg.length === 0) return dif > LIMITE_DIFERENCA_KG_PADRAO;
  return regrasDeKg.some((regra) => avaliarRegra(regra, dif));
}
