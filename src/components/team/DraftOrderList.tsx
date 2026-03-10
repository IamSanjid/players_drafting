import { useState } from 'react';
import Image from 'next/image';

import { StatusBadge } from '@/components/ui/StatusBadge';
import { Tabs } from '@/components/ui/Tabs';
import {
  calculateCategorySpent,
  getCurrentTurnTeam,
  getSortedTeams,
  getTeamDraftStatus,
  isDraftRunningStatus,
} from '@/lib/draft';
import { formatMoney } from '@/lib/ui';
import type {
  ApiDraftSession,
  ApiPick,
  ApiPlayer,
  ApiTeam,
} from '@/types/domain';

type DraftOrderListProps = {
  teams: ApiTeam[];
  activeTurnTeamId?: string | null;
  session?: ApiDraftSession | null;
};

export default function DraftOrderList({
  teams,
  activeTurnTeamId,
  session,
}: DraftOrderListProps) {
  const sortedTeams = getSortedTeams(teams);

  const activeTeam = getCurrentTurnTeam(teams, activeTurnTeamId);
  const activeSerial = activeTeam ? activeTeam.serialNumber : null;

  const draftStatus = session?.draftStatus || 'idle';
  const isDraftRunning = isDraftRunningStatus(draftStatus);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-50">
      <div className="mb-2 mt-1 flex items-center justify-between px-1">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-600">
          Draft Order
        </h2>
      </div>

      {!isDraftRunning ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-200 text-2xl">
            ⏳
          </div>
          <p className="text-sm font-bold text-slate-600">
            {draftStatus === 'ended'
              ? 'Draft has ended.'
              : 'Waiting for the draft session to start...'}
          </p>
          <p className="text-xs text-slate-500">
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
      className={`overflow-hidden rounded-xl border bg-white shadow-sm transition-all ${
        isActive ? 'border-sky-400 ring-2 ring-sky-200' : 'border-slate-200'
      }`}
    >
      <header
        className={`flex items-center justify-between border-b px-3 py-2 ${
          isActive
            ? 'border-sky-500/30 bg-sky-600 text-white'
            : 'border-slate-200 bg-slate-100'
        }`}
      >
        <div className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center overflow-hidden rounded border ${
              isActive
                ? 'border-white/30 bg-white/15'
                : 'border-slate-200 bg-white'
            }`}
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
              className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-sky-100' : 'text-slate-500'}`}
            >
              Pick #{team.serialNumber}
            </p>
            <h3 className="truncate text-sm font-black">{team.name}</h3>
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
          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
            <Row label="Spent" value={`৳${formatMoney(spentBDT)}`} danger />
            <Row
              label="Avail"
              value={`৳${formatMoney(team.budgetBDT || 0)}`}
              success
            />
            <Row label="Last Pick" value={lastLocalTarget?.name ?? 'None'} />
          </div>
        ) : (
          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
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
      <span className="font-semibold text-slate-500">{label}</span>
      <span
        className={`font-mono font-bold ${
          success
            ? 'text-emerald-700'
            : danger
              ? 'text-rose-700'
              : 'text-slate-800'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
