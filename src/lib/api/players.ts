import { request } from '@/lib/api/request';
import type { ApiPlayer, ApiTeam, PlayerCategory } from '@/types/domain';

export type PlayerUpsertPayload = {
  name: string;
  category: PlayerCategory;
  subCategory: string;
  position: string;
  priceBDT?: string | number | null;
  priceUSD?: string | number | null;
  country?: string | null;
  availability?: string | null;
  imageUrl?: string | null;
  isPreBought?: boolean;
  teamId?: string | null;
};

export type PlayerPatchPayload = Partial<PlayerUpsertPayload>;

export type BulkPlayerImportPayload = Array<{
  name: string;
  category: string;
  subCategory: string;
  position: string;
  priceBDT?: string | number | null;
  priceUSD?: string | number | null;
  country?: string | null;
  availability?: string | null;
  imageUrl?: string | null;
}>;

export const playersApi = {
  list: () => request<ApiPlayer[]>('/api/players'),
  create: (payload: PlayerUpsertPayload) =>
    request<ApiPlayer>('/api/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  update: (playerId: string, payload: PlayerPatchPayload) =>
    request<ApiPlayer>(`/api/players/${playerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  remove: (playerId: string) =>
    request<unknown>(`/api/players/${playerId}`, { method: 'DELETE' }),
  removeByCategory: (category: string) =>
    request<unknown>(
      `/api/players/bulk?category=${encodeURIComponent(category)}`,
      {
        method: 'DELETE',
      }
    ),
  bulkImport: (payload: BulkPlayerImportPayload) =>
    request<unknown>('/api/players/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  assign: (playerId: string, teamId: string) =>
    request<{ player: ApiPlayer; team: ApiTeam }>(
      `/api/players/${playerId}/assign`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId }),
      }
    ),
};
