import { cn } from '@/lib/ui';
import styles from './ToastStack.module.css';

export type ToastTone = 'success' | 'danger' | 'warning' | 'info';

export type ToastItem = {
  id: number;
  tone: ToastTone;
  message: string;
};

export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) {
    return null;
  }

  const toneClass: Record<ToastTone, string> = {
    success: styles.success,
    danger: styles.danger,
    warning: styles.warning,
    info: styles.info,
  };

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[120] flex w-[min(92vw,360px)] flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto border px-3 py-2 text-sm font-semibold',
            styles.toast,
            toneClass[toast.tone]
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <p>{toast.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className={cn('text-xs font-bold', styles.dismissButton)}
              aria-label="Dismiss notification"
            >
              x
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
