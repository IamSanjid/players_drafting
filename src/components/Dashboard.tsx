'use client';

import { cn } from '@/lib/ui';
import type { ApiPlayer, ApiTeam } from '@/types/domain';

import styles from './Dashboard.module.css';

export default function Dashboard({
  teams,
  activeTurnTeamId,
}: {
  teams: ApiTeam[];
  activeTurnTeamId?: string | null;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {teams.map((team) => (
        <div
          key={team.id}
          className={cn(
            styles.card,
            activeTurnTeamId === team.id && styles.cardActive,
            'flex flex-col overflow-hidden rounded-2xl transition-all',
            activeTurnTeamId === team.id && 'z-10 scale-105'
          )}
        >
          <div
            className={cn(
              styles.header,
              activeTurnTeamId === team.id
                ? styles.headerActive
                : styles.headerInactive,
              'flex items-center justify-between p-4'
            )}
          >
            <div>
              <div
                className={cn(
                  styles.pickMeta,
                  'text-xs font-bold uppercase tracking-wider'
                )}
              >
                Pick #{team.serialNumber}
              </div>
              <h3
                className={cn(
                  styles.teamTitle,
                  activeTurnTeamId === team.id && styles.teamTitleActive,
                  'text-xl font-black'
                )}
              >
                {team.name}
              </h3>
            </div>
            {activeTurnTeamId === team.id && (
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-current"></span>
              </span>
            )}
          </div>

          <div className="p-4 flex-1">
            <div className="flex justify-between items-center mb-4 text-sm font-medium">
              <div className="flex flex-col">
                <span className={cn(styles.budgetLabel, 'text-xs uppercase')}>
                  BDT Left
                </span>
                <span
                  className={cn(styles.budgetValueBdt, 'text-lg font-mono')}
                >
                  ৳{Number(team.budgetBDT).toLocaleString()}
                </span>
              </div>
              <div className="flex flex-col text-right">
                <span className={cn(styles.budgetLabel, 'text-xs uppercase')}>
                  USD Left
                </span>
                <span
                  className={cn(styles.budgetValueUsd, 'text-lg font-mono')}
                >
                  ${Number(team.budgetUSD).toLocaleString()}
                </span>
              </div>
            </div>

            <h4
              className={cn(
                styles.sectionHeading,
                'mb-2 border-b pb-1 text-xs font-semibold uppercase tracking-widest'
              )}
            >
              Drafted Players ({team.players?.length || 0})
            </h4>
            <div className="space-y-1 mt-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {team.players && team.players.length > 0 ? (
                team.players.map((p: ApiPlayer) => (
                  <div
                    key={p.id}
                    className={cn(
                      styles.playerRow,
                      'flex items-center justify-between py-1 last:border-0'
                    )}
                  >
                    <div
                      className={cn(styles.playerLead, 'truncate pl-2 pr-2')}
                    >
                      <p
                        className={cn(
                          styles.playerName,
                          'truncate text-sm font-semibold'
                        )}
                      >
                        {p.name}
                      </p>
                      <p
                        className={cn(
                          styles.playerMeta,
                          'text-[10px] uppercase'
                        )}
                      >
                        {p.category} • {p.subCategory} • {p.position}
                      </p>
                    </div>
                    {p.isPreBought && (
                      <span
                        className={cn(
                          styles.preBoughtBadge,
                          'rounded px-1.5 py-0.5 text-[9px] font-bold'
                        )}
                      >
                        PRE
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div
                  className={cn(
                    styles.emptyState,
                    'py-4 text-center text-xs font-medium italic'
                  )}
                >
                  No players drafted yet
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
