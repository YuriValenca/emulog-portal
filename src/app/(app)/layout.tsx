'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppAuth } from '@/hooks/useAppAuth';
import styles from './layout.module.scss';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { authStatus, debugError } = useAppAuth();

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.replace('/');
    }
  }, [authStatus, router]);

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
      </div>
    );
  }

  return <div className={styles.shell}>{children}</div>;
}
