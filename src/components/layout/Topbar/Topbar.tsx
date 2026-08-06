'use client';

import { Building2 } from 'lucide-react';
import type { Company } from '@/types';
import { useCompanySelection } from '@/stores/useCompanySelection';
import { Select, type SelectOption } from '@/components/ui/Select/Select';
import styles from './Topbar.module.scss';
import { usePathname } from 'next/navigation';

interface TopbarProps {
  title: string;
  company: Company | null;
  isSuperadmin: boolean;
  companies?: Company[];
}

export default function Topbar({ title, company, isSuperadmin, companies = [] }: TopbarProps) {
  const pathName = usePathname();

  const selectedCompanyId = useCompanySelection((state) => state.selectedCompanyId);
  const setSelectedCompanyId = useCompanySelection((state) => state.setSelectedCompanyId);

  const companyOptions: SelectOption[] = companies.map((item) => ({
    value: item.id,
    label: item.name,
  }));

  const handleSelect = (companyId: string) => {
    setSelectedCompanyId(companyId);
  };

  return (
    <header className={styles.topbar}>
      <h1 className={styles.pageTitle}>{title}</h1>

      {isSuperadmin && !pathName?.startsWith('/empresas') && (
        <div className={styles.companySwitchWrapper}>
          <Select
            options={companyOptions}
            value={selectedCompanyId ?? undefined}
            onValueChange={handleSelect}
            placeholder="Selecionar empresa"
            size="sm"
            width={240}
          />
        </div>
      )}
      {!isSuperadmin && (
        <div className={styles.companyBadge}>
          <Building2 size={16} className={styles.icon} />
          {company?.name ?? '—'}
        </div>
      )}
    </header>
  );
}
