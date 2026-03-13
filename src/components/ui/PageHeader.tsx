import type { ReactNode } from 'react';
import Image from 'next/image';

import { cn } from '@/lib/ui';
import styles from './PageHeader.module.css';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  logoSrc?: string;
  logoAlt?: string;
  className?: string;
};

export function PageHeader({
  title,
  subtitle,
  actions,
  logoSrc,
  logoAlt,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn('theme-panel px-5 py-4', styles.header, className)}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {logoSrc ? (
            <div
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl p-1.5 md:h-14 md:w-14',
                styles.logoFrame
              )}
            >
              <Image
                src={logoSrc}
                alt={logoAlt ?? 'Brand logo'}
                width={56}
                height={56}
                className="h-full w-full object-contain"
              />
            </div>
          ) : null}

          <div className="min-w-0">
            <h1 className={cn('truncate text-2xl', styles.title)}>{title}</h1>
            {subtitle ? (
              <p className={cn('truncate mt-1 text-sm', styles.subtitle)}>
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div
            className={cn(
              'flex w-full items-center justify-end gap-3 sm:w-auto sm:flex-wrap',
              styles.actions
            )}
          >
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
