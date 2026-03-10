'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

import { useAdminToast } from '@/components/admin/AdminToastProvider';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { getTeamDraftStatus } from '@/lib/draft';
import { useDraftStore } from '@/lib/draftStore';
import {
  useSessionActions,
  type SessionUpdatePayload,
} from '@/lib/hooks/useSessionActions';
import { useSessionDerivedState } from '@/lib/hooks/useSessionDerivedState';
import { useTeamOrderActions } from '@/lib/hooks/useTeamOrderActions';
import { useAppSetting } from '@/lib/settings';

export default function SessionControls() {
  const draftSession = useDraftStore((state) => state.session);
  const teams = useDraftStore((state) => state.teams);
  const {
    status,
    isDraftRunning,
    sortedTeams,
    activeSerial,
    currentTurnTeam,
    currentTurnIndex,
    canSkipCurrentTurn,
    canGoToPreviousTurn,
  } = useSessionDerivedState();
  const loading = useDraftStore((state) => state.loading);
  const fetchAll = useDraftStore((state) => state.fetchAll);
  const [showEndWarning, setShowEndWarning] = useState(false);
  const { pushSuccess, pushError } = useAdminToast();
  const { value: allowReorderDuringLive, setValue: setAllowReorderDuringLive } =
    useAppSetting('allowReorderDuringLiveDraft');
  const isReorderLocked = isDraftRunning && !allowReorderDuringLive;
  const canReverseDraftOrder = sortedTeams.length > 0 && !isReorderLocked;

  useEffect(() => {
    if (!draftSession) {
      void fetchAll();
    }
  }, [fetchAll, draftSession]);

  const {
    teamsWithNoPicks,
    updateSession,
    handleStartNewDraft,
    handlePause,
    handleResume,
    handleEndDraft,
    handleGoToPreviousTurn,
    handleSkipCurrentTurn,
  } = useSessionActions({
    teams,
    session: draftSession,
    sortedTeams,
    currentTurnIndex,
    canSkipCurrentTurn,
    canGoToPreviousTurn,
    fetchAll,
    onBeforeStartOrResume: () => {
      setAllowReorderDuringLive(false);
    },
    onRequireForceEnd: async () => {
      setShowEndWarning(true);
      return false;
    },
  });

  const {
    updateTeamSerial,
    moveTeamByStep,
    moveTeamToEdge,
    reverseDraftOrder,
  } = useTeamOrderActions({
    sortedTeams,
    isReorderLocked,
    fetchAll,
  });

  const handleReverseDraftOrder = async () => {
    if (sortedTeams.length === 0) {
      return;
    }

    if (isReorderLocked) {
      pushError(
        'Reverse order is locked during live draft. Enable "Allow Reorder During Live Draft" first.'
      );
      return;
    }

    if (!confirm('Reverse the draft order for all teams?')) {
      return;
    }

    const ok = await reverseDraftOrder();
    if (!ok) {
      pushError('Failed to reverse draft order.');
      return;
    }

    pushSuccess('Draft order reversed.');
  };

  if (!draftSession) {
    if (loading) {
      return <div className="h-20 animate-pulse rounded-xl bg-slate-200" />;
    }

    return (
      <div className="h-20 rounded-xl border border-slate-200 bg-slate-50" />
    );
  }

  const pushToastForSession = (
    promise: Promise<boolean | void>,
    context: 'start' | 'pause' | 'resume' | 'end' | 'skip' | 'prev'
  ) => {
    const successActionText =
      {
        start: 'Draft started',
        pause: 'Draft paused',
        resume: 'Draft resumed',
        end: 'Draft ended',
        skip: 'Turn skipped',
        prev: 'Moved to previous turn',
      }[context] || 'Action completed';
    const errorActionText =
      {
        start: 'Failed to start draft',
        pause: 'Failed to pause draft',
        resume: 'Failed to resume draft',
        end: 'Failed to end draft',
        skip: 'Failed to skip turn',
        prev: 'Failed to move to previous turn',
      }[context] || 'Action failed';
    promise
      .then((success) => {
        if (
          typeof success !== 'boolean' ||
          (typeof success === 'boolean' && success)
        ) {
          pushSuccess(successActionText);
        } else {
          pushError(errorActionText);
        }
      })
      .catch(() => {
        pushError(errorActionText);
      });
  };

  const quickActions = [
    {
      id: 'start',
      visible: status === 'idle' || status === 'ended',
      label: 'Start New Draft',
      shortcut: 'S',
      className:
        'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
      onClick: () => {
        pushToastForSession(handleStartNewDraft(), 'start');
      },
    },
    {
      id: 'pause',
      visible: status === 'active',
      label: 'Pause Draft',
      shortcut: 'P',
      className:
        'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100',
      onClick: () => {
        pushToastForSession(handlePause(), 'pause');
      },
    },
    {
      id: 'resume',
      visible: status === 'paused',
      label: 'Resume Draft',
      shortcut: 'R',
      className: 'border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100',
      onClick: () => {
        pushToastForSession(handleResume(), 'resume');
      },
    },
    {
      id: 'prev',
      visible: isDraftRunning && canGoToPreviousTurn,
      label: 'Previous Turn',
      shortcut: '[',
      className:
        'border-violet-300 bg-violet-50 text-violet-800 hover:bg-violet-100',
      onClick: () => {
        pushToastForSession(handleGoToPreviousTurn(), 'prev');
      },
    },
    {
      id: 'skip',
      visible: isDraftRunning && canSkipCurrentTurn,
      label: 'Skip Turn',
      shortcut: ']',
      className:
        'border-indigo-300 bg-indigo-50 text-indigo-800 hover:bg-indigo-100',
      onClick: () => {
        pushToastForSession(handleSkipCurrentTurn(), 'skip');
      },
    },
    {
      id: 'end',
      visible: status === 'active' || status === 'paused',
      label: 'End Draft',
      shortcut: 'E',
      className: 'border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100',
      onClick: () => {
        handleEndDraft(false).then((success) => {
          if (success) {
            pushSuccess('Draft ended');
          }
        });
      },
    },
  ].filter((action) => action.visible);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              Draft Session Controls
            </h2>
            <p className="text-sm text-slate-600">
              Manage live flow, category locks, and draft order.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardBody className="space-y-5">
        <div className="rounded-lg border border-slate-200 bg-white p-2">
          <p className="px-1 pb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
            Quick Actions
          </p>
          <div className="custom-scrollbar flex gap-2 overflow-x-auto pb-1">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={action.onClick}
                className={`inline-flex shrink-0 items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-black transition ${action.className}`}
              >
                <span>{action.label}</span>
                <kbd className="rounded border border-current/30 bg-white/70 px-1.5 py-0.5 text-[10px] font-black">
                  {action.shortcut}
                </kbd>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
          Shortcuts: <ShortcutKey label="S" hint="start" />{' '}
          <ShortcutKey label="P" hint="pause" />{' '}
          <ShortcutKey label="R" hint="resume" />{' '}
          <ShortcutKey label="[" hint="previous" />{' '}
          <ShortcutKey label="]" hint="skip" />{' '}
          <ShortcutKey label="E" hint="end" />
        </div>

        {showEndWarning && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
            <p className="font-bold text-amber-900">
              Warning: Teams still without picks
            </p>
            <p className="mt-1 text-sm text-amber-800">
              {teamsWithNoPicks.length} team(s) have not drafted in this round:{' '}
              <strong>
                {teamsWithNoPicks.map((team) => team.name).join(', ')}
              </strong>
              .
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() =>
                  pushToastForSession(
                    handleEndDraft(true).finally(() =>
                      setShowEndWarning(false)
                    ),
                    'end'
                  )
                }
                className="rounded-lg bg-rose-700 px-3 py-1.5 text-sm font-bold text-white hover:bg-rose-800"
              >
                Force End
              </button>
              <button
                onClick={() => setShowEndWarning(false)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ControlField
            label="Allowed Categories"
            hint="Limits which player pools are visible to teams."
          >
            <select
              value={draftSession.allowedCategories}
              onChange={(e) => {
                const newVal = e.target.value;
                const updates: SessionUpdatePayload = {
                  allowedCategories:
                    newVal as SessionUpdatePayload['allowedCategories'],
                };

                if (newVal === 'Local') updates.activeCategory = 'Local';
                if (newVal === 'Oversea') updates.activeCategory = 'Oversea';

                updateSession(updates).then(() => {
                  pushSuccess('Session updated successfully.');
                });
              }}
              className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm"
            >
              <option value="Both">Both (Local + Oversea)</option>
              <option value="Local">Local only</option>
              <option value="Oversea">Oversea only</option>
            </select>
          </ControlField>

          <ControlField
            label="Active Category"
            hint="Current enforced category during live draft."
          >
            <select
              value={draftSession.activeCategory}
              onChange={(e) =>
                updateSession({
                  activeCategory: e.target.value as 'Oversea' | 'Local',
                }).then(() => {
                  pushSuccess('Session updated successfully.');
                })
              }
              disabled={draftSession.allowedCategories !== 'Both'}
              className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm disabled:opacity-50"
            >
              <option value="Local">Local Players</option>
              <option value="Oversea">Oversea Players</option>
            </select>
          </ControlField>
        </div>

        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">
              Team Draft Order
            </h3>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                onClick={() => {
                  void handleReverseDraftOrder();
                }}
                disabled={!canReverseDraftOrder}
                title={
                  isReorderLocked
                    ? 'Enable "Allow Reorder During Live Draft" to reverse order.'
                    : undefined
                }
                className="rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
              >
                Reverse Order
              </button>
              {isDraftRunning ? (
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  <input
                    type="checkbox"
                    checked={allowReorderDuringLive}
                    onChange={(e) =>
                      setAllowReorderDuringLive(e.target.checked)
                    }
                    className="h-3.5 w-3.5"
                  />
                  Allow Reorder During Live Draft
                </label>
              ) : null}
              {currentTurnTeam ? (
                <p className="text-xs text-slate-600">
                  Current:{' '}
                  <strong>
                    #{currentTurnTeam.serialNumber} {currentTurnTeam.name}
                  </strong>
                </p>
              ) : null}
            </div>
          </div>

          {isReorderLocked ? (
            <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-800">
              Reordering is locked while draft is live. Enable the toggle to
              allow changes.
            </p>
          ) : null}

          <div className="custom-scrollbar overflow-x-auto pb-2">
            <div className="flex min-w-max gap-3">
              {sortedTeams.map((team) => {
                const { label: statusText, tone: statusColor } =
                  getTeamDraftStatus({
                    team,
                    currentTurnTeamId: draftSession.currentTurnTeamId,
                    isDraftRunning,
                    activeSerial,
                  });
                const teamIndex = sortedTeams.findIndex(
                  (item) => item.id === team.id
                );
                const canMoveUp = teamIndex > 0;
                const canMoveDown =
                  teamIndex >= 0 && teamIndex < sortedTeams.length - 1;
                const canMoveTop = canMoveUp;
                const canMoveBottom = canMoveDown;

                return (
                  <div
                    key={team.id}
                    className={`w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md ${isReorderLocked ? 'opacity-80' : ''}`}
                    draggable
                    onDragStart={(e) => {
                      if (isReorderLocked) {
                        e.preventDefault();
                        return;
                      }
                      e.dataTransfer.setData('text/plain', team.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(e) => {
                      if (isReorderLocked) {
                        return;
                      }
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={async (e) => {
                      if (isReorderLocked) {
                        return;
                      }
                      e.preventDefault();
                      const draggedTeamId =
                        e.dataTransfer.getData('text/plain');
                      if (!draggedTeamId || draggedTeamId === team.id) {
                        return;
                      }
                      await updateTeamSerial(draggedTeamId, team.serialNumber);
                    }}
                  >
                    <div className="mb-3 space-y-2.5">
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/80 p-1.5">
                        <select
                          value={team.serialNumber}
                          disabled={isReorderLocked}
                          onChange={async (e) => {
                            await updateTeamSerial(
                              team.id,
                              Number(e.target.value)
                            );
                          }}
                          className="min-w-[62px] shrink-0 rounded border border-sky-200 bg-sky-50 px-2 py-1 text-sm font-black text-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {Array.from(
                            { length: sortedTeams.length },
                            (_, index) => index + 1
                          ).map((num) => (
                            <option key={num} value={num}>
                              {num}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => {
                            void moveTeamToEdge(team.id, 'top');
                          }}
                          disabled={!canMoveTop || isReorderLocked}
                          className="rounded border border-slate-300 bg-white px-1.5 py-1 text-[10px] font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-35"
                          aria-label={`Move ${team.name} to top`}
                          title="Move to top"
                        >
                          ⇤
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            void moveTeamByStep(team.id, -1);
                          }}
                          disabled={!canMoveUp || isReorderLocked}
                          className="rounded border border-slate-300 bg-white px-1.5 py-1 text-[10px] font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-35"
                          aria-label={`Move ${team.name} up`}
                          title="Move up"
                        >
                          ↑
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            void moveTeamByStep(team.id, 1);
                          }}
                          disabled={!canMoveDown || isReorderLocked}
                          className="rounded border border-slate-300 bg-white px-1.5 py-1 text-[10px] font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-35"
                          aria-label={`Move ${team.name} down`}
                          title="Move down"
                        >
                          ↓
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            void moveTeamToEdge(team.id, 'bottom');
                          }}
                          disabled={!canMoveBottom || isReorderLocked}
                          className="rounded border border-slate-300 bg-white px-1.5 py-1 text-[10px] font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-35"
                          aria-label={`Move ${team.name} to bottom`}
                          title="Move to bottom"
                        >
                          ⇥
                        </button>
                      </div>

                      {isDraftRunning ? (
                        <div className="flex justify-end">
                          <StatusBadge
                            label={statusText}
                            tone={statusColor}
                            className="max-w-full"
                          />
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-100">
                        {team.logoUrl ? (
                          <Image
                            src={team.logoUrl}
                            alt={`${team.name} logo`}
                            width={40}
                            height={40}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400">
                            LOGO
                          </span>
                        )}
                      </div>
                      <p className="truncate text-sm font-bold text-slate-900">
                        {team.name}
                      </p>
                    </div>
                  </div>
                );
              })}

              {sortedTeams.length === 0 ? (
                <div className="flex min-h-24 w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/70 text-sm text-slate-500">
                  No teams added yet.
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </CardBody>
    </Card>
  );
}

function ControlField({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-black uppercase tracking-wider text-slate-600">
        {label}
      </p>
      <div className="mt-2">{children}</div>
      <p className="mt-2 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function ShortcutKey({ label, hint }: { label: string; hint: string }) {
  return (
    <span className="mr-2 inline-flex items-center gap-1">
      <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-black text-slate-700">
        {label}
      </kbd>
      <span className="text-[10px] uppercase tracking-wide text-slate-500">
        {hint}
      </span>
    </span>
  );
}
