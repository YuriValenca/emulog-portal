'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppAuth } from '@/hooks/useAppAuth';
import { LoginForm } from './components/LoginForm';
import styles from './page.module.scss';

export default function RootPage() {
  const router = useRouter();
  const { authStatus } = useAppAuth();

  useEffect(() => {
    if (authStatus !== 'loading' && authStatus !== 'unauthenticated') {
      router.replace('/dashboard');
    }
  }, [authStatus, router]);

  if (authStatus !== 'unauthenticated') {
    return (
      <div className={styles.page}>
        <span className={styles.spinner} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <LoginForm />
    </div>
  );
}
