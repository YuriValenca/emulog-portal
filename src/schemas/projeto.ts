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

// TODO: Fase B — tara e pesoCheio viram `number`, e saem `densidade` e `necessitaCalibragem`.
export const projetoCalibragemSchema = z.object({
  tara: z.union([z.string(), z.number()]),
  pesoCheio: z.union([z.string(), z.number()]),
  pesoVazio: z.number().optional(),
  densidade: z.union([z.string(), z.number()]).optional(),
  timestamp: zTimestamp,
  necessitaCalibragem: z.boolean().optional(),
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
  // TODO: Fase B — vira `z.number().nullable()` depois da migração; hoje convive com o texto antigo do app.
  kgPrevisto: z.union([z.string(), z.number()]).nullable(),
  kgAplicado: z.union([z.string(), z.number()]).nullable(),
  caminhao: caminhaoRefSchema.nullable(),
  equipe: z.array(operadorRefSchema),
  produto: produtoRefSchema.nullable().optional(),
  informacoesGerais: z.string(),
});

export const furoSchema = z.object({
  profundidadeReal: z.number(),
  cargaReal: z.number(),
});

/** A ordem de `itens` é o número do furo (índice + 1). */
export const furosSchema = z.object({
  profundidadePrevista: z.number(),
  cargaPrevista: z.number(),
  itens: z.array(furoSchema),
});

const furoEmPreenchimentoSchema = z.object({
  profundidadeReal: z.number().nullable(),
  cargaReal: z.number().nullable(),
});

export const furosEmPreenchimentoSchema = z.object({
  profundidadePrevista: z.number().nullable(),
  cargaPrevista: z.number().nullable(),
  itens: z.array(furoEmPreenchimentoSchema),
});

export const projetoSchema = z.object({
  id: z.string(),
  nomeProjeto: z.string(),
  cliente: clienteRefSchema.nullable().optional(),
  dataCriacao: zTimestamp,
  dataConclusao: zTimestamp.optional(),
  uidUsuario: z.string(),
  companyId: z.string(),
  quantidadeAmostras: z.number(),
  amostras: z.array(amostraItemSchema),
  calibragem: projetoCalibragemSchema,
  informacoesOperacao: informacoesOperacaoSchema.optional(),
  ocorrenciasVerificadas: z.boolean().optional(),
  // O `safeParse` da lista descarta o fogo inteiro se falhar: furos fora do formato (inclusive o `[{ kg }]`
  // dos testes antigos do app) viram "sem furos", e número faltando num furo vira "—" em vez de esconder todos.
  furos: furosEmPreenchimentoSchema.nullable().optional().catch(null),
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
export type Furos = z.infer<typeof furosSchema>;
export type FurosEmPreenchimento = z.infer<typeof furosEmPreenchimentoSchema>;

/** O que a tabela e o modal de detalhe realmente leem — satisfeito por Projeto e por rascunho. */
export type FogoDetalhavel = {
  id: string;
  companyId: string;
  nomeProjeto?: string;
  dataCriacao: z.infer<typeof zTimestamp>;
  dataConclusao?: z.infer<typeof zTimestamp>;
  quantidadeAmostras?: number;
  amostras?: AmostraItem[];
  informacoesOperacao?: Partial<InformacoesOperacao>;
  furos?: FurosEmPreenchimento | null;
  cliente?: z.infer<typeof clienteRefSchema> | null;
  calibragem?: ProjetoCalibragem | null;
};
export type ProjetoMeta = z.infer<typeof projetoMetaSchema>;
