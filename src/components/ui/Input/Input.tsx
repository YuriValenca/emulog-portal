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
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ icon, rightIcon, size = 'md', error, label, errorMessage, className, disabled, id, ...props }, ref) => {
    const hasError = error || Boolean(errorMessage);

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
          <input ref={ref} id={id} disabled={disabled} className={styles.input} {...props} />
          {rightIcon && <span className={styles.iconRight}>{rightIcon}</span>}
        </div>
        {errorMessage && <span className={styles.fieldError}>{errorMessage}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
