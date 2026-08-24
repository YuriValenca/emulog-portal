import { z } from 'zod';

export const cnpjRegex = /^\d{14}$|^[A-Z0-9]{12}\d{2}$/;

export const clienteSchema = z.object({
  id: z.string(),
  nome: z.string(),
  cnpj: z.string().regex(cnpjRegex).nullable(),
  endereco: z.string().nullable(),
  ativo: z.boolean(),
  companyId: z.string().nullable(),
  criadoEm: z.string(),
});

export const clienteRefSchema = z.object({
  id: z.string(),
  nome: z.string(),
});

export type Cliente = z.infer<typeof clienteSchema>;
export type ClienteRef = z.infer<typeof clienteRefSchema>;
