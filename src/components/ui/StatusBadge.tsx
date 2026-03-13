import { cn } from '@/lib/ui';
import styles from './StatusBadge.module.css';

type StatusTone = 'neutral' | 'active' | 'warning' | 'danger' | 'success';

type StatusBadgeProps = {
  label: string;
  tone?: StatusTone;
  pulse?: boolean;
  className?: string;
};

const toneClass: Record<StatusTone, string> = {
  neutral: styles.neutral,
  active: styles.active,
  warning: styles.warning,
  danger: styles.danger,
  success: styles.success,
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
        'inline-flex shrink-0 items-center whitespace-nowrap border px-3 py-1 text-[11px] font-bold uppercase tracking-wider',
        styles.badge,
        toneClass[tone],
        pulse && 'animate-pulse',
        className
      )}
    >
      {label}
    </span>
  );
}
