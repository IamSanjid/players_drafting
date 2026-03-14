'use client';

import { create } from 'zustand';

import { draftApi, playersApi, teamsApi } from '@/lib/api';
import type { ApiDraftSession, ApiPlayer, ApiTeam } from '@/types/domain';

export type FetchAllOptions = {
  silent?: boolean;
  force?: boolean;
};

export type FetchAllFn = (options?: FetchAllOptions) => Promise<void>;

let inFlightFetch: Promise<void> | null = null;
let lastSuccessfulFetchAt = 0;
const SILENT_REFRESH_MIN_INTERVAL_MS = 250;

export type DraftStoreState = {
  teams: ApiTeam[];
  players: ApiPlayer[];
  session: ApiDraftSession | null;
  loading: boolean;
  error: string | null;
  fetchAll: (options?: FetchAllOptions) => Promise<void>;
};

export const useDraftStore = create<DraftStoreState>((set) => ({
  teams: [],
  players: [],
  session: null,
  loading: true,
  error: null,
  fetchAll: async (options) => {
    const { silent = false, force = false } = options ?? {};

    if (!force && inFlightFetch) {
      return inFlightFetch;
    }

    if (
      !force &&
      silent &&
      Date.now() - lastSuccessfulFetchAt < SILENT_REFRESH_MIN_INTERVAL_MS
    ) {
      return;
    }

    if (!silent) {
      set({ loading: true, error: null });
    }

    const fetchPromise = (async () => {
      try {
        const [teamsRes, playersRes, sessionRes] = await Promise.all([
          teamsApi.list(),
          playersApi.list(),
          draftApi.session.get(),
        ]);

        if (!teamsRes.ok || !playersRes.ok || !sessionRes.ok) {
          throw new Error('Failed to fetch draft state');
        }

        const teams = teamsRes.data as ApiTeam[];
        const players = playersRes.data as ApiPlayer[];
        const session = sessionRes.data as ApiDraftSession;

        lastSuccessfulFetchAt = Date.now();
        set((state) => ({
          teams,
          players,
          session: session,
          loading: silent ? state.loading : false,
          error: null,
        }));
      } catch (error) {
        set((state) => ({
          loading: silent ? state.loading : false,
          error: error instanceof Error ? error.message : 'Failed to load data',
        }));
      } finally {
        inFlightFetch = null;
      }
    })();

    inFlightFetch = fetchPromise;
    return fetchPromise;
  },
}));
