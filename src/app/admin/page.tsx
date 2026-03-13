'use client';

import { useEffect, useState } from 'react';

import AdminAuthWrapper from '@/components/admin/AdminAuthWrapper';
import {
  AdminToastProvider,
  useAdminToast,
} from '@/components/admin/AdminToastProvider';
import PlayerManagement from '@/components/admin/PlayerManagement';
import SessionControls from '@/components/admin/SessionControls';
import TeamManagement from '@/components/admin/TeamManagement';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Tabs } from '@/components/ui/Tabs';
import { authApi } from '@/lib/api';
import { isEditingElement } from '@/lib/dom';
import { getSessionStatusTone } from '@/lib/draft';
import { useDraftStore } from '@/lib/draftStore';
import { useDraftSessionDerivedState } from '@/lib/hooks/useDraftSessionDerivedState';
import { useDraftSessionActions } from '@/lib/hooks/useDraftSessionActions';
import { useDraftStateSync } from '@/lib/hooks/useDraftStateSync';
import { cn } from '@/lib/ui';
import { resetAppSetting } from '@/lib/settings';
import styles from './page.module.css';

type AdminTab = 'session' | 'teams' | 'players';

export default function AdminDashboard() {
  return (
    <AdminAuthWrapper>
      <AdminToastProvider>
        <AdminDashboardContent />
      </AdminToastProvider>
    </AdminAuthWrapper>
  );
}

function AdminDashboardContent() {
  const [activeTab, setActiveTab] = useState<AdminTab>('session');
  const teams = useDraftStore((state) => state.teams);
  const draftSession = useDraftStore((state) => state.session);
  const players = useDraftStore((state) => state.players);
  const { pushSuccess, pushError, pushToastForSession } = useAdminToast();
  const {
    status: draftStatus,
    isDraftRunning,
    sortedTeams,
    currentTurnTeam,
    currentTurnIndex,
    canSkipCurrentTurn,
    canGoToPreviousTurn,
  } = useDraftSessionDerivedState();
  const fetchAll = useDraftStore((state) => state.fetchAll);

  useDraftStateSync({ fetchAll });

  useEffect(() => {
    void fetchAll({ silent: true });
  }, [activeTab, fetchAll]);

  const {
    handleStartNewDraft,
    handlePause,
    handleResume,
    handleEndDraft,
    handleGoToPreviousTurn,
    handleSkipCurrentTurn,
  } = useDraftSessionActions({
    teams,
    session: draftSession,
    sortedTeams,
    currentTurnIndex,
    canSkipCurrentTurn,
    canGoToPreviousTurn,
    fetchAll,
    onBeforeStartOrResume: () => {
      resetAppSetting('allowReorderDuringLiveDraft');
    },
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      if (isEditingElement(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();

      if ((draftStatus === 'idle' || draftStatus === 'ended') && key === 's') {
        event.preventDefault();
        pushToastForSession(
          handleStartNewDraft(),
          'start',
          ', triggered via keyboard shortcut.'
        );
        return;
      }

      if (draftStatus === 'active' && key === 'p') {
        event.preventDefault();
        pushToastForSession(
          handlePause(),
          'pause',
          ', triggered via keyboard shortcut.'
        );
        return;
      }

      if (draftStatus === 'paused' && key === 'r') {
        event.preventDefault();
        pushToastForSession(
          handleResume(),
          'resume',
          ', triggered via keyboard shortcut.'
        );
        return;
      }

      if (isDraftRunning && key === '[' && canGoToPreviousTurn) {
        event.preventDefault();
        pushToastForSession(
          handleGoToPreviousTurn(),
          'prev',
          ', triggered via keyboard shortcut.'
        );
        return;
      }

      if (isDraftRunning && key === ']' && canSkipCurrentTurn) {
        event.preventDefault();
        pushToastForSession(
          handleSkipCurrentTurn(),
          'skip',
          ', triggered via keyboard shortcut.'
        );
        return;
      }

      if (
        (draftStatus === 'active' || draftStatus === 'paused') &&
        key === 'e'
      ) {
        event.preventDefault();
        // shift+e for force end without confirmation, e for normal end with confirmation
        void handleEndDraft(event.shiftKey)
          .then((success) => {
            if (success) {
              pushSuccess('Draft ended, triggered via keyboard shortcut.');
            }
          })
          .catch(() => {
            pushError('Failed to end draft, triggered via keyboard shortcut.');
          });
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [
    draftStatus,
    isDraftRunning,
    canGoToPreviousTurn,
    canSkipCurrentTurn,
    handleStartNewDraft,
    handlePause,
    handleResume,
    handleGoToPreviousTurn,
    handleSkipCurrentTurn,
    handleEndDraft,
    pushSuccess,
    pushError,
    pushToastForSession,
  ]);

  return (
    <div className="h-dvh overflow-y-auto p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-375 flex-col gap-4">
        <PageHeader
          title="Admin Control Center"
          subtitle="Operate the draft in real time and manage teams, players, and session rules."
          actions={
            <>
              <a
                href="/team"
                target="_blank"
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-semibold',
                  styles.openTeamViewButton
                )}
              >
                Open Team View
              </a>
              <button
                onClick={async () => {
                  await authApi.admin.logout();
                  window.location.reload();
                }}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-semibold',
                  styles.logoutButton
                )}
              >
                Logout
              </button>
            </>
          }
        />

        <div className="grid gap-4 xl:grid-cols-12">
          <aside className="xl:col-span-3">
            <Card className="h-full">
              <CardHeader>
                <h2
                  className={cn(
                    'text-sm font-black uppercase tracking-wider',
                    styles.snapshotTitle
                  )}
                >
                  Live Snapshot
                </h2>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="space-y-1">
                  <p className="stat-label">Draft status</p>
                  <StatusBadge
                    label={draftStatus}
                    tone={getSessionStatusTone(draftStatus)}
                  />
                </div>

                <div>
                  <p className="stat-label">Current turn</p>
                  <p className="stat-value">{currentTurnTeam?.name ?? 'N/A'}</p>
                  <p className={cn('text-xs', styles.snapshotMeta)}>
                    {currentTurnTeam
                      ? `Serial #${currentTurnTeam.serialNumber}`
                      : 'No active turn'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Teams" value={teams.length.toString()} />
                  <StatCard label="Players" value={players.length.toString()} />
                </div>

                <div>
                  <p className="stat-label">Round</p>
                  <p className="stat-value">{draftSession?.draftRound ?? 0}</p>
                </div>
              </CardBody>
            </Card>
          </aside>

          <section className="xl:col-span-9">
            <div className="mb-4">
              <Tabs<AdminTab>
                value={activeTab}
                onChange={setActiveTab}
                options={[
                  { value: 'session', label: 'Session Controls' },
                  { value: 'teams', label: 'Teams' },
                  { value: 'players', label: 'Players' },
                ]}
              />
            </div>

            {activeTab === 'session' ? <SessionControls /> : null}
            {activeTab === 'teams' ? <TeamManagement /> : null}
            {activeTab === 'players' ? (
              <PlayerManagement teams={teams} />
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn('rounded-xl px-3 py-2', styles.statCard)}>
      <p className="stat-label">{label}</p>
      <p className={cn('text-xl font-black', styles.statValue)}>{value}</p>
    </div>
  );
}
