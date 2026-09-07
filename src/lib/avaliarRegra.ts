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
