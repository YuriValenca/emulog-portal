'use client';

import { Input } from '@/components/ui/Input/Input';
import { IntervaloDeDatas } from '@/components/ui/IntervaloDeDatas/IntervaloDeDatas';
import { Select } from '@/components/ui/Select/Select';
import { MultiSelect } from '@/components/ui/Multiselect/Multiselect';
import { Search } from 'lucide-react';
import { PAGE_SIZE_OPTIONS } from '@/hooks/fogos/useProjetos';
import { rotuloCaminhao } from '@/helpers/rotuloCaminhao';
import type { Produto, Caminhao } from '@/types';
import styles from './FiltrosFogos.module.scss';

export interface FiltrosState {
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
  const update = (patch: Partial<FiltrosState>) => onChange({ ...filtros, ...patch });

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
      <IntervaloDeDatas
        id="fogos-data"
        intervalo={{ inicio: filtros.dataInicio, fim: filtros.dataFim }}
        onChange={({ inicio, fim }) => update({ dataInicio: inicio, dataFim: fim })}
      />
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
        options={caminhoes.map((c) => ({ value: c.id, label: rotuloCaminhao(c) }))}
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
