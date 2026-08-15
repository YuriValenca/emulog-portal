'use client';

import { useAppAuth } from '@/hooks/useAppAuth';
import { Tabs } from '@/components/ui/Tabs/Tabs';
import { UsuariosTab } from './components/Tabs/UsuariosTab';
import { EquipeTab } from './components/Tabs/EquipeTab';
import { UmbsTab } from './components/Tabs/UMBTab';
import { ProdutosTab } from './components/Tabs/ProdutosTab';
import styles from './page.module.scss';

export default function CadastrosPage() {
  const { companyId, isSuperadmin } = useAppAuth();

  if (isSuperadmin && !companyId) {
    return (
      <div className={styles.content}>
        <p className={styles.empty}>Selecione uma empresa no topo da página para ver os cadastros.</p>
      </div>
    );
  }

  return (
    <div className={styles.content}>
      <Tabs
        items={[
          { value: 'usuarios', label: 'Usuários', content: <UsuariosTab companyId={companyId} /> },
          { value: 'equipe', label: 'Equipe', content: <EquipeTab companyId={companyId} /> },
          { value: 'umbs', label: 'UMBs', content: <UmbsTab companyId={companyId} /> },
          { value: 'produtos', label: 'Produtos', content: <ProdutosTab companyId={companyId} /> },
        ]}
      />
    </div>
  );
}
