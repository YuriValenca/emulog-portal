import styles from './Spinner.module.scss';

interface SpinnerProps {
  size?: 'xsm' | 'sm' | 'md' | 'lg';
}

export function Spinner({ size = 'md' }: SpinnerProps) {
  return <span className={`${styles.spinner} ${styles[size]}`} />;
}
