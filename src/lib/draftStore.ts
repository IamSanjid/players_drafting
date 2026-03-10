"use client";

import { create } from "zustand";

import type { ApiDraftSession, ApiPlayer, ApiTeam } from "@/types/domain";

type FetchAllOptions = {
  silent?: boolean;
  force?: boolean;
};

let inFlightFetch: Promise<void> | null = null;
let lastSuccessfulFetchAt = 0;
const SILENT_REFRESH_MIN_INTERVAL_MS = 250;

type DraftStoreState = {
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

    if (!force && silent && Date.now() - lastSuccessfulFetchAt < SILENT_REFRESH_MIN_INTERVAL_MS) {
      return;
    }

    if (!silent) {
      set({ loading: true, error: null });
    }

    const fetchPromise = (async () => {
      try {
        const [teamsRes, playersRes, sessionRes] = await Promise.all([
          fetch("/api/teams"),
          fetch("/api/players"),
          fetch("/api/draft/session"),
        ]);

        if (!teamsRes.ok || !playersRes.ok || !sessionRes.ok) {
          throw new Error("Failed to fetch draft state");
        }

        const [teams, players, session] = await Promise.all([
          teamsRes.json() as Promise<ApiTeam[]>,
          playersRes.json() as Promise<ApiPlayer[]>,
          sessionRes.json() as Promise<ApiDraftSession>,
        ]);

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
          error: error instanceof Error ? error.message : "Failed to load data",
        }));
      } finally {
        inFlightFetch = null;
      }
    })();

    inFlightFetch = fetchPromise;
    return fetchPromise;
  },
}));
