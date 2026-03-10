'use client';

import { useState } from 'react';
import Image from 'next/image';

import AnimatedLatestPick from '@/components/AnimatedLatestPick';
import PlayerSelectionGrid from '@/components/PlayerSelectionGrid';
import { TeamProfile } from '@/components/team/TeamDetailsPanel';
import { Card, CardBody } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { PoweredByFooter } from '@/components/ui/PoweredByFooter';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Tabs } from '@/components/ui/Tabs';
import { getTeamDraftStatus } from '@/lib/draft';
import { useDraftStore } from '@/lib/draftStore';
import { useSessionDerivedState } from '@/lib/hooks/useSessionDerivedState';
import { useDraftStateSync } from '@/lib/hooks/useDraftStateSync';
import type { ApiTeam } from '@/types/domain';

const dashboardTitle =
  process.env.NEXT_PUBLIC_TITLE ?? "BPL Female Players' Draft 2026";

type PublicTab = 'Session' | 'Players' | 'Teams';

export default function PublicDashboard() {
  const teams = useDraftStore((state) => state.teams);
  const players = useDraftStore((state) => state.players);
  const draftSession = useDraftStore((state) => state.session);
  const { isDraftRunning, sortedTeams, currentTurnTeam, activeSerial } =
    useSessionDerivedState();
  const loading = useDraftStore((state) => state.loading);
  const fetchAll = useDraftStore((state) => state.fetchAll);

  const [activeTab, setActiveTab] = useState<PublicTab>('Session');
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [expandedProfileTeamId, setExpandedProfileTeamId] = useState<
    string | null
  >(null);

  useDraftStateSync({ fetchAll, events: ['state_changed', 'pick_made'] });

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-16 w-16 animate-pulse rounded-full bg-sky-500" />
      </div>
    );
  }

  return (
    <div className="relative flex h-dvh w-full flex-col gap-4 overflow-y-auto p-4 md:p-6">
      <AnimatedLatestPick />

      <PageHeader
        title={dashboardTitle}
        subtitle="Live Draft Status"
        logoSrc="/bpl_logo.png"
        logoAlt="BPL logo"
        actions={
          draftSession?.isActive ? (
            <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2">
              <div className="text-right">
                <p className="stat-label">Current turn</p>
                <p className="text-lg font-black text-sky-900">
                  {currentTurnTeam?.name ?? 'N/A'}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-black text-sky-700 ring-2 ring-sky-300">
                {currentTurnTeam?.serialNumber ?? '#'}
              </div>
            </div>
          ) : (
            <StatusBadge label="Draft Paused" tone="danger" pulse />
          )
        }
      />

      <div>
        <Tabs<PublicTab>
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: 'Session', label: 'Draft Session' },
            { value: 'Players', label: 'Players' },
            { value: 'Teams', label: 'Teams Info' },
          ]}
        />
      </div>

      <main className="min-h-0 flex-1">
        {activeTab === 'Session' && (
          <section className="mx-auto flex h-full min-h-0 max-w-5xl flex-col space-y-3">
            {draftSession?.draftStatus === 'idle' ||
            draftSession?.draftStatus === 'ended' ||
            !draftSession?.draftStatus ? (
              <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-200 text-2xl">
                  ⏳
                </div>
                <p className="text-base font-bold text-slate-700">
                  {draftSession?.draftStatus === 'ended'
                    ? 'This draft session has ended.'
                    : 'Waiting for the draft session to start.'}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {draftSession?.draftStatus === 'ended'
                    ? 'The admin may start a new round any time.'
                    : 'The admin will kick things off shortly.'}
                </p>
              </div>
            ) : (
              <div className="custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto pr-2 pb-6">
                {sortedTeams.map((team) => (
                  <SessionTeamRow
                    key={team.id}
                    team={team}
                    isDraftRunning={isDraftRunning}
                    activeSerial={activeSerial}
                    currentTurnTeamId={draftSession.currentTurnTeamId}
                    expanded={expandedTeamId === team.id}
                    onToggle={() =>
                      setExpandedTeamId(
                        expandedTeamId === team.id ? null : team.id
                      )
                    }
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'Players' && (
          <Card className="mx-auto h-full max-w-7xl overflow-hidden">
            <PlayerSelectionGrid
              players={players}
              session={draftSession}
              currentTeamId={null}
              teams={teams}
              readOnly
              showAllCategories
            />
          </Card>
        )}

        {activeTab === 'Teams' && (
          <section className="mx-auto flex h-full min-h-0 max-w-6xl flex-col space-y-3">
            <div className="custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto pr-2 pb-6">
              {sortedTeams.map((team) => (
                <Card key={team.id} className="overflow-hidden">
                  <button
                    onClick={() =>
                      setExpandedProfileTeamId(
                        expandedProfileTeamId === team.id ? null : team.id
                      )
                    }
                    className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <TeamLogo team={team} />
                      <p className="text-lg font-black text-slate-900">
                        {team.name}
                      </p>
                    </div>
                    <StatusBadge
                      label={`#${team.serialNumber}`}
                      tone="active"
                      className="font-black"
                    />
                  </button>
                  {expandedProfileTeamId === team.id ? (
                    <CardBody className="border-t border-slate-100 bg-slate-50">
                      <TeamProfile team={team} />
                    </CardBody>
                  ) : null}
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>

      <PoweredByFooter />
    </div>
  );
}

function TeamLogo({ team }: { team: ApiTeam }) {
  return (
    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
      {team.logoUrl ? (
        <Image
          src={team.logoUrl}
          alt={`${team.name} logo`}
          width={40}
          height={40}
          className="h-full w-full object-contain"
        />
      ) : (
        <span className="text-[10px] font-bold text-slate-400">LOGO</span>
      )}
    </div>
  );
}

function SessionTeamRow({
  team,
  isDraftRunning,
  activeSerial,
  currentTurnTeamId,
  expanded,
  onToggle,
}: {
  team: ApiTeam;
  isDraftRunning: boolean;
  activeSerial: number | null;
  currentTurnTeamId: string | null;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { label, tone } = getTeamDraftStatus({
    team,
    currentTurnTeamId,
    isDraftRunning,
    activeSerial,
  });

  return (
    <Card className={team.id === currentTurnTeamId ? 'border-sky-300' : ''}>
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          <TeamLogo team={team} />
          <div>
            <p className="text-sm font-black text-slate-900">{team.name}</p>
            <p className="text-xs font-bold uppercase tracking-wider text-sky-700">
              Pick #{team.serialNumber}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <StatusBadge label={label} tone={tone} pulse={tone === 'active'} />
          <span className="text-lg text-slate-400">{expanded ? '▴' : '▾'}</span>
        </div>
      </button>

      {expanded ? (
        <CardBody className="border-t border-slate-100 bg-slate-50">
          <TeamProfile team={team} />
        </CardBody>
      ) : null}
    </Card>
  );
}
