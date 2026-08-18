'use client';

import * as RadixPopover from '@radix-ui/react-popover';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import clsx from 'clsx';
import { CSSProperties, MouseEvent, useMemo, useState } from 'react';
import styles from './Multiselect.module.scss';

export interface MultiSelectOption {
  value: string;
  label: string;
}

type MultiSelectSize = 'sm' | 'md' | 'lg';
type MultiSelectWidth = number | string;

interface MultiSelectProps {
  options: MultiSelectOption[];
  values: string[];
  onValuesChange: (values: string[]) => void;
  placeholder?: string;
  label?: string;
  size?: MultiSelectSize;
  width?: MultiSelectWidth;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  portalContainer?: HTMLElement | null;
}

function widthStyle(width?: MultiSelectWidth): CSSProperties | undefined {
  if (width === undefined) return undefined;
  return { width: typeof width === 'number' ? `${width}px` : width };
}

export function MultiSelect({
  options,
  values,
  onValuesChange,
  placeholder = 'Selecionar...',
  label,
  size = 'md',
  width,
  disabled,
  searchable = true,
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'Nenhum resultado encontrado',
  portalContainer,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState('');

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchText.trim()) return options;
    const q = searchText.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, searchText, searchable]);

  const selectedLabels = options.filter((o) => values.includes(o.value)).map((o) => o.label);

  const triggerText =
    selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length <= 2
        ? selectedLabels.join(', ')
        : `${selectedLabels.length} selecionados`;

  const toggleValue = (value: string) => {
    onValuesChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);
  };

  const handleClear = (event: MouseEvent<HTMLSpanElement>) => {
    event.stopPropagation();
    onValuesChange([]);
  };

  return (
    <RadixPopover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearchText('');
      }}
    >
      <div className={styles.field} style={widthStyle(width)}>
        {label && <span className={styles.label}>{label}</span>}
        <RadixPopover.Trigger asChild>
          <button
            type="button"
            className={clsx(styles.trigger, styles[size], disabled && styles.disabled)}
            disabled={disabled}
          >
            <span className={clsx(styles.triggerText, selectedLabels.length === 0 && styles.placeholder)}>
              {triggerText}
            </span>
            <span className={styles.triggerIcons}>
              {selectedLabels.length > 0 && (
                <span className={styles.clearBtn} onClick={handleClear}>
                  <X size={14} />
                </span>
              )}
              <ChevronDown size={16} className={styles.icon} />
            </span>
          </button>
        </RadixPopover.Trigger>
      </div>

      <RadixPopover.Portal container={portalContainer}>
        <RadixPopover.Content
          className={styles.content}
          style={{ width: 'var(--radix-popover-trigger-width)', zIndex: 10000 }}
          sideOffset={4}
          onOpenAutoFocus={(event) => {
            if (!searchable) event.preventDefault();
          }}
        >
          {searchable && (
            <div className={styles.searchRow}>
              <Search size={14} className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                placeholder={searchPlaceholder}
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                autoFocus
              />
            </div>
          )}

          <div className={styles.viewport}>
            {filteredOptions.length === 0 && <div className={styles.stateRow}>{emptyMessage}</div>}

            {filteredOptions.map((option) => {
              const checked = values.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  className={clsx(styles.item, checked && styles.itemActive)}
                  onClick={() => toggleValue(option.value)}
                >
                  <span className={clsx(styles.checkbox, checked && styles.checkboxChecked)}>
                    {checked && <Check size={12} />}
                  </span>
                  <span className={styles.itemText}>{option.label}</span>
                </button>
              );
            })}
          </div>
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
