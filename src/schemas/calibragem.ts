import { z } from 'zod';
import { zTimestamp } from './common';

export const calibragemSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  userId: z.string(),
  pesoVazio: z.string(),
  pesoCheio: z.string(),
  tara: z.string(),
  timestamp: zTimestamp,
});

export type Calibragem = z.infer<typeof calibragemSchema>;
