'use client';

import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { MultiSelect } from '@/components/ui/Multiselect/Multiselect';
import { Search } from 'lucide-react';
import { PAGE_SIZE_OPTIONS } from '@/hooks/fogos/useProjetos';
import type { Produto, Caminhao } from '@/types';
import styles from './FiltrosFogos.module.scss';

interface FiltrosState {
  busca: string;
  dataInicio: string;
  dataFim: string;
  produtoIds: string[];
  caminhaoIds: string[];
  pageSize: number;
}

interface FiltrosFogosProps {
  filtros: FiltrosState;
  onChange: (filtros: FiltrosState) => void;
  produtos: Produto[];
  caminhoes: Caminhao[];
}

export default function FiltrosFogos({ filtros, onChange, produtos, caminhoes }: FiltrosFogosProps) {
  const hoje = new Date().toISOString().split('T')[0];

  const update = (patch: Partial<FiltrosState>) => onChange({ ...filtros, ...patch });

  const updateDataInicio = (value: string) => {
    const patch: Partial<FiltrosState> = { dataInicio: value };
    if (filtros.dataFim && value > filtros.dataFim) {
      patch.dataFim = value;
    }
    update(patch);
  };

  const updateDataFim = (value: string) => {
    const patch: Partial<FiltrosState> = { dataFim: value };
    if (filtros.dataInicio && value < filtros.dataInicio) {
      patch.dataInicio = value;
    }
    update(patch);
  };

  return (
    <div className={styles.container}>
      <Input
        icon={<Search size={16} />}
        label="Buscar"
        placeholder="Nome do fogo"
        value={filtros.busca}
        onChange={(e) => update({ busca: e.target.value })}
        size='sm'
      />
      <div className={styles.field}>
        <span className={styles.label}>Data início</span>
        <Input
          type="date"
          className={styles.dateInput}
          value={filtros.dataInicio}
          max={filtros.dataFim || hoje}
          onChange={(e) => updateDataInicio(e.target.value)}
          size='sm'
        />
      </div>
      <div className={styles.field}>
        <span className={styles.label}>Data fim</span>
        <Input
          type="date"
          className={styles.dateInput}
          value={filtros.dataFim}
          min={filtros.dataInicio || undefined}
          max={hoje}
          onChange={(e) => updateDataFim(e.target.value)}
          size='sm'
        />
      </div>
      <MultiSelect
        values={filtros.produtoIds}
        onValuesChange={(v) => update({ produtoIds: v })}
        options={produtos.map((p) => ({ value: p.id, label: p.nome }))}
        placeholder="Todos"
        size="sm"
        label="Produto"
      />
      <MultiSelect
        values={filtros.caminhaoIds}
        onValuesChange={(v) => update({ caminhaoIds: v })}
        options={caminhoes.map((c) => ({ value: c.id, label: c.tag ?? c.placa }))}
        placeholder="Todas"
        size="sm"
        label="UMB"
      />
      <div className={styles.field}>
        <span className={styles.label}>Por página</span>
        <Select
          value={String(filtros.pageSize)}
          onValueChange={(v) => update({ pageSize: Number(v) })}
          options={PAGE_SIZE_OPTIONS.map((n) => ({ value: String(n), label: `${n} por página` }))}
          size='sm'
        />
      </div>
    </div>
  );
}
