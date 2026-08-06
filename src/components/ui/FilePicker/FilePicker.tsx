'use client';

import { forwardRef, InputHTMLAttributes, useMemo, useRef } from 'react';
import clsx from 'clsx';
import { Camera, ImagePlus, Loader2, X } from 'lucide-react';
import styles from './FilePicker.module.scss';

export interface FilePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  label?: string;
  errorMessage?: string;
  preview?: string | null;
  loading?: boolean;
  hint?: string;
  onRemove?: () => void;
  alt?: string;
}

function mergeRefs(...refs: Array<React.Ref<HTMLInputElement> | undefined>) {
  return (node: HTMLInputElement | null) => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === 'function') ref(node);
      else (ref as React.RefObject<HTMLInputElement | null>).current = node;
    });
  };
}

function LoadingState() {
  return (
    <div className={styles.filePickerContent}>
      <Loader2 size={20} className={styles.fileSpinner} />
      <span className={styles.filePickerText}>Processando imagem...</span>
    </div>
  );
}

interface PreviewStateProps {
  preview: string;
  alt?: string;
  disabled?: boolean;
  onRemove?: () => void;
}

function PreviewState({ preview, alt, disabled, onRemove }: PreviewStateProps) {
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.();
  };

  return (
    <div className={styles.filePickerContent}>
      <img src={preview} alt={alt ?? 'Pré-visualização'} className={styles.filePreview} />
      <div className={styles.filePickerOverlay}>
        <Camera size={16} />
        <span>Trocar imagem</span>
      </div>
      {onRemove && (
        <button
          type="button"
          className={styles.fileRemoveOverlay}
          onClick={handleRemove}
          disabled={disabled}
          aria-label="Remover imagem"
        >
          <X size={22} />
          <span>Remover</span>
        </button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  placeholder: string;
  hint?: string;
}

function EmptyState({ placeholder, hint }: EmptyStateProps) {
  return (
    <div className={styles.filePickerContent}>
      <div className={styles.filePickerIconWrap}>
        <ImagePlus size={24} />
      </div>
      <span className={styles.filePickerText}>{placeholder}</span>
      {hint && <span className={styles.filePickerHint}>{hint}</span>}
    </div>
  );
}

export const FilePicker = forwardRef<HTMLInputElement, FilePickerProps>(
  (
    {
      label,
      errorMessage,
      preview,
      loading = false,
      hint,
      onRemove,
      disabled,
      className,
      id,
      placeholder = 'Toque para selecionar uma imagem',
      alt,
      ...rest
    },
    ref
  ) => {
    const innerRef = useRef<HTMLInputElement>(null);
    const isBusy = loading || disabled;

    // Memoizado: sem isso, uma nova função seria criada a cada render,
    // fazendo o React desanexar/reanexar a ref no input a cada renderização.
    const mergedRef = useMemo(() => mergeRefs(innerRef, ref), [ref]);

    const handleClick = () => {
      if (isBusy) return;
      innerRef.current?.click();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (isBusy) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    };

    let content;
    if (loading) {
      content = <LoadingState />;
    } else if (preview) {
      content = <PreviewState preview={preview} alt={alt} disabled={disabled} onRemove={onRemove} />;
    } else {
      content = <EmptyState placeholder={placeholder} hint={hint} />;
    }

    return (
      <div className={styles.field}>
        {label && <span className={styles.label}>{label}</span>}
        <input
          ref={mergedRef}
          id={id}
          type="file"
          disabled={disabled}
          className={styles.fileInputHidden}
          {...rest}
        />
        <div
          role="button"
          tabIndex={isBusy ? -1 : 0}
          aria-disabled={isBusy}
          className={clsx(styles.filePickerBtn, className)}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
        >
          {content}
        </div>
        {errorMessage && <span className={styles.fieldError}>{errorMessage}</span>}
      </div>
    );
  }
);

FilePicker.displayName = 'FilePicker';
