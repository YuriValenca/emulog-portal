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
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ icon, rightIcon, size = 'md', error, className, disabled, ...props }, ref) => {
    return (
      <div
        className={clsx(
          styles.wrapper,
          styles[size],
          error && styles.error,
          disabled && styles.disabled,
          className
        )}
      >
        {icon && <span className={styles.icon}>{icon}</span>}
        <input ref={ref} disabled={disabled} className={styles.input} {...props} />
        {rightIcon && <span className={styles.iconRight}>{rightIcon}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
