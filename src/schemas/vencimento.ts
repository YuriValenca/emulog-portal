import { z } from 'zod';
import { zTimestamp, zTimestampOrNull } from './common';
import { caminhaoRefSchema, operadorRefSchema } from './projeto';

export const vencimentoTipoSchema = z.enum([
  'calibracao_equipamento',
  'documento_umb',
  'certificacao_operador',
  'manual',
  'personalizado',
]);

export const MAXIMO_DE_TIPOS_PERSONALIZADOS = 50;

export const tipoVencimentoPersonalizadoSchema = z.object({
  id: z.string(),
  nome: z.string().min(1).max(40),
});

export const vencimentoStatusSchema = z.enum(['ativo', 'resolvido']);

export const vencimentoSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  tipo: vencimentoTipoSchema,
  tituloManual: z.string().max(80).nullable().optional(),
  /** Cópia do tipo da empresa no momento do cadastro: o nome sobrevive se o tipo for renomeado ou excluído. */
  tipoPersonalizado: tipoVencimentoPersonalizadoSchema.nullable().optional(),
  caminhao: caminhaoRefSchema.nullable().optional(),
  operador: operadorRefSchema.nullable().optional(),
  descricao: z.string().max(500).nullable(),
  dataVencimento: zTimestamp,
  status: vencimentoStatusSchema,
  responsavelUid: z.string().nullable(),
  criadoEm: zTimestamp,
  resolvidoEm: zTimestampOrNull.optional(),
});

export const alertaVencimentoSchema = z.object({
  horasAlerta: z.number().int().positive(),
  horasCritico: z.number().int().positive(),
}).refine(
  (v) => v.horasAlerta > v.horasCritico,
  { message: 'horasAlerta deve ser maior que horasCritico' }
);

/** Chave é o tipo padrão ou o id do tipo personalizado. */
export const alertaVencimentoPorTipoSchema = z.record(z.string(), alertaVencimentoSchema);

export type VencimentoTipo = z.infer<typeof vencimentoTipoSchema>;
export type TipoVencimentoPersonalizado = z.infer<typeof tipoVencimentoPersonalizadoSchema>;
export type VencimentoStatus = z.infer<typeof vencimentoStatusSchema>;
export type Vencimento = z.infer<typeof vencimentoSchema>;
export type AlertaVencimento = z.infer<typeof alertaVencimentoSchema>;
export type AlertaVencimentoPorTipo = z.infer<typeof alertaVencimentoPorTipoSchema>;
