import { request } from '@/lib/api/request';
import type { ApiDraftSession, PickMadePayload } from '@/types/domain';

export const draftApi = {
  session: {
    get: () => request<ApiDraftSession>('/api/draft/session'),
    patch: (payload: unknown) =>
      request<ApiDraftSession>('/api/draft/session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
  },
  pick: (teamId: string | null | undefined, playerId: string) =>
    request<PickMadePayload>('/api/draft/pick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId, playerId }),
    }),
};
