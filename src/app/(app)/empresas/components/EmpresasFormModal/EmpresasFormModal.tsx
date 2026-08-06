'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { FilePicker } from '@/components/ui/FilePicker/FilePicker';
import { Select } from '@/components/ui/Select/Select';
import { Switch } from '@/components/ui/Switch/Switch';
import { Button } from '@/components/ui/Button/Button';
import { useModifyCompany } from '@/hooks/useModifyCompany';
import { getCompanyModules } from '@/lib/companyModules';
import type { Company } from '@/types';
import styles from './EmpresasFormModal.module.scss';
import { formatCNPJ } from '@/helpers/formatCNPJ';

interface EmpresaFormModalProps {
  visible: boolean;
  onClose: () => void;
  empresaEditando: Company | null;
  empresas: Company[];
}

const NENHUMA_MATRIZ = 'nenhuma';
const LOGO_MAX_WIDTH = 400;
const LOGO_QUALITY = 0.7;

const empresaFormSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório.'),
  cnpj: z.string(),
  logo: z.string().nullable(),
  primaryColor: z.string().min(1),
  parentCompanyId: z.string(),
  active: z.boolean(),
  moduleMobile: z.boolean(),
  modulePortal: z.boolean(),
});

type EmpresaFormFields = z.infer<typeof empresaFormSchema>;

function resizeImageToBase64(file: File, maxWidth: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('canvas-context-unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('image-load-failed'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('file-read-failed'));
    reader.readAsDataURL(file);
  });
}

export default function EmpresaFormModal({ visible, onClose, empresaEditando, empresas }: EmpresaFormModalProps) {
  const isEditing = !!empresaEditando;
  const { createEmpresa, updateEmpresa } = useModifyCompany();
  const saving = createEmpresa.isPending || updateEmpresa.isPending;

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  const { register, handleSubmit, control, reset, watch, setValue, formState: { errors } } = useForm<EmpresaFormFields>({
    resolver: zodResolver(empresaFormSchema),
    defaultValues: {
      name: '',
      cnpj: '',
      logo: null,
      primaryColor: '#1F6452',
      parentCompanyId: NENHUMA_MATRIZ,
      active: false,
      moduleMobile: true,
      modulePortal: false,
    },
  });

  const logo = watch('logo');

  useEffect(() => {
    if (!visible) return;
    setLogoError(null);
    if (empresaEditando) {
      const modules = getCompanyModules(empresaEditando);
      reset({
        name: empresaEditando.name,
        cnpj: empresaEditando.cnpj ?? '',
        logo: empresaEditando.logo ?? null,
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
        logo: null,
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

  const handleLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setLogoError(null);
    setUploadingLogo(true);
    try {
      const base64 = await resizeImageToBase64(file, LOGO_MAX_WIDTH, LOGO_QUALITY);
      setValue('logo', base64, { shouldDirty: true });
    } catch {
      setLogoError('Não foi possível processar a imagem.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLogoRemove = () => {
    setValue('logo', null, { shouldDirty: true });
  };

  const onSubmit = (fields: EmpresaFormFields) => {
    const values = {
      name: fields.name,
      cnpj: fields.cnpj,
      logo: fields.logo,
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
              onChange={(e) => field.onChange(formatCNPJ(e.target.value))}
              maxLength={18}
            />
          )}
        />

        <FilePicker
          label="Logo da empresa"
          accept="image/png,image/jpeg,image/webp"
          placeholder="Toque para selecionar uma imagem"
          hint="JPG, PNG ou WEBP"
          preview={logo}
          loading={uploadingLogo}
          onChange={handleLogoChange}
          onRemove={handleLogoRemove}
          disabled={saving}
          errorMessage={logoError ?? undefined}
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

        <Input
          type="color"
          label="Cor principal"
          disabled={saving}
          className={styles.colorInput}
          {...register('primaryColor')}
        />

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
