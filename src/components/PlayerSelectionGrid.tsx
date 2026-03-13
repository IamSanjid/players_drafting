'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';

import { draftApi } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { cn, formatMoney } from '@/lib/ui';
import { getSocket } from '@/lib/socketClient';
import type {
  PlayerCategory,
  AllowedCategories,
  DraftStatus,
  ApiPlayer,
  ApiTeam,
} from '@/types/domain';

import styles from './PlayerSelectionGrid.module.css';

type PlayerSelectionGridProps = {
  players: ApiPlayer[];
  allowedCategories?: AllowedCategories | null;
  currentTeamId?: string | null;
  currentTurnTeamId?: string | null;
  draftStatus?: DraftStatus;
  teams: ApiTeam[];
  readOnly?: boolean;
  showAllCategories?: boolean;
};

export default function PlayerSelectionGrid({
  players,
  allowedCategories,
  currentTeamId,
  currentTurnTeamId,
  draftStatus,
  teams,
  readOnly = false,
  showAllCategories = false,
}: PlayerSelectionGridProps) {
  const socket = getSocket();
  const [activeTabCategory, setActiveTabCategory] =
    useState<PlayerCategory>('Oversea');
  const [activeSubCategory, setActiveSubCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [draftingPlayerId, setDraftingPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isMyTurn =
    currentTurnTeamId === currentTeamId && draftStatus === 'active';

  // If showAllCategories is true (public view), never lock tabs regardless of admin session settings
  const isTabsLocked = !showAllCategories && allowedCategories !== 'Both';
  const lockedCategory = isTabsLocked
    ? allowedCategories === 'Local'
      ? 'Local'
      : allowedCategories === 'Oversea'
        ? 'Oversea'
        : null
    : null;
  const currentCategory = lockedCategory || activeTabCategory;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeSubCategory, currentCategory, searchQuery]);

  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      if (p.category !== currentCategory) return false;
      if (activeSubCategory !== 'All' && p.subCategory !== activeSubCategory)
        return false;
      if (
        searchQuery &&
        !p.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    });
  }, [players, currentCategory, activeSubCategory, searchQuery]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredPlayers.length / itemsPerPage);
  const paginatedPlayers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPlayers.slice(start, start + itemsPerPage);
  }, [filteredPlayers, currentPage]);

  const draftPlayer = async (playerId: string) => {
    if (!isMyTurn) return;
    setError(null);
    setDraftingPlayerId(playerId);

    try {
      const res = await draftApi.pick(currentTeamId, playerId);
      if (!res.ok) {
        throw new Error(res.error);
      }

      // Success, notify real-time server
      socket.emit('pick_made', res.data); // Custom animated event for Public UI
      socket.emit('state_changed'); // Generic refresh state
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Draft failed');
    } finally {
      setDraftingPlayerId(null);
    }
  };

  const getSubcategories = () => {
    const cats = new Set(
      players
        .filter((p) => p.category === currentCategory)
        .map((p) => p.subCategory)
    );
    return Array.from(cats).sort();
  };

  const subCategories = getSubcategories();

  return (
    <div
      className={cn(
        styles.panel,
        'flex h-full flex-col overflow-hidden rounded-2xl'
      )}
    >
      <div className={cn('theme-toolbar', 'flex flex-col gap-4 p-4')}>
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          {/* Category Tabs */}
          <div className={cn(styles.categoryTabs, 'flex space-x-1 rounded-lg p-1')}>
            <button
              disabled={lockedCategory === 'Local'}
              onClick={() => setActiveTabCategory('Oversea')}
              aria-pressed={currentCategory === 'Oversea'}
              className={cn(
                styles.categoryTab,
                currentCategory === 'Oversea' && styles.categoryTabActive,
                lockedCategory === 'Local' && 'hidden cursor-not-allowed opacity-30',
                'rounded-md px-6 py-2 font-semibold transition-all'
              )}
            >
              Oversea Players
            </button>
            <button
              disabled={lockedCategory === 'Oversea'}
              onClick={() => setActiveTabCategory('Local')}
              aria-pressed={currentCategory === 'Local'}
              className={cn(
                styles.categoryTab,
                currentCategory === 'Local' && styles.categoryTabActive,
                lockedCategory === 'Oversea' && 'hidden cursor-not-allowed opacity-30',
                'rounded-md px-6 py-2 font-semibold transition-all'
              )}
            >
              Local Players
            </button>
          </div>

          {/* Search */}
          <div className="relative w-full md:w-80">
            <label htmlFor="player-search" className="sr-only">
              Search players
            </label>
            <input
              id="player-search"
              type="text"
              placeholder={`Search in ${currentCategory}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                'theme-field w-full rounded-xl px-4 py-2 pl-10 transition-all',
                styles.searchInput
              )}
            />
            <svg
              className={cn(styles.searchIcon, 'absolute left-3 top-2.5 h-5 w-5')}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              ></path>
            </svg>
          </div>
        </div>

        {/* Sub Category A-Z Tabs */}
        <div className="flex overflow-x-auto pb-1 gap-2 custom-scrollbar">
          <button
            onClick={() => setActiveSubCategory('All')}
            className={cn(
              styles.subcategoryPill,
              activeSubCategory === 'All' && styles.subcategoryPillActive,
              'whitespace-nowrap rounded-full px-5 py-1.5 text-sm font-bold transition-all',
              activeSubCategory === 'All' && 'scale-105'
            )}
          >
            All Category
          </button>

          {subCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveSubCategory(cat)}
              className={cn(
                styles.subcategoryPill,
                activeSubCategory === cat && styles.subcategoryPillInfo,
                'whitespace-nowrap rounded-full px-5 py-1.5 text-sm font-bold transition-all',
                activeSubCategory === cat && 'scale-105'
              )}
            >
              Category {cat}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div
          role="status"
          aria-live="polite"
          className={cn(styles.errorPanel, 'm-4 p-4')}
        >
          <p className={cn(styles.errorText, 'text-sm font-medium')}>{error}</p>
        </div>
      )}

      {/* Table View */}
      <div className={cn('theme-table-shell', 'flex flex-1 flex-col overflow-hidden')}>
        <div className="overflow-x-auto h-full pr-2 custom-scrollbar">
          <table className="w-full text-left border-separate border-spacing-y-2 px-4">
            <thead className={cn(styles.tableHead, 'sticky top-0 z-10')}>
              <tr className={cn(styles.tableHeadRow, 'text-xs font-black uppercase tracking-widest')}>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className={cn(
                      'theme-empty-state',
                      'rounded-xl py-20 text-center font-medium'
                    )}
                  >
                    No players found in this category.
                  </td>
                </tr>
              ) : (
                paginatedPlayers.map((p) => {
                  const isDrafted = p.teamId !== null;
                  const myPlayer = p.teamId === currentTeamId;
                  const price =
                    p.category === 'Local' ? p.priceBDT : p.priceUSD;
                  const currency = p.category === 'Local' ? 'BDT' : 'USD';

                  const draftingTeam = p.teamId
                    ? teams.find((t) => t.id === p.teamId)
                    : null;

                  let bgInlineStyle = {};

                  if (isDrafted) {
                    if (draftingTeam?.bannerUrl) {
                      bgInlineStyle = {
                        backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.95), rgba(255,255,255,0.7)), url(${draftingTeam.bannerUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      };
                    }
                  }

                  return (
                    <tr
                      key={p.id}
                      style={bgInlineStyle}
                      className={cn(
                        styles.row,
                        isDrafted
                          ? myPlayer
                            ? styles.rowMine
                            : styles.rowDrafted
                          : styles.rowAvailable,
                        'group rounded-xl transition-all'
                      )}
                    >
                      <td className="px-4 py-3 rounded-l-xl">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              styles.avatarShell,
                              'flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full font-bold'
                            )}
                          >
                            {p.imageUrl ? (
                              <Image
                                src={p.imageUrl}
                                alt={`${p.name} photo`}
                                width={40}
                                height={40}
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              p.name.charAt(0)
                            )}
                          </div>
                          <div className="min-w-0">
                            <div
                              className={cn(
                                styles.name,
                                isDrafted && styles.nameDrafted,
                                'truncate font-bold',
                                isDrafted && 'line-through'
                              )}
                            >
                              {p.name}
                            </div>
                            {activeSubCategory === 'All' && (
                              <div
                                className={cn(
                                  styles.subCategoryLabel,
                                  'text-[9px] font-bold uppercase tracking-tighter'
                                )}
                              >
                                Category {p.subCategory}
                              </div>
                            )}
                            {p.category === 'Oversea' && (
                              <span
                                className={cn(
                                  styles.availabilityLabel,
                                  'mt-0.5 inline-block rounded px-1 text-[10px] font-black uppercase'
                                )}
                              >
                                {p.availability}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className={cn(styles.detailPrimary, 'text-sm font-medium')}>
                          {p.position}
                        </div>
                        <div
                          className={cn(
                            styles.detailSecondary,
                            'text-[10px] font-bold uppercase tracking-tight'
                          )}
                        >
                          {p.country}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className={cn(styles.price, 'font-mono text-sm font-black')}>
                          {formatMoney(price)}{' '}
                          <span className={cn(styles.priceCurrency, 'text-[10px]')}>
                            {currency}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right rounded-r-xl">
                        {isDrafted ? (
                          <StatusBadge
                            label={myPlayer ? 'Yours' : 'Drafted'}
                            tone={myPlayer ? 'success' : 'neutral'}
                          />
                        ) : readOnly ? (
                          <StatusBadge label="Available" tone="active" />
                        ) : (
                          <button
                            onClick={() => draftPlayer(p.id)}
                            disabled={!isMyTurn || draftingPlayerId === p.id}
                            className={cn(
                              'theme-button theme-button-primary px-4 py-1.5 transition',
                              styles.draftButton
                            )}
                          >
                            {draftingPlayerId === p.id ? '...' : 'Draft'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className={cn(styles.pagination, 'flex items-center justify-between p-4')}>
            <div className={cn(styles.paginationMeta, 'text-xs font-bold uppercase tracking-widest')}>
              Page {currentPage} of {totalPages} ({filteredPlayers.length}{' '}
              Total)
            </div>
            <div className="flex gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => prev - 1)}
                className={cn(
                  styles.paginationButton,
                  'flex h-10 w-10 items-center justify-center rounded-lg transition'
                )}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 19l-7-7 7-7"
                  ></path>
                </svg>
              </button>

              <div className="flex gap-1">
                {[...Array(totalPages)].map((_, i) => {
                  const page = i + 1;
                  // Show current page, first, last, and pages around current
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={cn(
                          styles.paginationButton,
                          currentPage === page && styles.paginationButtonActive,
                          'h-10 w-10 rounded-lg text-sm font-bold transition'
                        )}
                      >
                        {page}
                      </button>
                    );
                  } else if (page === 2 || page === totalPages - 1) {
                    return (
                      <span
                        key={page}
                        className={cn(styles.ellipsis, 'self-center px-2')}
                      >
                        ...
                      </span>
                    );
                  }
                  return null;
                })}
              </div>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => prev + 1)}
                className={cn(
                  styles.paginationButton,
                  'flex h-10 w-10 items-center justify-center rounded-lg transition'
                )}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5l7 7-7 7"
                  ></path>
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
