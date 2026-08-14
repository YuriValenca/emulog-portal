'use client';

import * as RadixSelect from '@radix-ui/react-select';
// import * as RadixPopover from '@radix-ui/react-popover';
import { Check, ChevronDown /* , Search */ } from 'lucide-react';
import clsx from 'clsx';
import { CSSProperties, ReactNode /* , useEffect, useMemo, useState */ } from 'react';
// import { Input } from '@/components/ui/Input/Input';
// import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import styles from './Select.module.scss';
// import { Spinner } from '../Spinner/Spinner';

export interface SelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

type SelectSize = 'sm' | 'md' | 'lg';
type SelectWidth = number | string;

interface BaseSelectProps {
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  size?: SelectSize;
  width?: SelectWidth;
  disabled?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
  resetOption?: string;
}

interface StaticSelectProps extends BaseSelectProps {
  searchable?: false;
}

/*
interface SearchableSelectProps extends BaseSelectProps {
  searchable: true;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  debounceMs?: number;
  loading?: boolean;
  emptyMessage?: string;
}
*/

type SelectProps = StaticSelectProps /* | SearchableSelectProps */;

const RESET_VALUE = '__select_reset__';

function widthStyle(width?: SelectWidth): CSSProperties | undefined {
  if (width === undefined) return undefined;
  return { width: typeof width === 'number' ? `${width}px` : width };
}

export function Select(props: SelectProps) {
  // if (props.searchable) return <SearchableSelect {...props} />;
  return <StaticSelect {...props} />;
}

function StaticSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Selecionar...',
  label,
  size = 'md',
  width,
  disabled,
  resetOption,
}: StaticSelectProps) {
  const rootValue = value ? value : resetOption ? RESET_VALUE : '';

  const handleChange = (v: string) => {
    onValueChange?.(v === RESET_VALUE ? '' : v);
  };

  return (
    <div className={styles.field} style={widthStyle(width)}>
      {label && <span className={styles.label}>{label}</span>}
      <RadixSelect.Root value={rootValue} onValueChange={handleChange} disabled={disabled}>
        <RadixSelect.Trigger className={clsx(styles.trigger, styles[size])}>
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon className={styles.icon}>
            <ChevronDown size={16} />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>

        <RadixSelect.Portal>
          <RadixSelect.Content
            className={styles.content}
            position="popper"
            sideOffset={4}
            style={{ width: 'var(--radix-select-trigger-width)' }}
          >
            <RadixSelect.Viewport className={styles.viewport}>
              {resetOption && (
                <RadixSelect.Item
                  value={RESET_VALUE}
                  className={clsx(styles.item, styles.itemReset)}
                >
                  <RadixSelect.ItemText className={styles.itemText}>
                    {resetOption}
                  </RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator className={styles.itemIndicator}>
                    <Check size={14} />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              )}

              {options.map((option) => (
                <RadixSelect.Item key={option.value} value={option.value} className={styles.item}>
                  {option.icon && <span className={styles.itemIcon}>{option.icon}</span>}
                  <RadixSelect.ItemText className={styles.itemText}>
                    {option.label}
                  </RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator className={styles.itemIndicator}>
                    <Check size={14} />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    </div>
  );
}

/*
function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Buscar...',
  label,
  size = 'md',
  width,
  disabled,
  searchValue,
  onSearchChange,
  debounceMs = 400,
  loading,
  emptyMessage = 'Nenhum resultado encontrado',
  resetOption,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [inputText, setInputText] = useState(searchValue ?? '');
  const debouncedText = useDebouncedValue(inputText, onSearchChange ? debounceMs : 0);

  const selectedOption = options.find((o) => o.value === value);

  useEffect(() => {
    if (searchValue !== undefined) setInputText(searchValue);
  }, [searchValue]);

  useEffect(() => {
    onSearchChange?.(debouncedText);
  }, [debouncedText, onSearchChange]);

  const filteredOptions = useMemo(() => {
    if (onSearchChange) return options;
    if (!inputText.trim()) return options;
    const q = inputText.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, inputText, onSearchChange]);

  const handleSelect = (option: SelectOption) => {
    onValueChange?.(option.value);
    setInputText('');
    onSearchChange?.('');
    setOpen(false);
  };

  const handleReset = () => {
    onValueChange?.('');
    setInputText('');
    onSearchChange?.('');
    setOpen(false);
  };

  return (
    <RadixPopover.Root open={open} onOpenChange={setOpen}>
      <div className={styles.field} style={widthStyle(width)}>
        {label && <span className={styles.label}>{label}</span>}
        <RadixPopover.Anchor asChild>
          <div className={clsx(styles.searchWrapper, disabled && styles.disabled)}>
            <Input
              icon={<Search size={16} />}
              size={size}
              placeholder={selectedOption ? selectedOption.label : placeholder}
              value={inputText}
              disabled={disabled}
              onFocus={() => setOpen(true)}
              onChange={(e) => {
                setInputText(e.target.value);
                if (!open) setOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredOptions[0]) {
                  e.preventDefault();
                  handleSelect(filteredOptions[0]);
                }
                if (e.key === 'Escape') setOpen(false);
              }}
            />
          </div>
        </RadixPopover.Anchor>
      </div>

      <RadixPopover.Portal>
        <RadixPopover.Content
          className={styles.content}
          style={{ width: 'var(--radix-popover-trigger-width)' }}
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className={styles.viewport}>
            {resetOption && (
              <button
                type="button"
                className={clsx(styles.item, styles.itemReset, !value && styles.itemActive)}
                onClick={handleReset}
              >
                <span className={styles.itemText}>{resetOption}</span>
                {!value && (
                  <span className={styles.itemIndicator}>
                    <Check size={14} />
                  </span>
                )}
              </button>
            )}

            {loading && (
              <div className={styles.stateRow}>
                <Spinner size='xsm' />
                Carregando...
              </div>
            )}

            {!loading && filteredOptions.length === 0 && (
              <div className={styles.stateRow}>{emptyMessage}</div>
            )}

            {!loading &&
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={clsx(styles.item, option.value === value && styles.itemActive)}
                  onClick={() => handleSelect(option)}
                >
                  {option.icon && <span className={styles.itemIcon}>{option.icon}</span>}
                  <span className={styles.itemText}>{option.label}</span>
                  {option.value === value && (
                    <span className={styles.itemIndicator}>
                      <Check size={14} />
                    </span>
                  )}
                </button>
              ))}
          </div>
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
*/
