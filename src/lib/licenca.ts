import type { License } from '@/types';

export const JANELA_EXPIRACAO_LICENCA_DIAS = 30;
const MS_DIA = 1000 * 60 * 60 * 24;

export function toDateLicenca(value: unknown): Date | null {
  const v = value as { toDate?: () => Date; seconds?: number } | null;
  if (!v) return null;
  if (v.toDate) return v.toDate();
  if (v.seconds) return new Date(v.seconds * 1000);
  return null;
}

export function diasRestantesLicenca(license: License, agora: Date = new Date()): number | null {
  if (!license.expiresAt) return null;
  const exp = toDateLicenca(license.expiresAt);
  if (!exp) return null;
  return (exp.getTime() - agora.getTime()) / MS_DIA;
}

export type StatusExpiracaoLicenca = 'expirando' | 'expirada' | null;

export function statusExpiracaoLicenca(license: License, agora: Date = new Date()): StatusExpiracaoLicenca {
  if (license.status !== 'active') return null;
  const dias = diasRestantesLicenca(license, agora);
  if (dias === null) return null;
  if (dias < 0) return 'expirada';
  if (dias <= JANELA_EXPIRACAO_LICENCA_DIAS) return 'expirando';
  return null;
}

export type ValidadeLicenca = NonNullable<License['validityMonths']>;
export type StatusLicenca = License['status'];

export const OPCOES_VALIDADE_LICENCA: { value: ValidadeLicenca; label: string }[] = [
  { value: '1semana', label: '1 semana' },
  { value: 1, label: '1 mês' },
  { value: 12, label: '1 ano' },
  { value: 'vitalicia', label: 'Vitalícia' },
];

// O app trata licença sem `validityMonths` como 12 meses na ativação.
const VALIDADE_PADRAO: ValidadeLicenca = 12;

export function rotuloValidadeLicenca(validade: ValidadeLicenca | undefined): string {
  const procurada = validade ?? VALIDADE_PADRAO;
  return OPCOES_VALIDADE_LICENCA.find((opcao) => opcao.value === procurada)?.label ?? String(procurada);
}

export function validadeDoValor(valor: string): ValidadeLicenca {
  return OPCOES_VALIDADE_LICENCA.find((opcao) => String(opcao.value) === valor)?.value ?? VALIDADE_PADRAO;
}

// O app só marca a licença como expirada quando o aparelho abre; até lá o doc continua `active`.
export function statusExibidoLicenca(license: License, agora: Date = new Date()): StatusLicenca {
  return statusExpiracaoLicenca(license, agora) === 'expirada' ? 'expired' : license.status;
}

const ALFABETO_CHAVE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const BLOCOS_CHAVE = 4;
const CARACTERES_POR_BLOCO = 5;

/** Mesmo formato do app (`XPLOG-XXXXX-XXXXX-XXXXX-XXXXX`), com aleatoriedade criptográfica. */
export function gerarChaveDeLicenca(): string {
  const sorteio = crypto.getRandomValues(new Uint32Array(BLOCOS_CHAVE * CARACTERES_POR_BLOCO));
  const caracteres = Array.from(sorteio, (numero) => ALFABETO_CHAVE[numero % ALFABETO_CHAVE.length]);
  const blocos = Array.from({ length: BLOCOS_CHAVE }, (_, i) =>
    caracteres.slice(i * CARACTERES_POR_BLOCO, (i + 1) * CARACTERES_POR_BLOCO).join('')
  );
  return `XPLOG-${blocos.join('-')}`;
}
