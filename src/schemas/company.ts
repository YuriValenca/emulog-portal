import { z } from 'zod';
import { zTimestamp, zTimestampOrNull } from './common';
import { alertaVencimentoPorTipoSchema } from './vencimento';
import { normalizarCnpj } from '@/helpers/formatCNPJ';

export const companyModulesSchema = z.object({
  mobile: z.boolean(),
  portal: z.boolean(),
}).partial();

export const faixaDensidadeSchema = z.object({
  min: z.number(),
  max: z.number(),
});

export const companySchema = z.object({
  id: z.string(),
  name: z.string(),
  // TODO: Fase B — docs antigos têm CNPJ mascarado ou `''`; depois da migração sai o preprocess.
  cnpj: z.preprocess(normalizarCnpj, z.string().nullable()),
  logo: z.string().nullable(),
  primaryColor: z.string().nullable(),
  founding: z.boolean(),
  parentCompanyId: z.string().nullable().optional(),
  licenseLimitOverride: z.number().nullable(),
  licenseExpiryOverride: zTimestampOrNull,
  active: z.boolean(),
  bluetoothScaleEnabled: z.boolean().optional(),
  createdAt: zTimestamp,
  modules: companyModulesSchema.optional(),
  alertaVencimento: alertaVencimentoPorTipoSchema.optional(),
  faixaDensidade: faixaDensidadeSchema.nullable().optional(),
});

export const licenseStatusSchema = z.enum(['available', 'active', 'revoked', 'expired']);
export const licenseValidityMonthsSchema = z.union([
  z.literal('1semana'),
  z.literal(1),
  z.literal(12),
  z.literal('vitalicia'),
]);

// Sem `companyId`: a licença vive em `companies/{id}/licenses` e a empresa só existe no caminho.
export const licenseSchema = z.object({
  id: z.string(),
  companyName: z.string().optional(),
  key: z.string(),
  deviceId: z.string().nullable(),
  status: licenseStatusSchema,
  createdAt: zTimestamp,
  expiresAt: zTimestampOrNull,
  claimedAt: zTimestamp.optional(),
  validityMonths: licenseValidityMonthsSchema.optional(),
  pricePerMonth: z.number().optional(),
  discountPct: z.number().optional(),
});

export const allowedUserSchema = z.object({
  email: z.email(),
  role: z.enum(['user', 'company_admin']),
  createdAt: zTimestamp,
  claimed: z.boolean(),
});

export type CompanyModules = z.infer<typeof companyModulesSchema>;
export type Company = z.infer<typeof companySchema>;
export type License = z.infer<typeof licenseSchema>;
export type AllowedUser = z.infer<typeof allowedUserSchema>;
