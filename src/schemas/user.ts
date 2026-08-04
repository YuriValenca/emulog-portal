import { z } from 'zod';
import { zTimestamp } from './common';

export const userRoleSchema = z.enum(['user', 'company_admin', 'superadmin']);

export const appUserSchema = z.object({
  id: z.string(),
  uid: z.string(),
  email: z.email(),
  nome: z.string().nullable(),
  companyId: z.string().nullable(),
  role: userRoleSchema,
  ultimoLogin: zTimestamp.nullable(),
});

export type UserRole = z.infer<typeof userRoleSchema>;
export type AppUser = z.infer<typeof appUserSchema>;
