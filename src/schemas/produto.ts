import { z } from 'zod';

export const produtoSchema = z.object({
  id: z.string(),
  nome: z.string(),
  companyId: z.string().nullable(),
  densidadeMin: z.number(),
  densidadeMax: z.number(),
  criadoEm: z.string(),
});

export const produtoRefSchema = z.object({
  id: z.string(),
  nome: z.string(),
});

export type Produto = z.infer<typeof produtoSchema>;
export type ProdutoRef = z.infer<typeof produtoRefSchema>;
