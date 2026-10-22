import { COR_PADRAO } from '@/lib/relatorios/fogo';

const COR_HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const FUNDO_DA_INTERFACE = '#14181C';
const CONTRASTE_MINIMO = 3;
const PASSO_CLAREAMENTO = 0.05;

type Rgb = [number, number, number];

function lerHex(hex: string): Rgb {
  const digitos = hex.length === 4 ? [...hex.slice(1)].map((d) => d + d).join('') : hex.slice(1);
  return [0, 2, 4].map((i) => parseInt(digitos.slice(i, i + 2), 16)) as Rgb;
}

function paraHex(rgb: Rgb): string {
  return `#${rgb.map((canal) => Math.round(canal).toString(16).padStart(2, '0')).join('')}`;
}

function luminancia(rgb: Rgb): number {
  const [r, g, b] = rgb.map((canal) => {
    const c = canal / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: Rgb, b: Rgb): number {
  const [clara, escura] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (clara + 0.05) / (escura + 0.05);
}

function misturarComBranco(rgb: Rgb, proporcao: number): Rgb {
  return rgb.map((canal) => canal + (255 - canal) * proporcao) as Rgb;
}

/**
 * Cor da empresa ajustada para o fundo escuro do portal; o PDF continua usando a original.
 * O verde da logo é o padrão do form de Empresas: tratado como "sem cor", para a sidebar usar o verde do portal.
 */
export function corDaInterface(primaryColor: string | null | undefined): string | null {
  if (!primaryColor || !COR_HEX.test(primaryColor)) return null;
  if (primaryColor.toLowerCase() === COR_PADRAO.toLowerCase()) return null;

  const original = lerHex(primaryColor);
  const fundo = lerHex(FUNDO_DA_INTERFACE);

  for (let proporcao = 0; proporcao <= 1; proporcao += PASSO_CLAREAMENTO) {
    const candidata = misturarComBranco(original, proporcao);
    if (contraste(candidata, fundo) >= CONTRASTE_MINIMO) return paraHex(candidata);
  }
  return '#ffffff';
}
