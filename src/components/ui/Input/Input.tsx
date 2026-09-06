'use client';

import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Input.module.scss';

type InputSize = 'sm' | 'md' | 'lg';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  icon?: ReactNode;
  rightIcon?: ReactNode;
  size?: InputSize;
  error?: boolean;
  label?: string;
  errorMessage?: string;
  showCharCount?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      icon,
      rightIcon,
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
            styles[size],
            hasError && styles.error,
            disabled && styles.disabled,
            className
          )}
        >
          {icon && <span className={styles.icon}>{icon}</span>}
          <input
            ref={ref}
            id={id}
            disabled={disabled}
            className={styles.input}
            maxLength={maxLength}
            value={value}
            {...props}
          />
          {rightIcon && <span className={styles.iconRight}>{rightIcon}</span>}
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

Input.displayName = 'Input';
