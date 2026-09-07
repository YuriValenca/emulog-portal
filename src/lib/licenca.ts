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
