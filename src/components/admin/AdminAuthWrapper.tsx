'use client';

import { useEffect, useState } from 'react';

import { Card, CardBody } from '@/components/ui/Card';
import { authApi } from '@/lib/api';

export default function AdminAuthWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const result = await authApi.admin.me();
        setIsAuthenticated(result.ok);
      } finally {
        setCheckingAuth(false);
      }
    };

    void checkAuth();
  }, []);

  const handleLogin = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    const res = await authApi.admin.login(password);

    if (res.ok) {
      setIsAuthenticated(true);
      setError('');
      return;
    }

    setError('Incorrect Admin Password.');
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardBody className="p-8 text-center">
            <p className="text-sm font-semibold text-slate-600">
              Checking admin session...
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardBody className="p-8">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-600 to-rose-800 text-white shadow-lg shadow-rose-300/50">
              <svg
                className="h-8 w-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
          </div>

          <h2 className="mb-1 text-center text-2xl font-black text-slate-900">
            Admin Portal
          </h2>
          <p className="mb-6 text-center text-sm font-medium text-slate-500">
            Restricted Access
          </p>

          {error ? (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-center text-sm font-medium text-rose-700">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="adminPassword"
                className="mb-1 block text-sm font-semibold text-slate-700"
              >
                Admin Password
              </label>
              <input
                id="adminPassword"
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-center font-mono tracking-widest"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-rose-700 p-3 font-bold text-white transition hover:bg-rose-800 active:scale-[0.99]"
            >
              Authenticate
            </button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
