'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuthUser } from './useAuthUser';
import { appUserSchema, type AppUser } from '@/schemas/user';
import { companySchema, type Company } from '@/schemas/company';
import { getCompanyModules } from '@/lib/companyModules';

type AuthStatus =
  | 'loading'
  | 'unauthenticated'
  | 'authenticated'
  | 'forbidden'
  | 'module-disabled'
  | 'config-error';

type AppAuthValue = {
  authUser: ReturnType<typeof useAuthUser>;
  authStatus: AuthStatus;
  debugError: string | null;
  appUser: AppUser | null;
  company: Company | null;
  companyId: string | null;
  role: AppUser['role'] | null;
  isSuperadmin: boolean;
  isCompanyAdmin: boolean;
};

const AppAuthContext = createContext<AppAuthValue | null>(null);

async function fetchAppUser(uid: string): Promise<AppUser> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) throw new Error('user-not-found');
  return appUserSchema.parse({ id: snap.id, ...snap.data() });
}

async function fetchCompany(companyId: string): Promise<Company> {
  const snap = await getDoc(doc(db, 'companies', companyId));
  if (!snap.exists()) throw new Error('company-not-found');
  return companySchema.parse({ id: snap.id, ...snap.data() });
}

export function AppAuthProvider({ children }: { children: React.ReactNode }) {
  const authUser = useAuthUser();

  const userQuery = useQuery({
    queryKey: ['appUser', authUser?.uid],
    queryFn: () => fetchAppUser(authUser!.uid),
    enabled: !!authUser,
    retry: false,
  });

  const appUser = userQuery.data ?? null;
  const isSuperadmin = appUser?.role === 'superadmin';
  const companyId = !isSuperadmin ? appUser?.companyId ?? null : null;

  const companyQuery = useQuery({
    queryKey: ['company', companyId],
    queryFn: () => fetchCompany(companyId!),
    enabled: !!companyId,
    retry: false,
  });

  const value = useMemo<AppAuthValue>(() => {
    const empty = {
      appUser: null,
      company: null,
      companyId: null,
      role: null,
      isSuperadmin: false,
      isCompanyAdmin: false,
    };

    if (authUser === undefined) {
      return { authUser, authStatus: 'loading', debugError: null, ...empty };
    }

    if (authUser === null) {
      return { authUser, authStatus: 'unauthenticated', debugError: null, ...empty };
    }

    if (userQuery.isLoading || (companyId && companyQuery.isLoading)) {
      return { authUser, authStatus: 'loading', debugError: null, ...empty };
    }

    if (userQuery.isError) {
      return {
        authUser,
        authStatus: 'config-error',
        debugError: (userQuery.error as Error)?.message ?? 'user-not-found',
        ...empty,
      };
    }

    const user = userQuery.data ?? null;

    if (user?.role === 'superadmin') {
      return {
        authUser,
        authStatus: 'authenticated',
        debugError: null,
        appUser: user,
        company: null,
        companyId: null,
        role: 'superadmin',
        isSuperadmin: true,
        isCompanyAdmin: false,
      };
    }

    if (!user?.companyId) {
      return {
        authUser,
        authStatus: 'config-error',
        debugError: 'company-not-assigned',
        ...empty,
        appUser: user,
        role: user?.role ?? null,
      };
    }

    if (companyQuery.isError) {
      return {
        authUser,
        authStatus: 'config-error',
        debugError: (companyQuery.error as Error)?.message ?? 'company-not-found',
        appUser: user,
        company: null,
        companyId: user.companyId,
        role: user.role,
        isSuperadmin: false,
        isCompanyAdmin: user.role === 'company_admin',
      };
    }

    const company = companyQuery.data ?? null;

    if (user.role !== 'company_admin') {
      return {
        authUser,
        authStatus: 'forbidden',
        debugError: null,
        appUser: user,
        company,
        companyId: user.companyId,
        role: user.role,
        isSuperadmin: false,
        isCompanyAdmin: false,
      };
    }

    const modules = getCompanyModules(company);

    if (!modules.portal) {
      return {
        authUser,
        authStatus: 'module-disabled',
        debugError: null,
        appUser: user,
        company,
        companyId: user.companyId,
        role: user.role,
        isSuperadmin: false,
        isCompanyAdmin: true,
      };
    }

    return {
      authUser,
      authStatus: 'authenticated',
      debugError: null,
      appUser: user,
      company,
      companyId: user.companyId,
      role: user.role,
      isSuperadmin: false,
      isCompanyAdmin: true,
    };
  }, [
    authUser,
    userQuery.data,
    userQuery.isLoading,
    userQuery.isError,
    userQuery.error,
    companyQuery.data,
    companyQuery.isLoading,
    companyQuery.isError,
    companyQuery.error,
    companyId,
  ]);

  return <AppAuthContext.Provider value={value}>{children}</AppAuthContext.Provider>;
}

export function useAppAuth() {
  const ctx = useContext(AppAuthContext);
  if (!ctx) throw new Error('useAppAuth deve ser usado dentro de AppAuthProvider');
  return ctx;
}
