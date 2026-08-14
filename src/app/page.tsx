'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppAuth } from '@/hooks/useAppAuth';
import { LoginForm } from './components/LoginForm';
import styles from './page.module.scss';
import { Spinner } from '@/components/ui/Spinner/Spinner';

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
        <Spinner />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <LoginForm />
    </div>
  );
}
