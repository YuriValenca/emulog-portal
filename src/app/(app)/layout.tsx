'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useAppAuth } from '@/hooks/useAppAuth';
import { useCompanyGroup } from '@/hooks/fogos/useCompanyGroup';
import { useOcorrencias } from '@/hooks/ocorrencias/useOcorrencias';
import { useOcorrenciasAutoScan } from '@/hooks/ocorrencias/useOcorrenciasAutoScan';
import { useOcorrenciasNaoVistas } from '@/hooks/ocorrencias/useOcorrenciasNaoVistas';
import { useMarcarOcorrenciasVisitadas } from '@/hooks/ocorrencias/useMarcarOcorrenciasVisitadas';
import { ScanProgressCard } from '@/components/layout/ScanProgressCard/ScanProgressCard';
import Sidebar from '@/components/layout/Sidebar/Sidebar';
import Topbar from '@/components/layout/Topbar/Topbar';
import styles from './layout.module.scss';
import { Button } from '@/components/ui/Button/Button';
import { ArrowLeft, LogOut } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner/Spinner';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/cadastros': 'Cadastros',
  '/empresas': 'Empresas',
  '/fogos': 'Gestão de fogos',
  '/ocorrencias': 'Ocorrências',
  '/vencimentos': 'Vencimentos',
};

function resolvePageTitle(pathname: string) {
  const match = Object.keys(PAGE_TITLES)
    .filter((path) => pathname.startsWith(path))
    .sort((a, b) => b.length - a.length)[0];
  return match ? PAGE_TITLES[match] : 'Portal Emulog';
}

function StateActions({ onLogout, onBack }: { onLogout: () => void; onBack?: () => void }) {
  return (
    <div className={styles.stateActions}>
      {onBack && (
        <Button onClick={onBack} className={styles.stateBtnSecondary} icon={<ArrowLeft />} iconPosition="left">
          Voltar
        </Button>
      )}
      <Button onClick={onLogout} className={styles.stateBtnPrimary} icon={<LogOut />} iconPosition="left">
        Sair
      </Button>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { authStatus, debugError, company, companies, appUser, role, isSuperadmin, companyId } = useAppAuth();

  const { companyIds } = useCompanyGroup(companyId);
  const { ocorrencias } = useOcorrencias(companyIds);
  const scanState = useOcorrenciasAutoScan(companyId);
  const temOcorrenciasNaoVistas = useOcorrenciasNaoVistas(ocorrencias, appUser);
  const marcarVisitadas = useMarcarOcorrenciasVisitadas();

  useEffect(() => {
    if (pathname === '/ocorrencias' && appUser?.uid) {
      marcarVisitadas(appUser.uid);
    }
  }, [pathname, appUser?.uid, marcarVisitadas]);

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
        <Spinner />
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
    <div className={styles.shell}>
      <Sidebar company={company} appUser={appUser} role={role} temOcorrenciasNaoVistas={temOcorrenciasNaoVistas} />
      <main className={styles.main}>
        <Topbar
          title={resolvePageTitle(pathname)}
          company={company}
          isSuperadmin={isSuperadmin}
          companies={isSuperadmin ? companies ?? [] : []}
        />
        <div className={styles.content}>{children}</div>
      </main>
      {scanState.isScanning && <ScanProgressCard total={scanState.total} processados={scanState.processados} />}
    </div>
  );
}
