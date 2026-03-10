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

  const value = {
    pushToast,
    pushSuccess,
    pushError,
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
