import type { ReactNode } from 'react';
import { cn } from '@/lib/ui';
import styles from './Card.module.css';

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className }: CardProps) {
  return (
    <section className={cn('theme-card', styles.card, className)}>
      {children}
    </section>
  );
}

export function CardHeader({ children, className }: CardProps) {
  return (
    <header className={cn('px-5 py-4', styles.header, className)}>
      {children}
    </header>
  );
}

export function CardBody({ children, className }: CardProps) {
  return (
    <div className={cn('px-5 py-4', styles.body, className)}>{children}</div>
  );
}
