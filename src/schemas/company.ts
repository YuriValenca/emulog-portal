import { z } from 'zod';
import { zTimestamp, zTimestampOrNull, zTimestampOrString } from './common';

export const companyModulesSchema = z.object({
  mobile: z.boolean(),
  portal: z.boolean(),
}).partial();

export const companySchema = z.object({
  id: z.string(),
  name: z.string(),
  cnpj: z.string().nullable(),
  logo: z.string().nullable(),
  primaryColor: z.string().nullable(),
  founding: z.boolean(),
  licenseLimitOverride: z.number().nullable(),
  licenseExpiryOverride: zTimestampOrNull,
  active: z.boolean(),
  bluetoothScaleEnabled: z.boolean().optional(),
  createdAt: zTimestamp,
  modules: companyModulesSchema.optional(),
});

export const licenseStatusSchema = z.enum(['available', 'active', 'revoked', 'expired']);
export const licenseValidityMonthsSchema = z.union([
  z.literal('1semana'),
  z.literal(1),
  z.literal(12),
  z.literal('vitalicia'),
]);

export const licenseSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  companyName: z.string().optional(),
  key: z.string(),
  deviceId: z.string().nullable(),
  status: licenseStatusSchema,
  createdAt: zTimestamp,
  expiresAt: zTimestampOrNull,
  claimedAt: zTimestampOrString.optional(),
  validityMonths: licenseValidityMonthsSchema.optional(),
  pricePerMonth: z.number().optional(),
  discountPct: z.number().optional(),
});

export type CompanyModules = z.infer<typeof companyModulesSchema>;
export type Company = z.infer<typeof companySchema>;
export type License = z.infer<typeof licenseSchema>;
