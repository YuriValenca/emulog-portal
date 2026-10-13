import type { DocumentoDeFogosProps } from './DocumentoDeFogos';

// Import dinâmico: o react-pdf é pesado e só precisa existir no navegador, na hora de gerar
export async function gerarPdfDeFogos(props: DocumentoDeFogosProps): Promise<Blob> {
  const [{ pdf }, { DocumentoDeFogos }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./DocumentoDeFogos'),
  ]);
  return pdf(<DocumentoDeFogos {...props} />).toBlob();
}
