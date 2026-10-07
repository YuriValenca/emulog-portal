import { clienteSchema, type Cliente } from '@/schemas/cliente';
import { normalizarCnpj } from '@/helpers/formatCNPJ';
import { criarHookCadastro, porNome } from './criarHookCadastro';

interface CriarClienteInput {
  nome: string;
  cnpj: string | null;
  endereco: string | null;
  companyId: string;
}

interface EditarClienteInput {
  id: string;
  nome: string;
  cnpj: string | null;
  endereco: string | null;
  ativo?: boolean;
}

export const useClientes = criarHookCadastro<Cliente, CriarClienteInput, EditarClienteInput>({
  colecao: 'clientes',
  schema: clienteSchema,
  ordenar: porNome,
  normalizarDoc: (dados) => ({ ...dados, cnpj: normalizarCnpj(dados.cnpj) }),
  paraNovoDoc: (input) => ({
    nome: input.nome,
    cnpj: normalizarCnpj(input.cnpj),
    endereco: input.endereco,
    ativo: true,
  }),
  paraEdicao: ({ nome, cnpj, endereco, ativo }) => ({
    nome,
    cnpj: normalizarCnpj(cnpj),
    endereco,
    ...(ativo !== undefined && { ativo }),
  }),
});
