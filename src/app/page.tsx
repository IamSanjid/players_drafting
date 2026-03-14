'use client';

import { useState } from 'react';
import Image from 'next/image';

import AnimatedLatestPick from '@/components/AnimatedLatestPick';
import PlayerSelectionGrid from '@/components/PlayerSelectionGrid';
import { TeamProfile } from '@/components/team/TeamDetailsPanel';
import { Card, CardBody } from '@/components/ui/Card';
import { BrandFooter } from '@/components/ui/BrandFooter';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Tabs } from '@/components/ui/Tabs';
import { getTeamDraftStatus } from '@/lib/draft';
import { useDraftStore } from '@/lib/draftStore';
import { useDraftSessionDerivedState } from '@/lib/hooks/useDraftSessionDerivedState';
import { useDraftStateSync } from '@/lib/hooks/useDraftStateSync';
import { cn } from '@/lib/ui';
import type { ApiTeam } from '@/types/domain';
import styles from './page.module.css';

const dashboardTitle =
  process.env.NEXT_PUBLIC_TITLE || "BPL Female Players' Draft 2026";

type PublicTab = 'Session' | 'Players' | 'Teams';

export default function PublicDashboard() {
  const teams = useDraftStore((state) => state.teams);
  const players = useDraftStore((state) => state.players);
  const {
    status: draftStatus,
    isDraftRunning,
    sortedTeams,
    currentTurnTeam,
    activeSerial,
  } = useDraftSessionDerivedState();
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
        <div
          className={cn(
            'h-16 w-16 animate-pulse rounded-full',
            styles.loadingPulse
          )}
        />
      </div>
    );
  }

  return (
    <div className="relative flex h-dvh w-full flex-col gap-4 overflow-y-auto p-4 md:p-6">
      <AnimatedLatestPick />

      <PageHeader
        title={dashboardTitle}
        subtitle="Live Draft Status"
        logoSrc="/logo.png"
        logoAlt="Logo"
        actions={
          draftStatus === 'active' ? (
            <div
              className={cn(
                'flex items-center gap-3 rounded-xl px-4 py-2',
                styles.currentTurnPanel
              )}
            >
              <div className="text-right">
                <p className="stat-label">Current turn</p>
                <p
                  className={cn('text-lg font-black', styles.currentTurnValue)}
                >
                  {currentTurnTeam?.name ?? 'N/A'}
                </p>
              </div>
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full text-sm font-black',
                  styles.currentTurnSerial
                )}
              >
                {currentTurnTeam?.serialNumber ?? '#'}
              </div>
            </div>
          ) : (
            <StatusBadge label="Draft Paused" tone="danger" pulse />
          )
        }
      />

      <div className="flex justify-center overflow-x-auto px-1">
        <Tabs<PublicTab>
          value={activeTab}
          onChange={setActiveTab}
          className="shrink-0"
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
            {draftStatus === 'idle' || draftStatus === 'ended' ? (
              <div className="theme-empty-state flex h-full min-h-70 flex-col items-center justify-center rounded-2xl p-8 text-center">
                <div
                  className={cn(
                    'flex h-14 w-14 items-center justify-center rounded-full text-2xl',
                    styles.emptyStateIcon
                  )}
                >
                  ⏳
                </div>
                <p
                  className={cn('text-base font-bold', styles.emptyStateTitle)}
                >
                  {draftStatus === 'ended'
                    ? 'This draft session has ended.'
                    : 'Waiting for the draft session to start.'}
                </p>
                <p className={cn('mt-1 text-sm', styles.emptyStateText)}>
                  {draftStatus === 'ended'
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
                    currentTurnTeamId={currentTurnTeam?.id || null}
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
                    className={cn(
                      'flex w-full items-center justify-between gap-4 px-4 py-3 text-left',
                      styles.teamRowButton
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <TeamLogo team={team} />
                      <p className={cn('text-lg font-black', styles.teamName)}>
                        {team.name}
                      </p>
                    </div>
                    <StatusBadge
                      label={
                        expandedProfileTeamId === team.id ? 'Open' : 'Expand'
                      }
                      tone={
                        expandedProfileTeamId === team.id ? 'active' : 'neutral'
                      }
                    />
                  </button>
                  {expandedProfileTeamId === team.id ? (
                    <CardBody className={styles.expandedBody}>
                      <TeamProfile team={team} />
                    </CardBody>
                  ) : null}
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>

      <BrandFooter />
    </div>
  );
}

function TeamLogo({ team }: { team: ApiTeam }) {
  return (
    <div
      className={cn(
        'flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg',
        styles.teamLogoFrame
      )}
    >
      {team.logoUrl ? (
        <Image
          src={team.logoUrl}
          alt={`${team.name} logo`}
          width={40}
          height={40}
          className="h-full w-full object-contain"
        />
      ) : (
        <span
          className={cn('text-[10px] font-bold', styles.teamLogoPlaceholder)}
        >
          LOGO
        </span>
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
    <Card
      className={cn(
        'overflow-hidden',
        team.id === currentTurnTeamId && styles.activeTeamCard
      )}
    >
      <button
        onClick={onToggle}
        className={cn(
          'flex w-full items-center justify-between gap-4 px-4 py-3 text-left',
          styles.teamRowButton
        )}
      >
        <div className="flex items-center gap-3">
          <TeamLogo team={team} />
          <div>
            <p className={cn('text-sm font-black', styles.teamName)}>
              {team.name}
            </p>
            <p
              className={cn(
                'text-xs font-bold uppercase tracking-wider',
                styles.teamMeta
              )}
            >
              Pick #{team.serialNumber}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <StatusBadge label={label} tone={tone} pulse={tone === 'active'} />
          <span className={cn('text-lg', styles.chevron)}>
            {expanded ? '▴' : '▾'}
          </span>
        </div>
      </button>

      {expanded ? (
        <CardBody className={styles.expandedBody}>
          <TeamProfile team={team} />
        </CardBody>
      ) : null}
    </Card>
  );
}
