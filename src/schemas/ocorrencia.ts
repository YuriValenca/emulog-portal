import { z } from 'zod';
import { zTimestamp } from './common';

export const ocorrenciaTipoSchema = z.enum([
  'densidade_fora_da_faixa',
  'diferenca_kg_excedente',
  'documentacao_pendente',
  'equipamento',
  'licenca',
  'manual',
]);

export const ocorrenciaOrigemSchema = z.enum(['automatica', 'manual']);
export const ocorrenciaStatusSchema = z.enum(['aberta', 'em_acompanhamento', 'encerrada']);
export const ocorrenciaMotivoLicencaSchema = z.enum(['expirando', 'expirada']);

export const ocorrenciaSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  projetoId: z.string().nullable(),
  licenseId: z.string().nullable().optional(),
  tipo: ocorrenciaTipoSchema,
  tituloManual: z.string().max(80).nullable().optional(),
  origem: ocorrenciaOrigemSchema,
  status: ocorrenciaStatusSchema,
  descricao: z.string().max(500).nullable(),
  valorReferencia: z.number().nullable(),
  responsavelUid: z.string().nullable(),
  criadoEm: zTimestamp,
  motivo: ocorrenciaMotivoLicencaSchema.optional(),
});

export type OcorrenciaTipo = z.infer<typeof ocorrenciaTipoSchema>;
export type OcorrenciaOrigem = z.infer<typeof ocorrenciaOrigemSchema>;
export type OcorrenciaStatus = z.infer<typeof ocorrenciaStatusSchema>;
export type Ocorrencia = z.infer<typeof ocorrenciaSchema>;
