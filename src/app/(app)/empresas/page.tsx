'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button/Button';
import { Tabs } from '@/components/ui/Tabs/Tabs';
import { useAppAuth } from '@/hooks/useAppAuth';
import EmpresasTable from './components/EmpresasTable/EmpresasTable';
import EmpresaFormModal from './components/EmpresasFormModal/EmpresasFormModal';
import { AbaLicencas, SeletorDeEmpresa } from './components/Licencas/AbaLicencas';
import styles from './page.module.scss';
import type { Company } from '@/types';
import { Spinner } from '@/components/ui/Spinner/Spinner';

export default function EmpresasPage() {
  const [aba, setAba] = useState('empresas');

  return (
    <div className={styles.container}>
      <Tabs
        value={aba}
        onValueChange={setAba}
        acaoDoCabecalho={aba === 'licencas' ? <SeletorDeEmpresa /> : undefined}
        items={[
          { value: 'empresas', label: 'Empresas', content: <AbaEmpresas /> },
          { value: 'licencas', label: 'Licenças', content: <AbaLicencas /> },
        ]}
      />
    </div>
  );
}

function AbaEmpresas() {
  const { companies } = useAppAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [empresaEditando, setEmpresaEditando] = useState<Company | null>(null);

  const abrirCriacao = () => {
    setEmpresaEditando(null);
    setModalOpen(true);
  };

  const abrirEdicao = (empresa: Company) => {
    setEmpresaEditando(empresa);
    setModalOpen(true);
  };

  return (
    <>
      <div className={styles.header}>
        <h2 className={styles.title}>Empresas cadastradas</h2>
        <Button variant="brand" icon={<Plus size={16} />} onClick={abrirCriacao}>
          Nova empresa
        </Button>
      </div>

      {companies === null ? (
        <div className={styles.loading}>
          <Spinner />
        </div>
      ) : (
        <EmpresasTable empresas={companies} onEditar={abrirEdicao} />
      )}

      <EmpresaFormModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        empresaEditando={empresaEditando}
        empresas={companies ?? []}
      />
    </>
  );
}
