import { paraKg } from '@/helpers/parseNumbers';
import { somarCargasReais } from '@/lib/furos';
import type { Furos } from '@/schemas/projeto';

export interface FuroFormulario {
  id: string;
  profundidadeReal: string;
  cargaReal: string;
}

export interface FurosFormulario {
  profundidadePrevista: string;
  cargaPrevista: string;
  itens: FuroFormulario[];
}

const MAXIMO_DE_FUROS_LISTADOS = 10;

let contadorDeFuros = 0;

// O id só existe no formulário, para a key da lista não embaralhar os inputs quando um furo do meio sai
const gerarIdFuro = () => `${Date.now()}-${contadorDeFuros++}`;

const preenchido = (texto: string) => texto.trim() !== '';
const numerico = (texto: string) => paraKg(texto) !== null;

export const criarFuro = (profundidadeReal = ''): FuroFormulario => ({ id: gerarIdFuro(), profundidadeReal, cargaReal: '' });

export const criarFurosVazios = (): FurosFormulario => ({ profundidadePrevista: '', cargaPrevista: '', itens: [criarFuro()] });

export const furoTemDados = (furo: FuroFormulario) => preenchido(furo.profundidadeReal) || preenchido(furo.cargaReal);

export const furosTemDados = (furos: FurosFormulario) =>
  preenchido(furos.profundidadePrevista) || preenchido(furos.cargaPrevista) || furos.itens.some(furoTemDados);

// Furo só com a profundidade herdada da prevista não tem nada que se perderia ao apagar
export const furoDigitado = (furo: FuroFormulario, profundidadePrevista: string) =>
  preenchido(furo.cargaReal) || (preenchido(furo.profundidadeReal) && furo.profundidadeReal !== profundidadePrevista);

// Furos que ainda seguem a prevista (vazios ou iguais à anterior) acompanham a mudança; os ajustados ficam
export function aplicarProfundidadePrevista(furos: FurosFormulario, texto: string): FurosFormulario {
  const seguePrevista = (furo: FuroFormulario) =>
    !preenchido(furo.profundidadeReal) || furo.profundidadeReal === furos.profundidadePrevista;
  return {
    ...furos,
    profundidadePrevista: texto,
    itens: furos.itens.map((furo) => (seguePrevista(furo) ? { ...furo, profundidadeReal: texto } : furo)),
  };
}

export const somarCargasDigitadas = (itens: FuroFormulario[]) =>
  somarCargasReais(itens.map((furo) => ({ cargaReal: paraKg(furo.cargaReal) })));

function listarNumeros(numeros: number[]): string {
  const listados = numeros.slice(0, MAXIMO_DE_FUROS_LISTADOS).join(', ');
  const restantes = numeros.length - MAXIMO_DE_FUROS_LISTADOS;
  return restantes > 0 ? `${listados} e mais ${restantes}` : listados;
}

function pendenciaDeFurosIncompletos(itens: FuroFormulario[]): string | null {
  const incompletos = itens
    .map((furo, indice) => ({ numero: indice + 1, completo: numerico(furo.profundidadeReal) && numerico(furo.cargaReal) }))
    .filter(({ completo }) => !completo)
    .map(({ numero }) => numero);
  if (incompletos.length === 0) return null;
  if (incompletos.length === 1) return `Preencha a profundidade e a carga do Furo ${incompletos[0]}.`;
  return `Preencha a profundidade e a carga dos furos ${listarNumeros(incompletos)}.`;
}

export function pendenciasDosFuros(furos: FurosFormulario | null): string[] {
  if (!furos) return [];
  return [
    !numerico(furos.profundidadePrevista) && 'Informe a profundidade prevista dos furos.',
    !numerico(furos.cargaPrevista) && 'Informe a carga prevista dos furos.',
    furos.itens.length === 0 && 'Adicione pelo menos um furo.',
    pendenciaDeFurosIncompletos(furos.itens),
  ].filter((pendencia): pendencia is string => Boolean(pendencia));
}

/** Só chamar sem pendências: os números já foram validados por `pendenciasDosFuros`. */
export const furosParaSalvar = (furos: FurosFormulario): Furos => ({
  profundidadePrevista: paraKg(furos.profundidadePrevista)!,
  cargaPrevista: paraKg(furos.cargaPrevista)!,
  itens: furos.itens.map((furo) => ({
    profundidadeReal: paraKg(furo.profundidadeReal)!,
    cargaReal: paraKg(furo.cargaReal)!,
  })),
});
