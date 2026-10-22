import type { StatusLicenca } from '@/lib/licenca';

export type AcaoDeLicenca = 'renovar' | 'revogar' | 'excluir';

const ACEITA_ACAO: Record<AcaoDeLicenca, (status: StatusLicenca) => boolean> = {
  renovar: (status) => status !== 'available',
  revogar: (status) => status === 'available' || status === 'active',
  excluir: () => true,
};

export const aceitaAcao = (acao: AcaoDeLicenca, status: StatusLicenca) => ACEITA_ACAO[acao](status);

export const pluralLicencas = (quantidade: number) => (quantidade === 1 ? '1 licença' : `${quantidade} licenças`);
