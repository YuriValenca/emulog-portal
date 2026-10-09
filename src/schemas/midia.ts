import { z } from 'zod';
import { zTimestamp } from './common';

export const midiaSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  projetoId: z.string(),
  enviadoPor: z.string(),
  criadoEm: zTimestamp,
  // TODO: no Blaze vira `caminho` no Storage; a leitura passa só por `urlDaMidia` em hooks/fogos/useMidias.ts
  imagem: z.string(),
});

export type Midia = z.infer<typeof midiaSchema>;
