import { z } from 'zod';
import { zTimestamp } from './common';
import { produtoRefSchema } from './produto';
import { clienteRefSchema } from './cliente';

const pesoOuVazio = z.union([z.number(), z.literal('')]).transform((v) => (v === '' ? null : v));

export const pesagemSchema = z.object({
  peso: pesoOuVazio,
  densidade: pesoOuVazio,
  timestamp: z.string(),
});

export const amostraGrupoSchema = z.object({
  amostraId: z.number(),
  pesagens: z.array(pesagemSchema),
});

export const legacyPesagemFlatSchema = z.object({
  grupoId: z.number().optional(),
  amostraId: z.number().optional(),
  peso: z.union([z.string(), z.number()]),
  densidade: z.union([z.string(), z.number()]),
  timestamp: z.string().optional(),
});

export const amostraManualSchema = z.object({
  amostraId: z.number(),
  densidadeInicial: z.number().nullable(),
  densidadeFinal: z.number().nullable(),
});

export const amostraItemSchema = z.union([
  amostraGrupoSchema,
  legacyPesagemFlatSchema,
  amostraManualSchema,
]);

export const projetoCalibragemSchema = z.object({
  tara: z.union([z.string(), z.number()]),
  pesoCheio: z.union([z.string(), z.number()]),
  densidade: z.union([z.string(), z.number()]).optional(),
  timestamp: zTimestamp,
  necessitaCalibragem: z.boolean(),
});

export const caminhaoRefSchema = z.object({
  id: z.string(),
  placa: z.string(),
});

export const operadorRefSchema = z.object({
  id: z.string(),
  nome: z.string(),
});

export const informacoesOperacaoSchema = z.object({
  numeroNF: z.string(),
  kgPrevisto: z.string(),
  kgAplicado: z.string(),
  caminhao: caminhaoRefSchema.nullable(),
  equipe: z.array(operadorRefSchema),
  produto: produtoRefSchema.nullable().optional(),
  informacoesGerais: z.string(),
});

export const projetoSchema = z.object({
  id: z.string(),
  nomeProjeto: z.string(),
  cliente: clienteRefSchema.nullable().optional(),
  dataCriacao: zTimestamp,
  uidUsuario: z.string(),
  companyId: z.string(),
  quantidadeAmostras: z.number(),
  amostras: z.array(amostraItemSchema),
  calibragem: projetoCalibragemSchema,
  informacoesOperacao: informacoesOperacaoSchema.optional(),
  ocorrenciasVerificadas: z.boolean().optional(),
});

export const projetoMetaSchema = z.object({
  id: z.string(),
  nomeProjeto: z.string(),
  dataCriacao: zTimestamp,
  uidUsuario: z.string(),
  companyId: z.string(),
});

export type Pesagem = z.infer<typeof pesagemSchema>;
export type AmostraGrupo = z.infer<typeof amostraGrupoSchema>;
export type LegacyPesagemFlat = z.infer<typeof legacyPesagemFlatSchema>;
export type AmostraItem = z.infer<typeof amostraItemSchema>;
export type AmostraManual = z.infer<typeof amostraManualSchema>;
export type ProjetoCalibragem = z.infer<typeof projetoCalibragemSchema>;
export type InformacoesOperacao = z.infer<typeof informacoesOperacaoSchema>;
export type Projeto = z.infer<typeof projetoSchema>;
export type ProjetoMeta = z.infer<typeof projetoMetaSchema>;
