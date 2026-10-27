import type {
  AlertaVencimento, AlertaVencimentoPorTipo, TipoVencimentoPersonalizado, Vencimento, VencimentoTipo,
} from '@/schemas/vencimento';

export type TipoPadrao = Exclude<VencimentoTipo, 'personalizado'>;

export const TIPOS_PADRAO: TipoPadrao[] = ['documento_umb', 'certificacao_operador', 'calibracao_equipamento', 'manual'];

export const ROTULO_DO_TIPO_PADRAO: Record<TipoPadrao, string> = {
  documento_umb: 'Documento de UMB',
  certificacao_operador: 'Certificação de operador',
  calibracao_equipamento: 'Calibração de equipamento',
  manual: 'Outro',
};

export const DEFAULT_ALERTA_VENCIMENTO: Record<TipoPadrao, AlertaVencimento> = {
  calibracao_equipamento: { horasAlerta: 24, horasCritico: 12 },
  documento_umb: { horasAlerta: 720, horasCritico: 240 },
  certificacao_operador: { horasAlerta: 720, horasCritico: 240 },
  manual: { horasAlerta: 720, horasCritico: 240 },
};

const ALERTA_PADRAO_PERSONALIZADO: AlertaVencimento = { horasAlerta: 720, horasCritico: 240 };

type VencimentoComTipo = Pick<Vencimento, 'tipo' | 'tipoPersonalizado'>;

const ehTipoPadrao = (chave: string): chave is TipoPadrao => chave in ROTULO_DO_TIPO_PADRAO;

/** O tipo padrão em si ou o id do tipo personalizado: é a chave do `alertaVencimento` e do filtro. */
export function chaveDoTipo(vencimento: VencimentoComTipo): string {
  return vencimento.tipo === 'personalizado' && vencimento.tipoPersonalizado ? vencimento.tipoPersonalizado.id : vencimento.tipo;
}

export function rotuloDoTipo(vencimento: VencimentoComTipo): string {
  if (vencimento.tipo !== 'personalizado') return ROTULO_DO_TIPO_PADRAO[vencimento.tipo];
  return vencimento.tipoPersonalizado?.nome ?? 'Tipo personalizado';
}

export function alertaPadraoDaChave(chave: string): AlertaVencimento {
  return ehTipoPadrao(chave) ? DEFAULT_ALERTA_VENCIMENTO[chave] : ALERTA_PADRAO_PERSONALIZADO;
}

export function alertaParaChave(config: AlertaVencimentoPorTipo | undefined, chave: string): AlertaVencimento {
  return config?.[chave] ?? alertaPadraoDaChave(chave);
}

export function opcoesDeTipo(tiposPersonalizados: TipoVencimentoPersonalizado[]): { value: string; label: string }[] {
  return [
    ...TIPOS_PADRAO.map((tipo) => ({ value: tipo, label: ROTULO_DO_TIPO_PADRAO[tipo] })),
    ...tiposPersonalizados.map((tipo) => ({ value: tipo.id, label: tipo.nome })),
  ];
}

export function erroNoNomeDoTipo(nome: string, outrosNomes: string[]): string | null {
  const normalizado = nome.trim().toLocaleLowerCase('pt-BR');
  if (!normalizado) return 'Dê um nome a cada tipo novo.';
  const existentes = [...Object.values(ROTULO_DO_TIPO_PADRAO), ...outrosNomes].map((n) => n.trim().toLocaleLowerCase('pt-BR'));
  if (existentes.includes(normalizado)) return `Já existe um tipo chamado "${nome.trim()}".`;
  return null;
}

export type UrgenciaVencimento = 'ok' | 'alerta' | 'critico';

export function urgenciaVencimento(dataVencimento: Date, alerta: AlertaVencimento, agora: Date = new Date()): UrgenciaVencimento {
  const horasRestantes = (dataVencimento.getTime() - agora.getTime()) / 36e5;
  if (horasRestantes <= alerta.horasCritico) return 'critico';
  if (horasRestantes <= alerta.horasAlerta) return 'alerta';
  return 'ok';
}

export function formatarHorasRestantes(horas: number): string {
  if (Math.abs(horas) < 48) return `${Math.round(horas)}h`;
  return `${Math.round(horas / 24)} dias`;
}
