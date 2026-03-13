import { useState } from 'react';
import Image from 'next/image';

import { StatusBadge } from '@/components/ui/StatusBadge';
import { Tabs } from '@/components/ui/Tabs';
import {
  calculateCategorySpent,
  getCurrentTurnTeam,
  getSortedTeams,
  getTeamDraftStatus,
} from '@/lib/draft';
import { cn, formatMoney } from '@/lib/ui';
import type { DraftStatus, ApiPick, ApiPlayer, ApiTeam } from '@/types/domain';

import styles from './DraftOrderList.module.css';

type DraftOrderListProps = {
  teams: ApiTeam[];
  activeTurnTeamId?: string | null;
  draftStatus: DraftStatus;
  isDraftRunning: boolean;
};

export default function DraftOrderList({
  teams,
  activeTurnTeamId,
  draftStatus,
  isDraftRunning,
}: DraftOrderListProps) {
  const sortedTeams = getSortedTeams(teams);

  const activeTeam = getCurrentTurnTeam(teams, activeTurnTeamId);
  const activeSerial = activeTeam ? activeTeam.serialNumber : null;

  return (
    <div className={cn(styles.shell, 'flex h-full flex-col overflow-hidden')}>
      <div className="mb-2 mt-1 flex items-center justify-between px-1">
        <h2 className={cn(styles.heading, 'text-sm font-black uppercase tracking-wider')}>
          Draft Order
        </h2>
      </div>

      {!isDraftRunning ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
          <div className={cn(styles.waitingIcon, 'flex h-14 w-14 items-center justify-center rounded-full text-2xl')}>
            ⏳
          </div>
          <p className={cn(styles.waitingTitle, 'text-sm font-bold')}>
            {draftStatus === 'ended'
              ? 'Draft has ended.'
              : 'Waiting for the draft session to start...'}
          </p>
          <p className={cn(styles.waitingSubtitle, 'text-xs')}>
            {draftStatus === 'ended'
              ? 'The admin may start a new draft.'
              : 'The admin will start the session shortly.'}
          </p>
        </div>
      ) : (
        <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto px-2 pb-4">
          {sortedTeams.map((team) => (
            <TeamDraftCard
              key={team.id}
              team={team}
              isActive={activeTurnTeamId === team.id}
              activeSerial={activeSerial}
              isDraftRunning={isDraftRunning}
              activeTurnTeamId={activeTurnTeamId ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TeamDraftCard({
  team,
  isActive,
  activeSerial,
  isDraftRunning,
  activeTurnTeamId,
}: {
  team: ApiTeam;
  isActive: boolean;
  activeSerial: number | null;
  isDraftRunning: boolean;
  activeTurnTeamId: string | null;
}) {
  const [tab, setTab] = useState<'Local' | 'Oversea'>('Local');

  const spentBDT = calculateCategorySpent(team, 'Local');
  const spentUSD = calculateCategorySpent(team, 'Oversea');

  const localPicks =
    team.picks?.filter(
      (pick) => !pick.player?.isPreBought && pick.player?.category === 'Local'
    ) || [];
  const lastLocalTarget =
    localPicks.length > 0
      ? ((localPicks[localPicks.length - 1] as ApiPick).player as
          | ApiPlayer
          | undefined)
      : undefined;

  const overseaPicks =
    team.picks?.filter(
      (pick) => !pick.player?.isPreBought && pick.player?.category === 'Oversea'
    ) || [];
  const lastOverseaTarget =
    overseaPicks.length > 0
      ? ((overseaPicks[overseaPicks.length - 1] as ApiPick).player as
          | ApiPlayer
          | undefined)
      : undefined;

  const { label: statusLabel, tone: statusTone } = getTeamDraftStatus({
    team,
    currentTurnTeamId: activeTurnTeamId,
    isDraftRunning,
    activeSerial,
  });

  return (
    <article
      className={cn(
        styles.card,
        isActive && styles.cardActive,
        'overflow-hidden rounded-xl transition-all'
      )}
    >
      <header
        className={cn(
          styles.header,
          isActive && styles.headerActive,
          'flex items-center justify-between px-3 py-2'
        )}
      >
        <div className="flex items-center gap-2">
          <div
            className={cn(
              styles.logoFrame,
              isActive && styles.logoFrameActive,
              'flex h-8 w-8 items-center justify-center overflow-hidden rounded'
            )}
          >
            {team.logoUrl ? (
              <Image
                src={team.logoUrl}
                alt={`${team.name} logo`}
                width={32}
                height={32}
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="text-[9px] font-bold opacity-60">LOGO</span>
            )}
          </div>
          <div>
            <p
              className={cn(
                styles.pickMeta,
                isActive && styles.pickMetaActive,
                'text-[10px] font-bold uppercase tracking-wider'
              )}
            >
              Pick #{team.serialNumber}
            </p>
            <h3
              className={cn(
                styles.teamTitle,
                isActive && styles.teamTitleActive,
                'truncate text-sm font-black'
              )}
            >
              {team.name}
            </h3>
          </div>
        </div>
        <StatusBadge label={statusLabel} tone={statusTone} pulse={isActive} />
      </header>

      <div className="space-y-3 p-3">
        <Tabs<'Local' | 'Oversea'>
          value={tab}
          onChange={setTab}
          className="w-full"
          options={[
            { value: 'Local', label: 'Local' },
            { value: 'Oversea', label: 'Oversea' },
          ]}
        />

        {tab === 'Local' ? (
          <div className={cn(styles.detailPanel, 'space-y-2 rounded-lg p-2')}>
            <Row label="Spent" value={`৳${formatMoney(spentBDT)}`} danger />
            <Row
              label="Avail"
              value={`৳${formatMoney(team.budgetBDT || 0)}`}
              success
            />
            <Row label="Last Pick" value={lastLocalTarget?.name ?? 'None'} />
          </div>
        ) : (
          <div className={cn(styles.detailPanel, 'space-y-2 rounded-lg p-2')}>
            <Row label="Spent" value={`$${formatMoney(spentUSD)}`} danger />
            <Row
              label="Avail"
              value={`$${formatMoney(team.budgetUSD || 0)}`}
              success
            />
            <Row label="Last Pick" value={lastOverseaTarget?.name ?? 'None'} />
          </div>
        )}
      </div>
    </article>
  );
}

function Row({
  label,
  value,
  success,
  danger,
}: {
  label: string;
  value: string;
  success?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className={cn(styles.rowLabel, 'font-semibold')}>{label}</span>
      <span
        className={cn(
          styles.rowValue,
          success && styles.rowValueSuccess,
          danger && styles.rowValueDanger,
          'font-mono font-bold'
        )}
      >
        {value}
      </span>
    </div>
  );
}
