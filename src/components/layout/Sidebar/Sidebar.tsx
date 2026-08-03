'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { LogOut } from 'lucide-react';
import { auth } from '@/lib/firebase/client';
import type { AppUser, Company, UserRole } from '@/types';
import styles from './Sidebar.module.scss';
import Image from 'next/image';

interface SidebarProps {
  company: Company | null;
  appUser: AppUser | null;
  role: UserRole | 'superadmin' | null;
}

interface NavLink {
  label: string;
  href: string;
  disabled?: boolean;
}

const operationLinks: NavLink[] = [
  { label: 'Painel operacional', href: '/dashboard' },
  { label: 'Gestão de fogos', href: '/fogos' },
  { label: 'Ocorrências', href: '/ocorrencias', disabled: true },
  { label: 'Vencimentos', href: '/vencimentos', disabled: true },
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
              {link.label}
              <span className={styles.navBadge}>em breve</span>
            </span>
          ) : (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.navItem} ${pathname?.startsWith(link.href) ? styles.navItemActive : ''}`}
            >
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
        <button type="button" onClick={handleLogout} className={styles.logoutBtn} aria-label="Sair">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
