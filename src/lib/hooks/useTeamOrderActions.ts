import { useCallback } from 'react';

import { teamsApi } from '@/lib/api';
import { getSocket } from '@/lib/socketClient';
import type { ApiTeam } from '@/types/domain';

type FetchAllFn = (options?: {
  silent?: boolean;
  force?: boolean;
}) => Promise<void>;

export function useTeamOrderActions({
  sortedTeams,
  isReorderLocked,
  fetchAll,
}: {
  sortedTeams: ApiTeam[];
  isReorderLocked: boolean;
  fetchAll: FetchAllFn;
}) {
  const socket = getSocket();

  const updateTeamSerial = useCallback(
    async (teamId: string, newSerialNumber: number) => {
      await teamsApi.update(teamId, { serialNumber: newSerialNumber });
      await fetchAll({ silent: true, force: true });
      socket.emit('state_changed');
    },
    [fetchAll, socket]
  );

  const moveTeamByStep = useCallback(
    async (teamId: string, step: -1 | 1) => {
      if (isReorderLocked) {
        return;
      }

      const sourceIndex = sortedTeams.findIndex((team) => team.id === teamId);
      if (sourceIndex < 0) {
        return;
      }

      const targetIndex = sourceIndex + step;
      if (targetIndex < 0 || targetIndex >= sortedTeams.length) {
        return;
      }

      const targetTeam = sortedTeams[targetIndex];
      if (!targetTeam) {
        return;
      }

      await updateTeamSerial(teamId, targetTeam.serialNumber);
    },
    [isReorderLocked, sortedTeams, updateTeamSerial]
  );

  const moveTeamToEdge = useCallback(
    async (teamId: string, edge: 'top' | 'bottom') => {
      if (isReorderLocked) {
        return;
      }

      const sourceIndex = sortedTeams.findIndex((team) => team.id === teamId);
      if (sourceIndex < 0) {
        return;
      }

      const targetIndex = edge === 'top' ? 0 : sortedTeams.length - 1;
      if (sourceIndex === targetIndex || targetIndex < 0) {
        return;
      }

      const targetTeam = sortedTeams[targetIndex];
      if (!targetTeam) {
        return;
      }

      await updateTeamSerial(teamId, targetTeam.serialNumber);
    },
    [isReorderLocked, sortedTeams, updateTeamSerial]
  );

  const reverseDraftOrder = useCallback(async () => {
    const res = await teamsApi.reverse();
    if (!res.ok) {
      return false;
    }

    await fetchAll({ silent: true, force: true });
    socket.emit('state_changed');
    return true;
  }, [fetchAll, socket]);

  return {
    updateTeamSerial,
    moveTeamByStep,
    moveTeamToEdge,
    reverseDraftOrder,
  };
}
