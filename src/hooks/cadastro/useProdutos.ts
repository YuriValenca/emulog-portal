import { produtoSchema, type Produto } from '@/schemas/produto';
import { criarHookCadastro, porNome } from './criarHookCadastro';

interface NovoProdutoInput {
  nome: string;
  densidadeMin: number;
  densidadeMax: number;
  companyId: string;
}

interface EditarProdutoInput {
  id: string;
  nome: string;
  densidadeMin: number;
  densidadeMax: number;
}

const camposProduto = (input: { nome: string; densidadeMin: number; densidadeMax: number }) => ({
  nome: input.nome.trim(),
  densidadeMin: input.densidadeMin,
  densidadeMax: input.densidadeMax,
});

export const useProdutos = criarHookCadastro<Produto, NovoProdutoInput, EditarProdutoInput>({
  colecao: 'produtos',
  schema: produtoSchema,
  ordenar: porNome,
  paraNovoDoc: camposProduto,
  paraEdicao: camposProduto,
});
