'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useAppAuth } from '@/hooks/useAppAuth';
import Sidebar from '@/components/layout/Sidebar/Sidebar';
import Topbar from '@/components/layout/Topbar/Topbar';
import styles from './layout.module.scss';
import { Button } from '@/components/ui/Button/Button';
import { ArrowLeft, LogOut } from 'lucide-react';

function StateActions({ onLogout, onBack }: { onLogout: () => void; onBack?: () => void }) {
  return (
    <div className={styles.stateActions}>
      {/* {onBack && ( */}
        <Button onClick={onBack} className={styles.stateBtnSecondary} icon={<ArrowLeft />} iconPosition="left">
          Voltar
        </Button>
      {/* )} */}
      <Button onClick={onLogout} className={styles.stateBtnPrimary} icon={<LogOut />} iconPosition="left">
        Sair
      </Button>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { authStatus, debugError, company, appUser, role, isSuperadmin } = useAppAuth();

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.replace('/');
    }
  }, [authStatus, router]);

  const handleLogout = () => {
    signOut(auth).catch(() => {});
  };

  const handleBack = () => {
    router.back();
  };

  if (authStatus === 'loading' || authStatus === 'unauthenticated') {
    return (
      <div className={styles.stateScreen}>
        <span className={styles.spinner} />
      </div>
    );
  }

  if (authStatus === 'forbidden') {
    return (
      <div className={styles.stateScreen}>
        <h1 className={styles.stateTitle}>Acesso não autorizado</h1>
        <p className={styles.stateBody}>
          Seu usuário não tem permissão de administrador para acessar o portal.
          Contate o administrador da sua empresa.
        </p>
        <StateActions onBack={handleBack} onLogout={handleLogout} />
      </div>
    );
  }

  if (authStatus === 'module-disabled') {
    return (
      <div className={styles.stateScreen}>
        <h1 className={styles.stateTitle}>Módulo indisponível</h1>
        <p className={styles.stateBody}>
          O módulo de portal ainda não foi habilitado para esta empresa.
          Contate a Emulog para ativá-lo.
        </p>
        <StateActions onLogout={handleLogout} />
      </div>
    );
  }

  if (authStatus === 'config-error') {
    return (
      <div className={styles.stateScreen}>
        <h1 className={styles.stateTitle}>Problema na conta</h1>
        <p className={styles.stateBody}>
          Não foi possível carregar os dados da sua conta. Contate o administrador.
        </p>
        {process.env.NODE_ENV !== 'production' && debugError && (
          <p className={styles.stateDebug}>{debugError}</p>
        )}
        <StateActions onLogout={handleLogout} />
      </div>
    );
  }

  return (
    <div className={styles.shell} style={{ display: 'flex', width: '100%', minHeight: '100vh' }}>
      <Sidebar company={company} appUser={appUser} role={role} />
      <main style={{ flex: 1 }}>
        <Topbar title="Dashboard" company={company} isSuperadmin={isSuperadmin} />
        {children}
      </main>
    </div>
  );
}
