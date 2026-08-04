import { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Button.module.scss';

type ButtonVariant = 'accent' | 'ghost' | 'brand' | 'ok' | 'cancel';
type IconPosition = 'left' | 'right';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: ReactNode;
  iconPosition?: IconPosition;
  loading?: boolean;
}

export function Button({
  variant = 'ghost',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled,
  children,
  className,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      className={clsx(styles.button, styles[variant], className)}
      disabled={isDisabled}
      aria-busy={loading}
      {...rest}
    >
      {loading && <span className={clsx(styles.icon, styles.spinner)} />}
      {!loading && icon && iconPosition === 'left' && <span className={styles.icon}>{icon}</span>}
      {children}
      {!loading && icon && iconPosition === 'right' && <span className={styles.icon}>{icon}</span>}
    </button>
  );
}
