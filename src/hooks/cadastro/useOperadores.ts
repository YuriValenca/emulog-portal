import { operadorSchema, type Operador } from '@/schemas/operador';
import { criarHookCadastro, porNome } from './criarHookCadastro';

interface NovoOperadorInput {
  nome: string;
  cargo: string;
  companyId: string;
}

interface EditarOperadorInput {
  id: string;
  nome: string;
  cargo: string;
}

const camposOperador = (input: { nome: string; cargo: string }) => ({
  nome: input.nome.trim(),
  cargo: input.cargo.trim(),
});

export const useOperadores = criarHookCadastro<Operador, NovoOperadorInput, EditarOperadorInput>({
  colecao: 'operadores',
  schema: operadorSchema,
  ordenar: porNome,
  paraNovoDoc: camposOperador,
  paraEdicao: camposOperador,
});
