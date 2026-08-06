'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addDoc, collection, doc, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { getCompanyModules } from '@/lib/companyModules';
import type { Company, CompanyModules } from '@/schemas/company';

export interface EmpresaFormValues {
  name: string;
  cnpj: string;
  primaryColor: string;
  parentCompanyId: string | null;
  active: boolean;
  moduleMobile: boolean;
  modulePortal: boolean;
}

export function useModifyCompany() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['companies'] });

  const createEmpresa = useMutation({
    mutationFn: async (values: EmpresaFormValues) => {
      await addDoc(collection(db, 'companies'), {
        name: values.name.trim(),
        cnpj: values.cnpj.trim() || null,
        logo: null,
        primaryColor: values.primaryColor,
        founding: false,
        parentCompanyId: values.parentCompanyId,
        licenseLimitOverride: null,
        licenseExpiryOverride: null,
        active: values.active,
        bluetoothScaleEnabled: false,
        createdAt: Timestamp.now(),
        modules: { mobile: values.moduleMobile, portal: values.modulePortal },
      });
    },
    onSuccess: invalidate,
  });

  const updateEmpresa = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: EmpresaFormValues }) => {
      await updateDoc(doc(db, 'companies', id), {
        name: values.name.trim(),
        cnpj: values.cnpj.trim() || null,
        primaryColor: values.primaryColor,
        parentCompanyId: values.parentCompanyId,
        active: values.active,
        modules: { mobile: values.moduleMobile, portal: values.modulePortal },
      });
    },
    onSuccess: invalidate,
  });

  const toggleActive = useMutation({
    mutationFn: async (company: Company) => {
      await updateDoc(doc(db, 'companies', company.id), { active: !company.active });
    },
    onSuccess: invalidate,
  });

  const toggleModule = useMutation({
    mutationFn: async ({ company, moduleKey }: { company: Company; moduleKey: keyof CompanyModules }) => {
      const current = getCompanyModules(company);
      await updateDoc(doc(db, 'companies', company.id), {
        modules: { ...current, [moduleKey]: !current[moduleKey] },
      });
    },
    onSuccess: invalidate,
  });

  return { createEmpresa, updateEmpresa, toggleActive, toggleModule };
}