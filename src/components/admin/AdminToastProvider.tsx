'use client';

import { createContext, useContext, useState } from 'react';

import {
  ToastStack,
  type ToastItem,
  type ToastTone,
} from '@/components/ui/ToastStack';

type AdminToastContextValue = {
  pushToast: (tone: ToastTone, message: string) => void;
  pushSuccess: (message: string) => void;
  pushError: (message: string) => void;
  pushToastForSession: (
    promise: Promise<boolean | void>,
    context: 'start' | 'pause' | 'resume' | 'end' | 'skip' | 'prev',
    extraMessage?: string
  ) => void;
};

const AdminToastContext = createContext<AdminToastContextValue | null>(null);
const MAX_TOASTS = 4;
const DEFAULT_TOAST_DURATION_MS = 3200;

export function AdminToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = (id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  const pushToast = (tone: ToastTone, message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => {
      const next = [...current, { id, tone, message }];
      if (next.length <= MAX_TOASTS) {
        return next;
      }

      return next.slice(next.length - MAX_TOASTS);
    });

    window.setTimeout(() => {
      dismissToast(id);
    }, DEFAULT_TOAST_DURATION_MS);
  };

  const pushSuccess = (message: string) => {
    pushToast('success', message);
  };

  const pushError = (message: string) => {
    pushToast('danger', message);
  };

  const pushToastForSession = (
    promise: Promise<boolean | void>,
    context: 'start' | 'pause' | 'resume' | 'end' | 'skip' | 'prev',
    extraMessage = ''
  ) => {
    const successActionText =
      {
        start: 'Draft started',
        pause: 'Draft paused',
        resume: 'Draft resumed',
        end: 'Draft ended',
        skip: 'Turn skipped',
        prev: 'Moved to previous turn',
      }[context] || 'Action completed';
    const errorActionText =
      {
        start: 'Failed to start draft',
        pause: 'Failed to pause draft',
        resume: 'Failed to resume draft',
        end: 'Failed to end draft',
        skip: 'Failed to skip turn',
        prev: 'Failed to move to previous turn',
      }[context] || 'Action failed';
    promise
      .then((success) => {
        if (
          typeof success !== 'boolean' ||
          (typeof success === 'boolean' && success)
        ) {
          pushSuccess(successActionText + extraMessage);
        } else {
          pushError(errorActionText + extraMessage);
        }
      })
      .catch(() => {
        pushError(errorActionText);
      });
  };

  const value = {
    pushToast,
    pushSuccess,
    pushError,
    pushToastForSession,
  };

  return (
    <AdminToastContext.Provider value={value}>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      {children}
    </AdminToastContext.Provider>
  );
}

export function useAdminToast() {
  const context = useContext(AdminToastContext);

  if (!context) {
    throw new Error('useAdminToast must be used within AdminToastProvider.');
  }

  return context;
}
