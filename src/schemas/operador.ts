import { z } from 'zod';

export const operadorSchema = z.object({
  id: z.string(),
  nome: z.string(),
  cargo: z.string(),
  companyId: z.string().nullable(),
  criadoEm: z.string(),
});

export type Operador = z.infer<typeof operadorSchema>;
