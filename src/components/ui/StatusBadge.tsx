import { cn } from '@/lib/ui';

type StatusTone = 'neutral' | 'active' | 'warning' | 'danger' | 'success';

type StatusBadgeProps = {
  label: string;
  tone?: StatusTone;
  pulse?: boolean;
  className?: string;
};

const toneClass: Record<StatusTone, string> = {
  neutral: 'border-slate-200 bg-slate-100 text-slate-700',
  active: 'border-sky-200 bg-sky-100 text-sky-700',
  warning: 'border-amber-200 bg-amber-100 text-amber-700',
  danger: 'border-rose-200 bg-rose-100 text-rose-700',
  success: 'border-emerald-200 bg-emerald-100 text-emerald-700',
};

export function StatusBadge({
  label,
  tone = 'neutral',
  pulse = false,
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider',
        toneClass[tone],
        pulse && 'animate-pulse',
        className
      )}
    >
      {label}
    </span>
  );
}
