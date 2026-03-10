import type { ApiTeam, DraftStatus, PlayerCategory } from '@/types/domain';

import { toBigIntSafe } from '@/lib/numbers';

export type SessionStatusTone = 'neutral' | 'success' | 'warning' | 'danger';
export type TeamDraftStatusTone = 'neutral' | 'active' | 'success';

export { toBigIntSafe };

export function isDraftRunningStatus(
  status: DraftStatus | null | undefined
): boolean {
  return status === 'active' || status === 'paused';
}

export function getSessionStatusTone(
  status: DraftStatus | null | undefined
): SessionStatusTone {
  if (status === 'active') {
    return 'success';
  }

  if (status === 'paused') {
    return 'warning';
  }

  if (status === 'ended') {
    return 'danger';
  }

  return 'neutral';
}

export function getCurrentTurnTeam(
  teams: ApiTeam[],
  currentTurnTeamId: string | null | undefined
): ApiTeam | null {
  if (!currentTurnTeamId) {
    return null;
  }

  return teams.find((team) => team.id === currentTurnTeamId) ?? null;
}

export function getSortedTeams(teams: ApiTeam[]): ApiTeam[] {
  return [...teams].sort((a, b) => a.serialNumber - b.serialNumber);
}

export function calculateCategorySpent(
  team: ApiTeam,
  category: PlayerCategory
): bigint {
  return (team.players ?? [])
    .filter((player) => player.category === category && !player.isPreBought)
    .reduce((sum, player) => {
      const amount = category === 'Local' ? player.priceBDT : player.priceUSD;
      return sum + toBigIntSafe(amount);
    }, BigInt(0));
}

export function getTeamDraftStatus({
  team,
  currentTurnTeamId,
  isDraftRunning,
  activeSerial,
}: {
  team: Pick<ApiTeam, 'id' | 'serialNumber'>;
  currentTurnTeamId: string | null;
  isDraftRunning: boolean;
  activeSerial: number | null;
}): { label: string; tone: TeamDraftStatusTone } {
  if (team.id === currentTurnTeamId) {
    return { label: 'Drafting', tone: 'active' };
  }

  if (
    isDraftRunning &&
    activeSerial !== null &&
    team.serialNumber < activeSerial
  ) {
    return { label: 'Already Drafted', tone: 'success' };
  }

  return { label: 'Pending', tone: 'neutral' };
}
