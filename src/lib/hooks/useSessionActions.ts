import { useCallback } from 'react';

import { draftApi } from '@/lib/api';
import { getSocket } from '@/lib/socketClient';
import type { ApiDraftSession, ApiTeam } from '@/types/domain';

export type SessionUpdatePayload = Partial<{
  isActive: boolean;
  draftStatus: 'idle' | 'active' | 'paused' | 'ended';
  allowedCategories: 'Both' | 'Oversea' | 'Local';
  activeCategory: 'Oversea' | 'Local';
  currentTurnTeamId: string | null;
  draftOrder: string;
  draftRound: number;
  draftStartedAt: string | null;
}>;

type FetchAllFn = (options?: {
  silent?: boolean;
  force?: boolean;
}) => Promise<void>;

export function useSessionActions({
  teams,
  session,
  sortedTeams,
  currentTurnIndex,
  canSkipCurrentTurn,
  canGoToPreviousTurn,
  fetchAll,
  onBeforeStartOrResume,
  onRequireForceEnd,
}: {
  teams: ApiTeam[];
  session: ApiDraftSession | null;
  sortedTeams: ApiTeam[];
  currentTurnIndex: number;
  canSkipCurrentTurn: boolean;
  canGoToPreviousTurn: boolean;
  fetchAll: FetchAllFn;
  onBeforeStartOrResume?: () => void;
  onRequireForceEnd?: (
    teamsWithNoPicks: ApiTeam[]
  ) => boolean | Promise<boolean>;
}) {
  const socket = getSocket();

  const teamsWithNoPicks = teams.filter(
    (team) =>
      (team.picks?.length || 0) === 0 ||
      team.picks.every((pick) => {
        if (!session?.draftStartedAt) {
          return false;
        }
        return pick.createdAt < session.draftStartedAt;
      })
  );

  const updateSession = useCallback(
    async (updates: SessionUpdatePayload) => {
      await draftApi.session.patch(updates);
      await fetchAll({ silent: true, force: true });
      socket.emit('state_changed');
    },
    [fetchAll, socket]
  );

  const handleStartNewDraft = useCallback(async () => {
    if (sortedTeams.length === 0) {
      alert('Add teams first before starting a draft.');
      return false;
    }

    onBeforeStartOrResume?.();

    const draftOrderIds = sortedTeams.map((team) => team.id);
    const nextRound = (session?.draftRound || 0) + 1;

    await updateSession({
      isActive: true,
      draftStatus: 'active',
      currentTurnTeamId: draftOrderIds[0],
      draftOrder: JSON.stringify(draftOrderIds),
      draftRound: nextRound,
      draftStartedAt: new Date().toISOString(),
    });

    return true;
  }, [sortedTeams, session?.draftRound, onBeforeStartOrResume, updateSession]);

  const handlePause = useCallback(async () => {
    await updateSession({ isActive: false, draftStatus: 'paused' });
  }, [updateSession]);

  const handleResume = useCallback(async () => {
    onBeforeStartOrResume?.();
    await updateSession({ isActive: true, draftStatus: 'active' });
  }, [onBeforeStartOrResume, updateSession]);

  const handleEndDraft = useCallback(
    async (force = false) => {
      if (!force && teamsWithNoPicks.length > 0) {
        const shouldForceEnd = onRequireForceEnd
          ? await onRequireForceEnd(teamsWithNoPicks)
          : confirm(
              `${teamsWithNoPicks.length} team(s) have no picks this round. Force end the draft?`
            );

        if (!shouldForceEnd) {
          return false;
        }
      }

      await updateSession({
        isActive: false,
        draftStatus: 'ended',
        currentTurnTeamId: null,
      });
      return true;
    },
    [teamsWithNoPicks, onRequireForceEnd, updateSession]
  );

  const handleGoToPreviousTurn = useCallback(async () => {
    if (!canGoToPreviousTurn || currentTurnIndex <= 0) {
      return false;
    }

    const previousTeam = sortedTeams[currentTurnIndex - 1];
    if (!previousTeam) {
      return false;
    }

    await updateSession({ currentTurnTeamId: previousTeam.id });
    return true;
  }, [canGoToPreviousTurn, currentTurnIndex, sortedTeams, updateSession]);

  const handleSkipCurrentTurn = useCallback(async () => {
    if (!canSkipCurrentTurn || currentTurnIndex < 0) {
      return false;
    }

    if (currentTurnIndex === sortedTeams.length - 1) {
      const shouldForceEnd = confirm(
        "This is the last team's turn. Press OK to force-end the session, or Cancel to start over from the first team."
      );

      if (shouldForceEnd) {
        await handleEndDraft(true);
        return true;
      }

      await updateSession({
        currentTurnTeamId: sortedTeams[0].id,
        draftRound: (session?.draftRound || 1) + 1,
      });
      return true;
    }

    const nextTeam = sortedTeams[currentTurnIndex + 1];
    if (!nextTeam) {
      return false;
    }

    await updateSession({ currentTurnTeamId: nextTeam.id });
    return true;
  }, [
    canSkipCurrentTurn,
    currentTurnIndex,
    sortedTeams,
    handleEndDraft,
    updateSession,
    session?.draftRound,
  ]);

  return {
    teamsWithNoPicks,
    updateSession,
    handleStartNewDraft,
    handlePause,
    handleResume,
    handleEndDraft,
    handleGoToPreviousTurn,
    handleSkipCurrentTurn,
  };
}
