// `new Date('aaaa-mm-dd')` e `toISOString` são UTC: em Brasília o dia vira às 21h.

const doisDigitos = (n: number) => String(n).padStart(2, '0');

function partesDaData(valor: string): [number, number, number] {
  const [ano, mes, dia] = valor.split('-').map(Number);
  return [ano, mes - 1, dia];
}

export function dataLocalISO(data: Date): string {
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`;
}

export function hojeLocal(): string {
  return dataLocalISO(new Date());
}

export function inicioDoDia(valor: string): Date {
  const [ano, mes, dia] = partesDaData(valor);
  return new Date(ano, mes, dia);
}

export function fimDoDia(valor: string): Date {
  const [ano, mes, dia] = partesDaData(valor);
  return new Date(ano, mes, dia, 23, 59, 59, 999);
}
