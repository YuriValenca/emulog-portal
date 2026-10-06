import { z } from 'zod';
import { zTimestamp } from './common';
import { amostraItemSchema, informacoesOperacaoSchema } from './projeto';

const AMOSTRA_VAZIA = { amostraId: 0, pesagens: [] };

export const projetoRascunhoSchema = z.object({
  id: z.string(),
  nomeProjeto: z.string().optional(),
  companyId: z.string(),
  uidUsuario: z.string(),
  dataCriacao: zTimestamp,
  dataAtualizacao: zTimestamp,
  quantidadeAmostras: z.number().optional(),
  // Rascunho tem pesagem pela metade: sem o `.catch()` uma amostra inválida derrubaria
  // o rascunho inteiro da lista em vez de só perder a densidade daquela amostra.
  amostras: z.array(amostraItemSchema.catch(AMOSTRA_VAZIA)).default([]),
  informacoesOperacao: informacoesOperacaoSchema.partial().optional(),
});

export type ProjetoRascunho = z.infer<typeof projetoRascunhoSchema>;
