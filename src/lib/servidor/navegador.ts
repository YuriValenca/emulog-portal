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

// TODO: no Blaze (App Hosting), trocar pelo @sparticuz/chromium; ver docs/MIGRACAO_BLAZE.md
export async function abrirNavegador(): Promise<Browser> {
  const executablePath = CAMINHOS_DO_CHROME.find((caminho): caminho is string => Boolean(caminho && existsSync(caminho)));
  if (!executablePath) throw new Error('Chrome não encontrado. Defina CHROME_PATH no .env.local.');
  return puppeteer.launch({ executablePath, headless: true });
}
