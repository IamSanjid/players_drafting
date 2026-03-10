import { useState } from 'react';
import Image from 'next/image';

import { Card, CardBody } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Tabs } from '@/components/ui/Tabs';
import { calculateCategorySpent, toBigIntSafe } from '@/lib/draft';
import { formatMoney } from '@/lib/ui';
import type { ApiPlayer, ApiTeam } from '@/types/domain';

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
      <header className="relative mb-4 h-32 flex-shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-sky-700 via-sky-900 to-slate-900 shadow-lg">
        {team.bannerUrl ? (
          <Image
            src={team.bannerUrl}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 28rem"
            className="object-cover opacity-90"
          />
        ) : null}

        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />

        <div className="absolute bottom-3 left-3 flex items-center gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-white/50 bg-white p-1.5 shadow-2xl">
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
              <span className="text-lg font-black text-slate-400">
                {team.name.charAt(0)}
              </span>
            )}
          </div>

          <div>
            <h3 className="text-lg font-black leading-none text-white">
              {team.name}
            </h3>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-sky-100">
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

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="custom-scrollbar overflow-x-auto overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b bg-slate-50 text-[10px] uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2.5 font-black">Player</th>
                <th className="px-3 py-2.5 font-black">Pos</th>
                <th className="px-3 py-2.5 text-right font-black">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentPlayers.map((player: ApiPlayer) => (
                <tr
                  key={player.id}
                  className="transition-colors hover:bg-sky-50/60"
                >
                  <td className="px-3 py-2.5">
                    <p className="font-bold text-slate-900">{player.name}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Category {player.subCategory}
                    </p>
                    {player.category === 'Oversea' && player.country ? (
                      <p className="text-[10px] font-semibold uppercase text-slate-500">
                        {player.country}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 text-slate-700">
                    {player.position}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-sky-800">
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
                    className="px-3 py-8 text-center text-slate-500"
                  >
                    No players drafted yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t bg-slate-50 px-2 py-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 disabled:opacity-30"
            >
              Prev
            </button>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 disabled:opacity-30"
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
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <button
                  onClick={() =>
                    setExpandedTeamId(
                      expandedTeamId === team.id ? null : team.id
                    )
                  }
                  className="flex w-full items-center justify-between bg-slate-50 px-3 py-2 text-left font-bold text-slate-800 hover:bg-slate-100"
                >
                  <span>{team.name}</span>
                  <StatusBadge
                    label={expandedTeamId === team.id ? 'Open' : 'Expand'}
                    tone={expandedTeamId === team.id ? 'active' : 'neutral'}
                  />
                </button>
                {expandedTeamId === team.id ? (
                  <div className="border-t border-slate-200 bg-slate-50 p-3">
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
    <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
      <p className="stat-label">{title} Status</p>
      <p className="text-xs font-bold text-rose-700">Spent: {spent}</p>
      <p className="text-sm font-black text-emerald-700">Avail: {available}</p>
    </div>
  );
}
