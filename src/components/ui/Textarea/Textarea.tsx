'use client';

import { forwardRef, ReactNode, TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Textarea.module.scss';

type TextareaSize = 'sm' | 'md' | 'lg';

interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  icon?: ReactNode;
  size?: TextareaSize;
  error?: boolean;
  label?: string;
  errorMessage?: string;
  showCharCount?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      icon,
      size = 'md',
      error,
      label,
      errorMessage,
      className,
      disabled,
      id,
      showCharCount,
      maxLength,
      value,
      ...props
    },
    ref
  ) => {
    const hasError = error || Boolean(errorMessage);
    const charCount = showCharCount && maxLength !== undefined ? String(value ?? '').length : null;
    const showFooter = Boolean(errorMessage) || charCount !== null;

    return (
      <div className={styles.field}>
        {label && (
          <label className={styles.label} htmlFor={id}>
            {label}
          </label>
        )}
        <div
          className={clsx(
            styles.wrapper,
            hasError && styles.error,
            disabled && styles.disabled
          )}
        >
          {icon && <span className={styles.icon}>{icon}</span>}
          <textarea
            ref={ref}
            id={id}
            disabled={disabled}
            className={clsx(styles.textarea, styles[size], icon && styles.withIcon, className)}
            maxLength={maxLength}
            value={value}
            {...props}
          />
        </div>
        {showFooter && (
          <div className={styles.fieldFooter}>
            {errorMessage && <span className={styles.fieldError}>{errorMessage}</span>}
            {charCount !== null && (
              <span className={styles.charCount}>
                {charCount}/{maxLength}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
