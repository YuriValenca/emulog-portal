import type { Company, CompanyModules } from '@/schemas/company';

const DEFAULT_MODULES: Required<CompanyModules> = {
  mobile: true,
  portal: false,
};

export function getCompanyModules(company: Company | null | undefined): Required<CompanyModules> {
  if (!company || !company.modules) return DEFAULT_MODULES;
  return {
    mobile: company.modules.mobile ?? DEFAULT_MODULES.mobile,
    portal: company.modules.portal ?? DEFAULT_MODULES.portal,
  };
}
