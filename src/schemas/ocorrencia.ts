import { z } from 'zod';
import { zTimestamp } from './common';

export const ocorrenciaTipoSchema = z.enum([
  'densidade_fora_da_faixa',
  'diferenca_kg_excedente',
  'documentacao_pendente',
  'equipamento',
  'outro',
]);

export const ocorrenciaOrigemSchema = z.enum(['automatica', 'manual']);
export const ocorrenciaStatusSchema = z.enum(['aberta', 'em_acompanhamento', 'encerrada']);

export const ocorrenciaSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  projetoId: z.string().nullable(),
  tipo: ocorrenciaTipoSchema,
  origem: ocorrenciaOrigemSchema,
  status: ocorrenciaStatusSchema,
  descricao: z.string().nullable(),
  valorReferencia: z.number().nullable(),
  responsavelUid: z.string().nullable(),
  criadoEm: zTimestamp,
});

export type OcorrenciaTipo = z.infer<typeof ocorrenciaTipoSchema>;
export type OcorrenciaOrigem = z.infer<typeof ocorrenciaOrigemSchema>;
export type OcorrenciaStatus = z.infer<typeof ocorrenciaStatusSchema>;
export type Ocorrencia = z.infer<typeof ocorrenciaSchema>;
