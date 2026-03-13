'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

import { useAdminToast } from '@/components/admin/AdminToastProvider';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { getTeamDraftStatus } from '@/lib/draft';
import { useDraftStore } from '@/lib/draftStore';
import {
  useDraftSessionActions,
  type SessionUpdatePayload,
} from '@/lib/hooks/useDraftSessionActions';
import { useDraftSessionDerivedState } from '@/lib/hooks/useDraftSessionDerivedState';
import { useTeamOrderActions } from '@/lib/hooks/useTeamOrderActions';
import { useAppSetting } from '@/lib/settings';
import { cn } from '@/lib/ui';

import styles from './SessionControls.module.css';

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
  } = useDraftSessionDerivedState();
  const loading = useDraftStore((state) => state.loading);
  const fetchAll = useDraftStore((state) => state.fetchAll);
  const [showEndWarning, setShowEndWarning] = useState(false);
  const { pushSuccess, pushError, pushToastForSession } = useAdminToast();
  const { value: allowReorderDuringLive, setValue: setAllowReorderDuringLive } =
    useAppSetting('allowReorderDuringLiveDraft');
  const isReorderLocked = isDraftRunning && !allowReorderDuringLive;
  const canReverseDraftOrder = sortedTeams.length > 0 && !isReorderLocked;
  const quickActionToneClass = {
    start: styles.quickActionStart,
    pause: styles.quickActionPause,
    resume: styles.quickActionResume,
    prev: styles.quickActionPrev,
    skip: styles.quickActionSkip,
    end: styles.quickActionEnd,
  };

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
  } = useDraftSessionActions({
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
      return (
        <div
          className={cn('h-20 animate-pulse rounded-xl', styles.loadingShell)}
        />
      );
    }

    return <div className={cn('h-20 rounded-xl', styles.emptyShell)} />;
  }

  const quickActions = [
    {
      id: 'start',
      visible: status === 'idle' || status === 'ended',
      label: 'Start New Draft',
      shortcut: 'S',
      toneClassName: quickActionToneClass.start,
      onClick: () => {
        pushToastForSession(handleStartNewDraft(), 'start');
      },
    },
    {
      id: 'pause',
      visible: status === 'active',
      label: 'Pause Draft',
      shortcut: 'P',
      toneClassName: quickActionToneClass.pause,
      onClick: () => {
        pushToastForSession(handlePause(), 'pause');
      },
    },
    {
      id: 'resume',
      visible: status === 'paused',
      label: 'Resume Draft',
      shortcut: 'R',
      toneClassName: quickActionToneClass.resume,
      onClick: () => {
        pushToastForSession(handleResume(), 'resume');
      },
    },
    {
      id: 'prev',
      visible: isDraftRunning && canGoToPreviousTurn,
      label: 'Previous Turn',
      shortcut: '[',
      toneClassName: quickActionToneClass.prev,
      onClick: () => {
        pushToastForSession(handleGoToPreviousTurn(), 'prev');
      },
    },
    {
      id: 'skip',
      visible: isDraftRunning && canSkipCurrentTurn,
      label: 'Skip Turn',
      shortcut: ']',
      toneClassName: quickActionToneClass.skip,
      onClick: () => {
        pushToastForSession(handleSkipCurrentTurn(), 'skip');
      },
    },
    {
      id: 'end',
      visible: status === 'active' || status === 'paused',
      label: 'End Draft',
      shortcut: 'E',
      toneClassName: quickActionToneClass.end,
      onClick: () => {
        void handleEndDraft(false)
          .then((success) => {
            if (success) {
              pushSuccess('Draft ended');
            }
          })
          .catch(() => {
            pushError('Failed to end draft');
          });
      },
    },
  ].filter((action) => action.visible);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className={cn('text-xl font-black', styles.headerTitle)}>
              Draft Session Controls
            </h2>
            <p className={cn('text-sm', styles.headerSubtitle)}>
              Manage live flow, category locks, and draft order.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardBody className="space-y-5">
        <div className={cn('p-2', styles.quickActionShell)}>
          <p
            className={cn(
              'px-1 pb-2 text-[10px] font-black uppercase tracking-wider',
              styles.quickActionLabel
            )}
          >
            Quick Actions
          </p>
          <div className="custom-scrollbar flex gap-2 overflow-x-auto pb-1">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={action.onClick}
                className={cn(
                  'inline-flex shrink-0 items-center gap-2 px-2.5 py-1.5 text-xs',
                  styles.quickAction,
                  action.toneClassName
                )}
              >
                <span>{action.label}</span>
                <kbd
                  className={cn(
                    'theme-kbd px-1.5 py-0.5 text-[10px] font-black',
                    styles.shortcutKeyBadge
                  )}
                >
                  {action.shortcut}
                </kbd>
              </button>
            ))}
          </div>
        </div>

        <div
          className={cn(
            'px-3 py-2 text-xs font-semibold',
            styles.shortcutStrip
          )}
        >
          Shortcuts: <ShortcutKey label="S" hint="start" />{' '}
          <ShortcutKey label="P" hint="pause" />{' '}
          <ShortcutKey label="R" hint="resume" />{' '}
          <ShortcutKey label="[" hint="previous" />{' '}
          <ShortcutKey label="]" hint="skip" />{' '}
          <ShortcutKey label="E" hint="end" />
        </div>

        {showEndWarning && (
          <div className={cn('p-4', styles.warningCallout)}>
            <p className={cn('font-bold', styles.warningTitle)}>
              Warning: Teams still without picks
            </p>
            <p className={cn('mt-1 text-sm', styles.warningText)}>
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
                className={cn(
                  'theme-button theme-button-danger',
                  styles.warningConfirmButton
                )}
              >
                Force End
              </button>
              <button
                onClick={() => setShowEndWarning(false)}
                className={cn(
                  'theme-button theme-button-secondary',
                  styles.warningCancelButton
                )}
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
              className={cn('theme-field', styles.selectField)}
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
              className={cn(
                'theme-field disabled:opacity-50',
                styles.selectField
              )}
            >
              <option value="Local">Local Players</option>
              <option value="Oversea">Oversea Players</option>
            </select>
          </ControlField>
        </div>

        <section className={cn('p-4', styles.reorderSection)}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3
              className={cn(
                'text-sm font-black uppercase tracking-wider',
                styles.reorderTitle
              )}
            >
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
                className={cn(
                  'theme-button theme-button-info disabled:cursor-not-allowed',
                  styles.reverseButton
                )}
              >
                Reverse Order
              </button>
              {isDraftRunning ? (
                <label
                  className={cn(
                    'inline-flex cursor-pointer items-center gap-2 px-2 py-1 text-[10px] font-bold uppercase tracking-wider',
                    styles.reorderToggle
                  )}
                >
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
                <p className={cn('text-xs', styles.currentTurnText)}>
                  Current:{' '}
                  <strong>
                    #{currentTurnTeam.serialNumber} {currentTurnTeam.name}
                  </strong>
                </p>
              ) : null}
            </div>
          </div>

          {isReorderLocked ? (
            <p
              className={cn(
                'mb-3 px-2.5 py-1.5 text-[11px] font-semibold',
                styles.lockNotice
              )}
            >
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
                    className={cn(
                      'w-64 p-3',
                      styles.teamCard,
                      isReorderLocked && styles.teamCardLocked,
                      isDraftRunning &&
                        team.serialNumber === activeSerial &&
                        styles.teamCardActive
                    )}
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
                      <div
                        className={cn(
                          'flex min-w-0 flex-wrap items-center gap-1.5 p-1.5',
                          styles.serialStrip
                        )}
                      >
                        <select
                          value={team.serialNumber}
                          disabled={isReorderLocked}
                          onChange={async (e) => {
                            await updateTeamSerial(
                              team.id,
                              Number(e.target.value)
                            );
                          }}
                          className={cn(
                            'min-w-[62px] shrink-0 px-2 py-1 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50',
                            styles.serialSelect,
                            isDraftRunning &&
                              team.serialNumber === activeSerial &&
                              styles.serialSelectActive
                          )}
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
                          className={cn(
                            'px-1.5 py-1 text-[10px] font-black disabled:cursor-not-allowed disabled:opacity-35',
                            styles.moveButton
                          )}
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
                          className={cn(
                            'px-1.5 py-1 text-[10px] font-black disabled:cursor-not-allowed disabled:opacity-35',
                            styles.moveButton
                          )}
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
                          className={cn(
                            'px-1.5 py-1 text-[10px] font-black disabled:cursor-not-allowed disabled:opacity-35',
                            styles.moveButton
                          )}
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
                          className={cn(
                            'px-1.5 py-1 text-[10px] font-black disabled:cursor-not-allowed disabled:opacity-35',
                            styles.moveButton
                          )}
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
                      <div
                        className={cn(
                          'flex h-10 w-10 items-center justify-center overflow-hidden',
                          styles.logoShell
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
                            className={cn(
                              'text-[10px] font-bold',
                              styles.logoPlaceholder
                            )}
                          >
                            LOGO
                          </span>
                        )}
                      </div>
                      <p
                        className={cn(
                          'truncate text-sm font-bold',
                          styles.teamName
                        )}
                      >
                        {team.name}
                      </p>
                    </div>
                  </div>
                );
              })}

              {sortedTeams.length === 0 ? (
                <div
                  className={cn(
                    'theme-empty-state flex w-full items-center justify-center text-sm',
                    styles.emptyState
                  )}
                >
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
    <div className={cn('p-4', styles.controlField)}>
      <p
        className={cn(
          'text-xs font-black uppercase tracking-wider',
          styles.controlLabel
        )}
      >
        {label}
      </p>
      <div className="mt-2">{children}</div>
      <p className={cn('mt-2 text-xs', styles.controlHint)}>{hint}</p>
    </div>
  );
}

function ShortcutKey({ label, hint }: { label: string; hint: string }) {
  return (
    <span className={styles.shortcutKeyWrap}>
      <kbd
        className={cn(
          'theme-kbd text-[10px] font-black',
          styles.shortcutKeyBadge
        )}
      >
        {label}
      </kbd>
      <span
        className={cn(
          'text-[10px] uppercase tracking-wide',
          styles.shortcutKeyHint
        )}
      >
        {hint}
      </span>
    </span>
  );
}
