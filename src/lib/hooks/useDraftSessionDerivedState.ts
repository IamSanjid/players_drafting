import { DraftStoreState, useDraftStore } from '@/lib/draftStore';
import { getCurrentTurnTeam, isDraftRunningStatus } from '@/lib/draft';
import type { ApiDraftSession, ApiTeam } from '@/types/domain';

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

export const selectAllowedCategories: DraftStoreSelector<
  ApiDraftSession['allowedCategories']
> = (state) => {
  return state.session?.allowedCategories ?? 'Both';
};

export type DraftSessionDerivedState = {
  status: ApiDraftSession['draftStatus'] | 'idle';
  isDraftRunning: boolean;
  sortedTeams: ApiTeam[];
  currentTurnTeam: ApiTeam | null;
  activeSerial: number | null;
  currentTurnIndex: number;
  canSkipCurrentTurn: boolean;
  canGoToPreviousTurn: boolean;
  allowedCategories: ApiDraftSession['allowedCategories'];
};

let lastSessionRef: ApiDraftSession | null = null;
let lastTeamsRef: ApiTeam[] | null = null;
let lastSessionDerived: DraftSessionDerivedState | null = null;

export const selectDraftSessionDerived: DraftStoreSelector<
  DraftSessionDerivedState
> = (state) => {
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
  const allowedCategories = selectAllowedCategories(state);

  const nextDerived: DraftSessionDerivedState = {
    status,
    isDraftRunning,
    sortedTeams,
    currentTurnTeam,
    activeSerial,
    currentTurnIndex,
    canSkipCurrentTurn,
    canGoToPreviousTurn,
    allowedCategories,
  };

  lastSessionRef = state.session;
  lastTeamsRef = state.teams;
  lastSessionDerived = nextDerived;

  return nextDerived;
};

export function useDraftSessionDerivedState() {
  return useDraftStore(selectDraftSessionDerived);
}
