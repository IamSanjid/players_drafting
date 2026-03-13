import { useState } from 'react';
import Image from 'next/image';

import { Card, CardBody } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Tabs } from '@/components/ui/Tabs';
import { calculateCategorySpent, toBigIntSafe } from '@/lib/draft';
import { cn, formatMoney } from '@/lib/ui';
import type { ApiPlayer, ApiTeam } from '@/types/domain';

import styles from './TeamDetailsPanel.module.css';

export function TeamProfile({ team }: { team: ApiTeam }) {
  const [tab, setTab] = useState<'Local' | 'Oversea'>('Local');
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  const localPlayers =
    team.players?.filter((player) => player.category === 'Local') || [];
  const overseaPlayers =
    team.players?.filter((player) => player.category === 'Oversea') || [];

  const spentBDT = calculateCategorySpent(team, 'Local');
  const spentUSD = calculateCategorySpent(team, 'Oversea');

  const displayPlayers = tab === 'Local' ? localPlayers : overseaPlayers;
  const totalPages = Math.ceil(displayPlayers.length / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const currentPlayers = displayPlayers.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleTabChange = (newTab: 'Local' | 'Oversea') => {
    setTab(newTab);
    setPage(1);
  };

  return (
    <div className="flex h-full flex-col">
      <header
        className={cn(
          styles.banner,
          'relative mb-4 h-32 shrink-0 overflow-hidden rounded-xl'
        )}
      >
        {team.bannerUrl ? (
          <Image
            src={team.bannerUrl}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 28rem"
            className="object-cover opacity-90"
          />
        ) : null}

        <div className={cn(styles.bannerOverlay, 'absolute inset-0')} />

        <div className="absolute bottom-3 left-3 flex items-center gap-3">
          <div
            className={cn(
              styles.logoFrame,
              'flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl p-1.5'
            )}
          >
            {team.logoUrl ? (
              <div className="relative h-full w-full">
                <Image
                  src={team.logoUrl}
                  alt={`${team.name} logo`}
                  fill
                  sizes="56px"
                  className="object-contain"
                />
              </div>
            ) : (
              <span
                className={cn(styles.logoPlaceholder, 'text-lg font-black')}
              >
                {team.name.charAt(0)}
              </span>
            )}
          </div>

          <div>
            <h3
              className={cn(
                styles.bannerTitle,
                'text-lg font-black leading-none'
              )}
            >
              {team.name}
            </h3>
            <p
              className={cn(
                styles.bannerMeta,
                'mt-1 text-[10px] font-bold uppercase tracking-widest'
              )}
            >
              Serial #{team.serialNumber}
            </p>
          </div>
        </div>
      </header>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <MetricCard
          title="BDT"
          spent={`৳${spentBDT.toLocaleString()}`}
          available={`৳${toBigIntSafe(team.budgetBDT).toLocaleString()}`}
        />
        <MetricCard
          title="USD"
          spent={`$${spentUSD.toLocaleString()}`}
          available={`$${toBigIntSafe(team.budgetUSD).toLocaleString()}`}
        />
      </div>

      <Tabs<'Local' | 'Oversea'>
        value={tab}
        onChange={handleTabChange}
        className="mb-3 w-full"
        options={[
          { value: 'Local', label: `Local (${localPlayers.length})` },
          { value: 'Oversea', label: `Oversea (${overseaPlayers.length})` },
        ]}
      />

      <div
        className={cn(
          styles.tableShell,
          'flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl'
        )}
      >
        <div className="custom-scrollbar overflow-x-auto overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className={cn(styles.tableHead, 'text-[10px] uppercase')}>
              <tr>
                <th className="px-3 py-2.5 font-black">Player</th>
                <th className="px-3 py-2.5 font-black">Pos</th>
                <th className="px-3 py-2.5 text-right font-black">Price</th>
              </tr>
            </thead>
            <tbody className={cn(styles.tableBody, 'divide-y')}>
              {currentPlayers.map((player: ApiPlayer) => (
                <tr
                  key={player.id}
                  className={cn(styles.tableRow, 'transition-colors')}
                >
                  <td className="px-3 py-2.5">
                    <p className={cn(styles.playerName, 'font-bold')}>
                      {player.name}
                    </p>
                    <p
                      className={cn(
                        styles.playerMeta,
                        'text-[10px] font-semibold uppercase tracking-wider'
                      )}
                    >
                      Category {player.subCategory}
                    </p>
                    {player.category === 'Oversea' && player.country ? (
                      <p
                        className={cn(
                          styles.playerMeta,
                          'text-[10px] font-semibold uppercase'
                        )}
                      >
                        {player.country}
                      </p>
                    ) : null}
                  </td>
                  <td className={cn(styles.position, 'px-3 py-2.5')}>
                    {player.position}
                  </td>
                  <td
                    className={cn(
                      styles.price,
                      'px-3 py-2.5 text-right font-mono font-bold'
                    )}
                  >
                    {player.isPreBought
                      ? 'Pre-Bought'
                      : tab === 'Local'
                        ? `৳${formatMoney(player.priceBDT)}`
                        : `$${formatMoney(player.priceUSD)}`}
                  </td>
                </tr>
              ))}
              {displayPlayers.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className={cn(styles.emptyState, 'px-3 py-8 text-center')}
                  >
                    No players drafted yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {totalPages > 1 ? (
          <div
            className={cn(
              styles.pagination,
              'flex items-center justify-between px-2 py-2'
            )}
          >
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className={cn(
                styles.paginationButton,
                'rounded px-2 py-1 text-[10px] font-bold'
              )}
            >
              Prev
            </button>
            <span
              className={cn(
                styles.paginationMeta,
                'text-[10px] font-bold uppercase tracking-wider'
              )}
            >
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className={cn(
                styles.paginationButton,
                'rounded px-2 py-1 text-[10px] font-bold'
              )}
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function TeamDetailsPanel({
  teams,
  currentTeamId,
}: {
  teams: ApiTeam[];
  currentTeamId: string;
}) {
  const [activeTab, setActiveTab] = useState<'Team' | 'Others'>('Team');
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  const currentTeam = teams.find((team) => team.id === currentTeamId);
  const otherTeams = teams.filter((team) => team.id !== currentTeamId);

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardBody className="flex min-h-0 flex-1 flex-col gap-3 p-4">
        <Tabs<'Team' | 'Others'>
          value={activeTab}
          onChange={setActiveTab}
          className="w-full"
          options={[
            { value: 'Team', label: 'My Team Info' },
            { value: 'Others', label: 'Other Teams' },
          ]}
        />

        {activeTab === 'Team' && currentTeam ? (
          <TeamProfile team={currentTeam} />
        ) : null}

        {activeTab === 'Others' ? (
          <div className="custom-scrollbar h-full space-y-3 overflow-y-auto pr-1">
            {otherTeams.map((team) => (
              <article
                key={team.id}
                className={cn(styles.othersCard, 'overflow-hidden rounded-xl')}
              >
                <button
                  onClick={() =>
                    setExpandedTeamId(
                      expandedTeamId === team.id ? null : team.id
                    )
                  }
                  className={cn(
                    styles.othersButton,
                    'flex w-full items-center justify-between px-3 py-2 text-left font-bold'
                  )}
                >
                  <span>{team.name}</span>
                  <StatusBadge
                    label={expandedTeamId === team.id ? 'Open' : 'Expand'}
                    tone={expandedTeamId === team.id ? 'active' : 'neutral'}
                  />
                </button>
                {expandedTeamId === team.id ? (
                  <div className={cn(styles.othersBody, 'p-3')}>
                    <TeamProfile team={team} />
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

function MetricCard({
  title,
  spent,
  available,
}: {
  title: string;
  spent: string;
  available: string;
}) {
  return (
    <div className={cn(styles.metricCard, 'rounded-xl p-2.5')}>
      <p className="stat-label">{title} Status</p>
      <p className={cn(styles.metricSpent, 'text-xs font-bold')}>
        Spent: {spent}
      </p>
      <p className={cn(styles.metricAvailable, 'text-sm font-black')}>
        Avail: {available}
      </p>
    </div>
  );
}
