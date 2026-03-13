import { cn } from '@/lib/ui';
import styles from './Tabs.module.css';

type TabsProps<T extends string> = {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

export function Tabs<T extends string>({
  options,
  value,
  onChange,
  className,
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        'theme-card inline-flex border p-1',
        styles.root,
        className
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-2xl px-4 py-2 text-sm font-semibold transition focus-visible:outline-none',
            styles.tab,
            value === option.value
              ? styles.tabActive
              : styles.tabIdle
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
