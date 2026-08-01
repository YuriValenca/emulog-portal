import { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Button.module.scss';

type ButtonVariant = 'accent' | 'ghost' | 'brand' | 'ok' | 'cancel';
type IconPosition = 'left' | 'right';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: ReactNode;
  iconPosition?: IconPosition;
}

export function Button({
  variant = 'ghost',
  icon,
  iconPosition = 'left',
  children,
  className,
  ...rest
}: ButtonProps) {
  return (
    <button className={clsx(styles.button, styles[variant], className)} {...rest}>
      {icon && iconPosition === 'left' && <span className={styles.icon}>{icon}</span>}
      {children}
      {icon && iconPosition === 'right' && <span className={styles.icon}>{icon}</span>}
    </button>
  );
}
