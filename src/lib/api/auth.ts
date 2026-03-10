import { request } from '@/lib/api/request';

export const authApi = {
  admin: {
    me: () => request<unknown>('/api/auth/admin/me', { method: 'GET' }),
    login: (password: string) =>
      request<unknown>('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      }),
    logout: () =>
      request<unknown>('/api/auth/admin/logout', { method: 'POST' }),
  },
  team: {
    me: () =>
      request<{ teamId?: string }>('/api/auth/team/me', { method: 'GET' }),
    login: (teamId: string, password: string) =>
      request<unknown>('/api/auth/team/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, password }),
      }),
    logout: () => request<unknown>('/api/auth/team/logout', { method: 'POST' }),
  },
};
