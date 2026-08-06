'use client';

import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { Smartphone, Globe } from 'lucide-react';
import { Switch } from '@/components/ui/Switch/Switch';
import { StatusPill } from '@/components/ui/StatusPill/StatusPill';
import { useModifyCompany } from '@/hooks/useModifyCompany';
import { getCompanyModules } from '@/lib/companyModules';
import type { Company } from '@/types';
import styles from './EmpresasTable.module.scss';

interface EmpresasTableProps {
  empresas: Company[];
  onEditar: (empresa: Company) => void;
}

const columnHelper = createColumnHelper<Company>();

export default function EmpresasTable({ empresas, onEditar }: EmpresasTableProps) {
  const { toggleActive, toggleModule } = useModifyCompany();

  const empresaPorId = new Map(empresas.map((e) => [e.id, e]));

  const columns = [
    columnHelper.accessor('name', {
      header: 'Empresa',
      cell: (info) => (
        <button type="button" className={styles.nomeBtn} onClick={() => onEditar(info.row.original)}>
          {info.getValue()}
        </button>
      ),
    }),
    columnHelper.accessor('cnpj', {
      header: 'CNPJ',
      cell: (info) => info.getValue() || '—',
    }),
    columnHelper.display({
      id: 'tipo',
      header: 'Tipo',
      cell: (info) => {
        const empresa = info.row.original;
        return empresa.parentCompanyId ? (
          <StatusPill label="Filial" tone="data" />
        ) : (
          <StatusPill label="Matriz" tone="warn" />
        );
      },
    }),
    columnHelper.display({
      id: 'vinculada',
      header: 'Vinculada a',
      cell: (info) => {
        const empresa = info.row.original;
        if (!empresa.parentCompanyId) return '—';
        return empresaPorId.get(empresa.parentCompanyId)?.name ?? '—';
      },
    }),
    columnHelper.display({
      id: 'modulos',
      header: 'Módulos',
      cell: (info) => {
        const empresa = info.row.original;
        const modules = getCompanyModules(empresa);
        return (
          <div className={styles.modulosRow}>
            <Switch
              checked={modules.mobile}
              onCheckedChange={() => toggleModule.mutate({ company: empresa, moduleKey: 'mobile' })}
              icon={<Smartphone size={14} />}
              disabled={toggleModule.isPending}
            />
            <Switch
              checked={modules.portal}
              onCheckedChange={() => toggleModule.mutate({ company: empresa, moduleKey: 'portal' })}
              icon={<Globe size={14} />}
              disabled={toggleModule.isPending}
            />
          </div>
        );
      },
    }),
    columnHelper.display({
      id: 'status',
      header: 'Status',
      cell: (info) => {
        const empresa = info.row.original;
        if (empresa.founding) return <StatusPill label="Founding" tone="warn" />;
        return (
          <Switch
            checked={empresa.active}
            onCheckedChange={() => toggleActive.mutate(empresa)}
            disabled={toggleActive.isPending}
          />
        );
      },
    }),
  ];

  const table = useReactTable({
    data: empresas,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  return (
    <table className={styles.table}>
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th key={header.id}>
                {flexRender(header.column.columnDef.header, header.getContext())}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
            ))}
          </tr>
        ))}
        {empresas.length === 0 && (
          <tr>
            <td colSpan={6} className={styles.vazio}>
              Nenhuma empresa cadastrada.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
