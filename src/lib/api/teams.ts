import { request } from '@/lib/api/request';
import type { ApiTeam } from '@/types/domain';

export type TeamCreatePayload = {
  name: string;
  password: string;
  serialNumber: number;
  budgetBDT: string;
  budgetUSD: string;
  logoUrl: string;
  bannerUrl: string;
};

export type TeamUpdatePayload = Partial<{
  name: string;
  budgetBDT: string | number;
  budgetUSD: string | number;
  password: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  serialNumber: number;
}>;

export const teamsApi = {
  list: () => request<ApiTeam[]>('/api/teams'),
  create: (payload: TeamCreatePayload) =>
    request<ApiTeam>('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  update: (teamId: string, payload: TeamUpdatePayload) =>
    request<ApiTeam>(`/api/teams/${teamId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  remove: (teamId: string) =>
    request<unknown>(`/api/teams/${teamId}`, { method: 'DELETE' }),
  reverse: () => request<unknown>('/api/teams/reverse', { method: 'POST' }),
};
