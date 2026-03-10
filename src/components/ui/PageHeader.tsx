import type { ReactNode } from 'react';
import Image from 'next/image';

import { cn } from '@/lib/ui';

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
    <header
      className={cn(
        'rounded-2xl border border-slate-200 bg-white/90 px-5 py-4 shadow-sm backdrop-blur',
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {logoSrc ? (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm md:h-14 md:w-14">
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
            <h1 className="truncate text-2xl font-black tracking-tight text-slate-900">
              {title}
            </h1>
            {subtitle ? (
              <p className="truncate mt-1 text-sm text-slate-600">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div className="flex w-full items-center justify-end gap-3 sm:w-auto sm:flex-wrap">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
