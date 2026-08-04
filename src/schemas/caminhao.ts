import { z } from 'zod';

export const caminhaoSchema = z.object({
  id: z.string(),
  placa: z.string(),
  tag: z.string().optional(),
  descricao: z.string().optional(),
  companyId: z.string().nullable(),
  criadoEm: z.string(),
});

export type Caminhao = z.infer<typeof caminhaoSchema>;
