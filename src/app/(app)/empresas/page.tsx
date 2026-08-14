'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button/Button';
import { useAppAuth } from '@/hooks/useAppAuth';
import EmpresasTable from './components/EmpresasTable/EmpresasTable';
import EmpresaFormModal from './components/EmpresasFormModal/EmpresasFormModal';
import styles from './page.module.scss';
import type { Company } from '@/types';
import { Spinner } from '@/components/ui/Spinner/Spinner';

export default function EmpresasPage() {
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
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Empresas cadastradas</h2>
        <Button variant="accent" icon={<Plus size={16} />} onClick={abrirCriacao}>
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
    </div>
  );
}
