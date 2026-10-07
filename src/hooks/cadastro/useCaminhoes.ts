import { caminhaoSchema, type Caminhao } from '@/schemas/caminhao';
import { criarHookCadastro } from './criarHookCadastro';

interface NovaUmbInput {
  placa: string;
  tag: string;
  companyId: string;
}

interface EditarUmbInput {
  id: string;
  placa: string;
  tag: string;
}

function camposCaminhao(input: { placa: string; tag: string }) {
  const placa = input.placa.trim().toUpperCase();
  return { placa, tag: input.tag.trim(), descricao: `Caminhão — ${placa}` };
}

const rotuloCaminhao = (c: Caminhao) => c.tag ?? c.placa;

export const useCaminhoes = criarHookCadastro<Caminhao, NovaUmbInput, EditarUmbInput>({
  colecao: 'caminhoes',
  schema: caminhaoSchema,
  ordenar: (a, b) => rotuloCaminhao(a).localeCompare(rotuloCaminhao(b), 'pt-BR'),
  paraNovoDoc: camposCaminhao,
  paraEdicao: camposCaminhao,
});
