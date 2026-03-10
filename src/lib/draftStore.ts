'use client';

import { create } from 'zustand';

import { draftApi, playersApi, teamsApi } from '@/lib/api';
import { getCurrentTurnTeam, isDraftRunningStatus } from '@/lib/draft';
import type { ApiDraftSession, ApiPlayer, ApiTeam } from '@/types/domain';

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

export type DraftStoreSelector<T> = (state: DraftStoreState) => T;

const sortedTeamsCache = new WeakMap<ApiTeam[], ApiTeam[]>();

function getSortedTeamsCached(teams: ApiTeam[]): ApiTeam[] {
  const cached = sortedTeamsCache.get(teams);
  if (cached) {
    return cached;
  }

  const sorted = [...teams].sort((a, b) => a.serialNumber - b.serialNumber);
  sortedTeamsCache.set(teams, sorted);
  return sorted;
}

export const selectDraftStatus: DraftStoreSelector<
  ApiDraftSession['draftStatus'] | 'idle'
> = (state) => state.session?.draftStatus ?? 'idle';

export const selectIsDraftRunning: DraftStoreSelector<boolean> = (state) =>
  isDraftRunningStatus(selectDraftStatus(state));

export const selectSortedTeams: DraftStoreSelector<ApiTeam[]> = (state) =>
  getSortedTeamsCached(state.teams);

export const selectCurrentTurnTeam: DraftStoreSelector<ApiTeam | null> = (
  state
) => getCurrentTurnTeam(state.teams, state.session?.currentTurnTeamId);

export const selectActiveSerial: DraftStoreSelector<number | null> = (state) =>
  selectCurrentTurnTeam(state)?.serialNumber ?? null;

export const selectCurrentTurnIndex: DraftStoreSelector<number> = (state) => {
  const currentTurnTeam = selectCurrentTurnTeam(state);
  if (!currentTurnTeam) {
    return -1;
  }

  return selectSortedTeams(state).findIndex(
    (team) => team.id === currentTurnTeam.id
  );
};

export const selectCanSkipCurrentTurn: DraftStoreSelector<boolean> = (
  state
) => {
  const sortedTeams = selectSortedTeams(state);
  return (
    selectIsDraftRunning(state) &&
    sortedTeams.length > 1 &&
    selectCurrentTurnTeam(state) !== null
  );
};

export const selectCanGoToPreviousTurn: DraftStoreSelector<boolean> = (
  state
) => {
  const sortedTeams = selectSortedTeams(state);
  return (
    selectIsDraftRunning(state) &&
    sortedTeams.length > 1 &&
    selectCurrentTurnIndex(state) > 0
  );
};

export type SessionDerivedState = {
  status: ApiDraftSession['draftStatus'] | 'idle';
  isDraftRunning: boolean;
  sortedTeams: ApiTeam[];
  currentTurnTeam: ApiTeam | null;
  activeSerial: number | null;
  currentTurnIndex: number;
  canSkipCurrentTurn: boolean;
  canGoToPreviousTurn: boolean;
};

let lastSessionRef: ApiDraftSession | null = null;
let lastTeamsRef: ApiTeam[] | null = null;
let lastSessionDerived: SessionDerivedState | null = null;

export const selectSessionDerived: DraftStoreSelector<SessionDerivedState> = (
  state
) => {
  if (
    lastSessionDerived &&
    lastSessionRef === state.session &&
    lastTeamsRef === state.teams
  ) {
    return lastSessionDerived;
  }

  const status = selectDraftStatus(state);
  const isDraftRunning = isDraftRunningStatus(status);
  const sortedTeams = selectSortedTeams(state);
  const currentTurnTeam = getCurrentTurnTeam(
    state.teams,
    state.session?.currentTurnTeamId
  );
  const activeSerial = currentTurnTeam?.serialNumber ?? null;
  const currentTurnIndex = currentTurnTeam
    ? sortedTeams.findIndex((team) => team.id === currentTurnTeam.id)
    : -1;
  const canSkipCurrentTurn =
    isDraftRunning && sortedTeams.length > 1 && currentTurnTeam !== null;
  const canGoToPreviousTurn =
    isDraftRunning && sortedTeams.length > 1 && currentTurnIndex > 0;

  const nextDerived: SessionDerivedState = {
    status,
    isDraftRunning,
    sortedTeams,
    currentTurnTeam,
    activeSerial,
    currentTurnIndex,
    canSkipCurrentTurn,
    canGoToPreviousTurn,
  };

  lastSessionRef = state.session;
  lastTeamsRef = state.teams;
  lastSessionDerived = nextDerived;

  return nextDerived;
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
