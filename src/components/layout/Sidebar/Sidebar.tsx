'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { ReactNode } from 'react';
import { Building2, CalendarX, FilePlus, FileText, Flame, LayoutGrid, LogOut, TriangleAlert } from 'lucide-react';
import { auth } from '@/lib/firebase/client';
import type { AppUser, Company, UserRole } from '@/types';
import styles from './Sidebar.module.scss';
import Image from 'next/image';
import { Button } from '@/components/ui/Button/Button';

interface SidebarProps {
  company: Company | null;
  appUser: AppUser | null;
  role: UserRole | 'superadmin' | null;
}

interface NavLink {
  icon: ReactNode;
  label: string;
  href: string;
  disabled?: boolean;
}

const operationLinks: NavLink[] = [
  { icon: <LayoutGrid size={16} />, label: 'Painel operacional', href: '/dashboard' },
  { icon: <FileText size={16} />, label: 'Cadastros', href: '/cadastros' },
  { icon: <Flame size={16} />, label: 'Gestão de fogos', href: '/fogos' },
  { icon: <FilePlus size={16} />, label: 'Relatórios', href: '/relatorios', disabled: true },
  { icon: <TriangleAlert size={16} />, label: 'Ocorrências', href: '/ocorrencias', disabled: true },
  { icon: <CalendarX size={16} />, label: 'Vencimentos', href: '/vencimentos', disabled: true },
];

export default function Sidebar({ company, appUser, role }: SidebarProps) {
  const pathname = usePathname();
  const isSuperadmin = role === 'superadmin';

  const handleLogout = () => {
    signOut(auth).catch(() => {});
  };

  const initials = (appUser?.nome ?? company?.name ?? '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <Image src="/assets/emulogLogo.svg" alt="EMULOG" className={styles.brandMark} width={32} height={32} />
        <span className={styles.brandName}>EMULOG</span>
      </div>

      <p className={styles.navLabel}>Operação</p>
      <nav className={styles.nav}>
        {operationLinks.map((link) =>
          link.disabled ? (
            <span key={link.href} className={`${styles.navItem} ${styles.navItemDisabled}`}>
              {link.icon}
              {link.label}
            </span>
          ) : (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.navItem} ${pathname?.startsWith(link.href) ? styles.navItemActive : ''}`}
            >
              {link.icon}
              {link.label}
            </Link>
          )
        )}
      </nav>

      {isSuperadmin && (
        <>
          <p className={styles.navLabel}>Administração</p>
          <nav className={styles.nav}>
            <Link
              href="/empresas"
              className={`${styles.navItem} ${pathname?.startsWith('/empresas') ? styles.navItemActive : ''}`}
            >
              <Building2 size={16} />
              Empresas
            </Link>
          </nav>
        </>
      )}

      <div className={styles.sidebarUser}>
        <div className={styles.avatar}>{initials}</div>
        <div>
          <div className={styles.userName}>{appUser?.nome ?? 'Usuário'}</div>
          <div className={styles.userRole}>{isSuperadmin ? 'Superadmin' : 'Gestor'}</div>
        </div>
        <Button onClick={handleLogout} className={styles.logoutBtn} icon={<LogOut size={16} />} iconPosition="left"></Button>
      </div>
    </aside>
  );
}
