const LADO_MAXIMO_PX = 1280;
const QUALIDADES_JPEG = [0.6, 0.5, 0.4, 0.3];
// A rule de `midias` compara o tamanho da string base64, não o do arquivo
export const TAMANHO_MAXIMO_BASE64 = 1_000_000;

function lerArquivo(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result as string);
    leitor.onerror = () => reject(new Error('falha-ao-ler-arquivo'));
    leitor.readAsDataURL(arquivo);
  });
}

function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const imagem = new Image();
    imagem.onload = () => resolve(imagem);
    imagem.onerror = () => reject(new Error('arquivo-nao-e-imagem'));
    imagem.src = src;
  });
}

function desenharReduzida(imagem: HTMLImageElement, ladoMaximo: number): HTMLCanvasElement {
  const escala = Math.min(1, ladoMaximo / Math.max(imagem.width, imagem.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(imagem.width * escala);
  canvas.height = Math.round(imagem.height * escala);
  const contexto = canvas.getContext('2d');
  if (!contexto) throw new Error('canvas-indisponivel');
  contexto.drawImage(imagem, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export async function comprimirFotoDaOperacao(arquivo: File): Promise<string> {
  const imagem = await carregarImagem(await lerArquivo(arquivo));
  const canvas = desenharReduzida(imagem, LADO_MAXIMO_PX);

  for (const qualidade of QUALIDADES_JPEG) {
    const base64 = canvas.toDataURL('image/jpeg', qualidade);
    if (base64.length < TAMANHO_MAXIMO_BASE64) return base64;
  }
  throw new Error('foto-grande-demais');
}

export async function comprimirFotos(arquivos: File[]): Promise<{ imagens: string[]; falhas: number }> {
  const resultados = await Promise.allSettled(arquivos.map(comprimirFotoDaOperacao));
  const imagens = resultados
    .filter((resultado): resultado is PromiseFulfilledResult<string> => resultado.status === 'fulfilled')
    .map((resultado) => resultado.value);
  return { imagens, falhas: arquivos.length - imagens.length };
}
