import { existsSync } from 'node:fs';
import puppeteer, { type Browser } from 'puppeteer-core';

const CAMINHOS_DO_CHROME = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

function chromeDaMaquina() {
  return CAMINHOS_DO_CHROME.find((caminho): caminho is string => Boolean(caminho && existsSync(caminho)));
}

// Serverless não tem Chrome instalado: o @sparticuz/chromium traz um headless-shell comprimido
async function abrirChromiumEmbutido(): Promise<Browser> {
  const { default: chromium } = await import('@sparticuz/chromium');
  return puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: 'shell' });
}

export async function abrirNavegador(): Promise<Browser> {
  const executablePath = chromeDaMaquina();
  if (!executablePath) return abrirChromiumEmbutido();
  return puppeteer.launch({ executablePath, headless: true });
}
