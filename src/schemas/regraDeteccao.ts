import { z } from 'zod';
import { zTimestamp } from './common';

export const regraMetricaSchema = z.enum(['diferenca_kg']);

export const regraOperadorSchema = z.enum(['entre', 'maior', 'menor', 'igual']);

export const regraDeteccaoSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  metrica: regraMetricaSchema,
  operador: regraOperadorSchema,
  valor1: z.number(),
  valor2: z.number().nullable(),
  criadoEm: zTimestamp,
});

export type RegraMetrica = z.infer<typeof regraMetricaSchema>;
export type RegraOperador = z.infer<typeof regraOperadorSchema>;
export type RegraDeteccao = z.infer<typeof regraDeteccaoSchema>;
