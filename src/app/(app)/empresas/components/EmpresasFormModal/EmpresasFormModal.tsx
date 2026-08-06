'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { Switch } from '@/components/ui/Switch/Switch';
import { Button } from '@/components/ui/Button/Button';
import { useModifyCompany } from '@/hooks/useModifyCompany';
import { getCompanyModules } from '@/lib/companyModules';
import type { Company } from '@/types';
import styles from './EmpresasFormModal.module.scss';

interface EmpresaFormModalProps {
  visible: boolean;
  onClose: () => void;
  empresaEditando: Company | null;
  empresas: Company[];
}

const NENHUMA_MATRIZ = 'nenhuma';

const empresaFormSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório.'),
  cnpj: z.string(),
  primaryColor: z.string().min(1),
  parentCompanyId: z.string(),
  active: z.boolean(),
  moduleMobile: z.boolean(),
  modulePortal: z.boolean(),
});

type EmpresaFormFields = z.infer<typeof empresaFormSchema>;

function maskCnpj(value: string) {
  const raw = value.replace(/\D/g, '');
  if (raw.length <= 2) return raw;
  if (raw.length <= 5) return `${raw.slice(0, 2)}.${raw.slice(2)}`;
  if (raw.length <= 8) return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5)}`;
  if (raw.length <= 12) return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8)}`;
  return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8, 12)}-${raw.slice(12, 14)}`;
}

export default function EmpresaFormModal({ visible, onClose, empresaEditando, empresas }: EmpresaFormModalProps) {
  const isEditing = !!empresaEditando;
  const { createEmpresa, updateEmpresa } = useModifyCompany();
  const saving = createEmpresa.isPending || updateEmpresa.isPending;

  const { register, handleSubmit, control, reset, watch, formState: { errors } } = useForm<EmpresaFormFields>({
    resolver: zodResolver(empresaFormSchema),
    defaultValues: {
      name: '',
      cnpj: '',
      primaryColor: '#1F6452',
      parentCompanyId: NENHUMA_MATRIZ,
      active: false,
      moduleMobile: true,
      modulePortal: false,
    },
  });

  useEffect(() => {
    if (!visible) return;
    if (empresaEditando) {
      const modules = getCompanyModules(empresaEditando);
      reset({
        name: empresaEditando.name,
        cnpj: empresaEditando.cnpj ?? '',
        primaryColor: empresaEditando.primaryColor ?? '#1F6452',
        parentCompanyId: empresaEditando.parentCompanyId ?? NENHUMA_MATRIZ,
        active: empresaEditando.active,
        moduleMobile: modules.mobile,
        modulePortal: modules.portal,
      });
    } else {
      reset({
        name: '',
        cnpj: '',
        primaryColor: '#1F6452',
        parentCompanyId: NENHUMA_MATRIZ,
        active: false,
        moduleMobile: true,
        modulePortal: false,
      });
    }
  }, [visible, empresaEditando, reset]);

  const isFounding = !!empresaEditando?.founding;

  const opcoesMatriz = [
    { value: NENHUMA_MATRIZ, label: 'Nenhuma — esta é uma Matriz' },
    ...empresas
      .filter((empresa) => !empresa.parentCompanyId && empresa.id !== empresaEditando?.id)
      .map((empresa) => ({ value: empresa.id, label: empresa.name })),
  ];

  const onSubmit = (fields: EmpresaFormFields) => {
    const values = {
      name: fields.name,
      cnpj: fields.cnpj,
      primaryColor: fields.primaryColor,
      parentCompanyId: fields.parentCompanyId === NENHUMA_MATRIZ ? null : fields.parentCompanyId,
      active: fields.active,
      moduleMobile: fields.moduleMobile,
      modulePortal: fields.modulePortal,
    };

    if (isEditing && empresaEditando) {
      updateEmpresa.mutate({ id: empresaEditando.id, values }, { onSuccess: onClose });
    } else {
      createEmpresa.mutate(values, { onSuccess: onClose });
    }
  };

  return (
    <Modal
      open={visible}
      onOpenChange={(open) => !open && onClose()}
      title={isEditing ? 'Editar Empresa' : 'Nova Empresa'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="ok" onClick={handleSubmit(onSubmit)} loading={saving}>
            {isEditing ? 'Salvar alterações' : 'Criar empresa'}
          </Button>
        </>
      }
    >
      <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
        <Input
          label="Nome *"
          placeholder="Razão social"
          disabled={saving}
          error={!!errors.name}
          errorMessage={errors.name?.message}
          {...register('name')}
        />

        <Controller
          control={control}
          name="cnpj"
          render={({ field }) => (
            <Input
              label="CNPJ"
              placeholder="00.000.000/0000-00"
              disabled={saving}
              value={field.value}
              onChange={(e) => field.onChange(maskCnpj(e.target.value))}
              maxLength={18}
            />
          )}
        />

        <Controller
          control={control}
          name="parentCompanyId"
          render={({ field }) => (
            <div className={styles.field}>
              <span className={styles.label}>Empresa matriz</span>
              <Select options={opcoesMatriz} value={field.value} onValueChange={field.onChange} disabled={saving} />
            </div>
          )}
        />

        <div className={styles.field}>
          <span className={styles.label}>Cor principal</span>
          <input type="color" className={styles.colorInput} disabled={saving} {...register('primaryColor')} />
        </div>

        <div className={styles.switchesRow}>
          <Controller
            control={control}
            name="moduleMobile"
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} label="Módulo Mobile" disabled={saving} />
            )}
          />
          <Controller
            control={control}
            name="modulePortal"
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} label="Módulo Portal" disabled={saving} />
            )}
          />
        </div>

        {!isFounding && (
          <Controller
            control={control}
            name="active"
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} label="Empresa ativa" disabled={saving} />
            )}
          />
        )}
      </form>
    </Modal>
  );
}
