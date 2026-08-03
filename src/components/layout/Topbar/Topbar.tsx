'use client';

import { useState } from 'react';
import { Building2, ChevronDown } from 'lucide-react';
import type { Company } from '@/types';
import styles from './Topbar.module.scss';

interface TopbarProps {
  title: string;
  company: Company | null;
  isSuperadmin: boolean;
  companies?: Company[];
  onSwitchCompany?: (companyId: string) => void;
}

export default function Topbar({ title, company, isSuperadmin, companies = [], onSwitchCompany }: TopbarProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (companyId: string) => {
    setOpen(false);
    onSwitchCompany?.(companyId);
  };

  return (
    <header className={styles.topbar}>
      <h1 className={styles.pageTitle}>{title}</h1>

      {isSuperadmin ? (
        <div className={styles.companySwitchWrapper}>
          <button type="button" className={styles.companySwitch} onClick={() => setOpen((prev) => !prev)}>
            <Building2 size={16} className={styles.icon} />
            {company?.name ?? 'Selecionar empresa'}
            <ChevronDown size={16} className={styles.icon} />
          </button>

          {open && companies.length > 0 && (
            <ul className={styles.companyDropdown}>
              {companies.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => handleSelect(item.id)}>
                    {item.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className={styles.companyBadge}>
          <Building2 size={16} className={styles.icon} />
          {company?.name ?? '—'}
        </div>
      )}
    </header>
  );
}
