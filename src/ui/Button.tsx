import type { ComponentProps } from 'react';
import styles from './Button.module.css';

export function Button({ className, ...rest }: ComponentProps<'button'>) {
  return <button className={[styles.button, className].filter(Boolean).join(' ')} {...rest} />;
}
