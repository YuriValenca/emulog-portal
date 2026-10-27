import { horaDaPesagem, isAmostraGrupo, numeroDaAmostra, valorVazio } from '@/lib/amostras';
import { densidadesAmostra } from '@/lib/fogoUtils';
import type { AmostraItem, InformacoesOperacao } from '@/schemas/projeto';

// Mesma regra do Emulog-app (src/screens/DetalheProjetoScreen.js): a observação técnica só sai para esta empresa
export const EMPRESA_COM_OBSERVACAO_TECNICA = 'explog-founding';

export type TipoRelatorioDeFogo = 'fogo' | 'furos';

export const COR_PADRAO = '#1F6452';

export const kgPreenchido = (valor: unknown) => valor !== null && valor !== undefined && String(valor).trim() !== '';

export function temInformacoesDaOperacao(info: Partial<InformacoesOperacao> | undefined): boolean {
  if (!info) return false;
  return Boolean(
    info.numeroNF?.trim()
    || kgPreenchido(info.kgPrevisto)
    || kgPreenchido(info.kgAplicado)
    || info.caminhao
    || (info.equipe?.length ?? 0) > 0
    || info.informacoesGerais?.trim()
  );
}

export interface AmostraDescrita {
  titulo: string;
  linhas: string[];
}

const formatarDensidade = (valor: number | null) => (valor === null ? '—' : `${valor.toFixed(2)} g/cm³`);

export function descreverAmostra(amostra: AmostraItem, indice: number): AmostraDescrita {
  const titulo = `Amostra ${numeroDaAmostra(amostra, indice)}`;

  if (isAmostraGrupo(amostra)) {
    const linhas = amostra.pesagens
      .filter((pesagem) => !valorVazio(pesagem.peso))
      .map((pesagem, i) => `Pesagem ${i + 1}: ${pesagem.peso} g, ${pesagem.densidade} g/cm³, ${horaDaPesagem(pesagem.timestamp)}`);
    return { titulo, linhas };
  }

  const { inicial, final } = densidadesAmostra(amostra);
  return { titulo, linhas: [`Densidade inicial: ${formatarDensidade(inicial)}`, `Densidade final: ${formatarDensidade(final)}`] };
}

const doisDigitos = (n: number) => String(n).padStart(2, '0');

export function formatarGeradoEm(data: Date): string {
  const ano = String(data.getFullYear()).slice(-2);
  return `${doisDigitos(data.getDate())}/${doisDigitos(data.getMonth() + 1)}/${ano} (${doisDigitos(data.getHours())}:${doisDigitos(data.getMinutes())}h)`;
}

export function nomeDoArquivo(nomesDosFogos: string[], tipos: TipoRelatorioDeFogo[], agora: Date): string {
  const base = nomesDosFogos.length === 1
    ? nomesDosFogos[0].replace(/[\/\\:*?"<>|]/g, '-')
    : `Relatório - ${nomesDosFogos.length} fogos`;
  const sufixo = tipos.length === 1 && tipos[0] === 'furos' ? 'Furos' : '';
  const data = `${doisDigitos(agora.getDate())}-${doisDigitos(agora.getMonth() + 1)}-${agora.getFullYear()}`;
  return `${base}${sufixo ? ` - ${sufixo}` : ''} - ${data}.pdf`;
}
