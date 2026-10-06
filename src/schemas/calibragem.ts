import { z } from 'zod';
import { zTimestamp } from './common';

export const calibragemSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  userId: z.string(),
  // TODO: Fase B — tudo `z.number()` depois da migração.
  pesoVazio: z.union([z.string(), z.number()]),
  pesoCheio: z.union([z.string(), z.number()]),
  tara: z.union([z.string(), z.number()]),
  timestamp: zTimestamp,
});

export type Calibragem = z.infer<typeof calibragemSchema>;
