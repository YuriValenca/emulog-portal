import { dataLocalISO, fimDoDia, hojeLocal, inicioDoDia, type IntervaloDigitado } from '@/helpers/dataLocal';

export const OPCOES_PERIODO = [7, 30, 60, 90, 180, 365, 'tudo'] as const;
export type Periodo = typeof OPCOES_PERIODO[number];

const MS_DIA = 24 * 60 * 60 * 1000;

export const VALOR_PERSONALIZADO = 'personalizado';
export type PeriodoSelecionado = Periodo | typeof VALOR_PERSONALIZADO;

const LABELS_PERIODO: Record<Periodo, string> = {
  7: '7 dias',
  30: '30 dias',
  60: '60 dias',
  90: '90 dias',
  180: '6 meses',
  365: '1 ano',
  tudo: 'desde o início',
};

export interface Intervalo {
  inicio: Date | null;
  fim: Date | null;
}

const dataCurta = (data: string) =>
  inicioDoDia(data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

/** Fim vazio é hoje: o painel acompanha a virada do dia sem o usuário mexer. */
const fimOuHoje = (datas: IntervaloDigitado) => datas.fim || hojeLocal();

function diasAntes(data: string, dias: number): string {
  const resultado = inicioDoDia(data);
  resultado.setDate(resultado.getDate() - dias);
  return dataLocalISO(resultado);
}

export function labelPeriodo(periodo: Periodo): string {
  return LABELS_PERIODO[periodo];
}

export function periodoDoValor(valor: string): Periodo {
  return valor === 'tudo' ? 'tudo' : (Number(valor) as Periodo);
}

/** O período conta para trás a partir do fim já escolhido. */
export function datasDoPeriodo(periodo: Periodo, datas: IntervaloDigitado): IntervaloDigitado {
  return { inicio: periodo === 'tudo' ? '' : diasAntes(fimOuHoje(datas), periodo), fim: datas.fim };
}

export function periodoDasDatas(datas: IntervaloDigitado): PeriodoSelecionado {
  if (!datas.inicio) return 'tudo';
  const fim = fimOuHoje(datas);
  return OPCOES_PERIODO.find((periodo) => periodo !== 'tudo' && diasAntes(fim, periodo) === datas.inicio) ?? VALOR_PERSONALIZADO;
}

export function intervaloDasDatas(datas: IntervaloDigitado): Intervalo {
  return {
    inicio: datas.inicio ? inicioDoDia(datas.inicio) : null,
    fim: datas.fim ? fimDoDia(datas.fim) : null,
  };
}

export function labelDasDatas(datas: IntervaloDigitado): string {
  const periodo = periodoDasDatas(datas);
  if (periodo !== VALOR_PERSONALIZADO && !datas.fim) return labelPeriodo(periodo);
  const fim = dataCurta(fimOuHoje(datas));
  return datas.inicio ? `${dataCurta(datas.inicio)} a ${fim}` : `até ${fim}`;
}

/** Mesma contagem dos períodos fixos: "7 dias" vai de 7 dias antes do fim até o fim. */
export function labelPersonalizado(datas: IntervaloDigitado): string {
  // Math.round absorve a hora a mais ou a menos de um dia com horário de verão
  const dias = Math.round((inicioDoDia(fimOuHoje(datas)).getTime() - inicioDoDia(datas.inicio).getTime()) / MS_DIA);
  if (dias === 0) return 'Personalizado (mesmo dia)';
  return `Personalizado (${dias} ${dias === 1 ? 'dia' : 'dias'})`;
}
