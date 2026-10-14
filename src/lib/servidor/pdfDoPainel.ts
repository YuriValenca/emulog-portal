import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Page } from 'puppeteer-core';
import { formatarGeradoEm } from '@/lib/relatorios/fogo';
import type { DadosDoRelatorioDoPainel, TemaDoRelatorio } from '@/lib/relatorios/painel';
import { abrirNavegador } from './navegador';

// A4 paisagem (297mm) em px CSS: o painel fica acima do breakpoint de duas colunas
const LARGURA_DA_PAGINA = 1123;
const TEMPO_LIMITE_MS = 20_000;

const CORES_DA_MARGEM: Record<TemaDoRelatorio, { fundo: string; texto: string; marca: string }> = {
  escuro: { fundo: '#14181C', texto: '#8C99A3', marca: '#C3CCD2' },
  claro: { fundo: '#FFFFFF', texto: '#888888', marca: '#555555' },
};

let logoEmulogEmBase64: string | null = null;

async function logoEmulog(): Promise<string> {
  logoEmulogEmBase64 ??= (await readFile(join(process.cwd(), 'public', 'assets', 'emulogLogo.svg'))).toString('base64');
  return `data:image/svg+xml;base64,${logoEmulogEmBase64}`;
}

// O Chrome não pinta as margens com o fundo da página: cabeçalho e rodapé pintam a faixa deles, e as laterais
// ficam sem margem (o recuo vem do CSS da página). O #header/#footer vem com padding próprio.
function faixaDaMargem(tema: TemaDoRelatorio, conteudo: string) {
  return `
    <style>#header, #footer { padding: 0 !important; }</style>
    <div style="box-sizing:border-box;width:100%;height:100%;padding:0 10mm;background:${CORES_DA_MARGEM[tema].fundo};
      -webkit-print-color-adjust:exact;print-color-adjust:exact;">
      ${conteudo}
    </div>`;
}

// Mesmo rodapé dos relatórios de fogo e de furos (lib/relatorios/pdf/estilos.ts) e do PDF do app
async function rodape(dados: DadosDoRelatorioDoPainel) {
  const { texto, marca } = CORES_DA_MARGEM[dados.tema];
  return faixaDaMargem(
    dados.tema,
    `<div style="border-top:2px solid ${dados.empresa.cor};padding-top:4px;display:flex;justify-content:space-between;align-items:center;
      font-family:Helvetica,Arial,sans-serif;font-size:9px;color:${texto};">
      <span style="display:flex;align-items:center;gap:4px;font-weight:bold;color:${marca};">
        <img src="${await logoEmulog()}" style="height:11px;" /> Emulog
      </span>
      <span>Gerado em ${formatarGeradoEm(new Date(dados.geradoEm))} · Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
    </div>`
  );
}

// O Chrome do servidor só fala com o próprio portal: nada de buscar URL externa
async function bloquearRequisicoesExternas(pagina: Page, origem: string) {
  await pagina.setRequestInterception(true);
  pagina.on('request', (requisicao) => {
    const url = requisicao.url();
    if (url.startsWith(origem) || url.startsWith('data:') || url.startsWith('blob:')) requisicao.continue();
    else requisicao.abort();
  });
}

export async function gerarPdfDoPainel(dados: DadosDoRelatorioDoPainel, origem: string): Promise<Uint8Array> {
  const navegador = await abrirNavegador();
  try {
    const pagina = await navegador.newPage();
    await bloquearRequisicoesExternas(pagina, origem);
    await pagina.setViewport({ width: LARGURA_DA_PAGINA, height: 800 });
    await pagina.evaluateOnNewDocument((injetados) => {
      window.__dadosDoPainel = injetados;
    }, dados);

    await pagina.goto(`${origem}/impressao/painel`, { waitUntil: 'networkidle0', timeout: TEMPO_LIMITE_MS });
    await pagina.waitForFunction(() => window.__painelPronto === true, { timeout: TEMPO_LIMITE_MS });

    return await pagina.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '10mm', bottom: '12mm', left: '0', right: '0' },
      displayHeaderFooter: true,
      headerTemplate: faixaDaMargem(dados.tema, ''),
      footerTemplate: await rodape(dados),
    });
  } finally {
    await navegador.close();
  }
}
