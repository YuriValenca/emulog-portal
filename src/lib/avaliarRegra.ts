import type { RegraDeteccao, RegraMetrica, RegraOperador } from '@/schemas/regraDeteccao';

const OPERADOR_LABEL: Record<RegraOperador, string> = {
  entre: 'entre',
  maior: 'maior que',
  menor: 'menor que',
  igual: 'igual a',
};

const METRICA_UNIDADE: Record<RegraMetrica, string> = {
  diferenca_kg: '%',
  rascunho_parado: ' dias',
};

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

export function condicaoDaRegra(regra: RegraDeteccao): string {
  const unidade = METRICA_UNIDADE[regra.metrica];
  if (regra.operador === 'entre') return `entre ${regra.valor1}${unidade} e ${regra.valor2}${unidade}`;
  return `${OPERADOR_LABEL[regra.operador]} ${regra.valor1}${unidade}`;
}

function regrasDeDiferencaKg(regras: RegraDeteccao[]): RegraDeteccao[] {
  return regras.filter((regra) => regra.metrica === 'diferenca_kg');
}

/** Sem regra de diferença de Kg cadastrada, vale o limite padrão de 5%. */
export function diferencaKgExcedida(dif: number, regras: RegraDeteccao[]): boolean {
  const regrasDeKg = regrasDeDiferencaKg(regras);
  if (regrasDeKg.length === 0) return dif > LIMITE_DIFERENCA_KG_PADRAO;
  return regrasDeKg.some((regra) => avaliarRegra(regra, dif));
}

export function criterioDiferencaKg(regras: RegraDeteccao[]): string {
  const regrasDeKg = regrasDeDiferencaKg(regras);
  if (regrasDeKg.length === 0) return `Limite padrão: acima de ${LIMITE_DIFERENCA_KG_PADRAO}%`;
  return `Regra da empresa: ${regrasDeKg.map(condicaoDaRegra).join(' ou ')}`;
}
