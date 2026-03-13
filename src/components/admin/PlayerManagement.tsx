'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

import CSVBulkUploader from '@/components/admin/CSVBulkUploader';
import { useAdminToast } from '@/components/admin/AdminToastProvider';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Tabs } from '@/components/ui/Tabs';
import { playersApi, uploadApi } from '@/lib/api';
import type { PlayerUpsertPayload } from '@/lib/api';
import { useDraftStore } from '@/lib/draftStore';
import { getSocket } from '@/lib/socketClient';
import { cn, formatMoney } from '@/lib/ui';
import type { ApiPlayer, ApiTeam, PlayerCategory } from '@/types/domain';

import styles from './PlayerManagement.module.css';

const SUB_CATEGORIES = ['Icon', 'A', 'B', 'C', 'D', 'E', 'F'];

export default function PlayerManagement({ teams }: { teams: ApiTeam[] }) {
  const players = useDraftStore((state) => state.players);
  const loading = useDraftStore((state) => state.loading);
  const fetchAll = useDraftStore((state) => state.fetchAll);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<PlayerCategory>('Oversea');
  const [subCategory, setSubCategory] = useState(SUB_CATEGORIES[0]);
  const [position, setPosition] = useState('');
  const [priceBDT, setPriceBDT] = useState('');
  const [priceUSD, setPriceUSD] = useState('');
  const [country, setCountry] = useState('');
  const [availability, setAvailability] = useState('Full-Time');
  const [imageUrl, setImageUrl] = useState('');
  const [isPreBought, setIsPreBought] = useState(false);
  const [preBoughtTeamId, setPreBoughtTeamId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [listCategory, setListCategory] = useState<'Oversea' | 'Local'>(
    'Oversea'
  );
  const [listSubCategory, setListSubCategory] = useState<string>('All');
  const [listSearch, setListSearch] = useState('');

  const [showCsvUploader, setShowCsvUploader] = useState(false);
  const [isPlayerFormExpanded, setIsPlayerFormExpanded] = useState(false);
  const playerManagementRootRef = useRef<HTMLDivElement>(null);
  const playerNameInputRef = useRef<HTMLInputElement>(null);
  const { pushSuccess, pushError } = useAdminToast();

  const findScrollableAncestor = (node: HTMLElement | null) => {
    let current: HTMLElement | null = node?.parentElement ?? null;

    while (current) {
      const style = window.getComputedStyle(current);
      const isScrollable =
        (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
        current.scrollHeight > current.clientHeight;

      if (isScrollable) {
        return current;
      }

      current = current.parentElement;
    }

    return null;
  };

  const socket = getSocket();

  useEffect(() => {
    if (players.length === 0) {
      void fetchAll();
    }
  }, [fetchAll, players.length]);

  useEffect(() => {
    setCurrentPage(1);
  }, [listCategory, listSubCategory, listSearch]);

  useEffect(() => {
    if (!editingPlayerId || !isPlayerFormExpanded) {
      return;
    }

    const scrollTarget = findScrollableAncestor(
      playerManagementRootRef.current
    );

    if (scrollTarget) {
      scrollTarget.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const focusDelayId = window.setTimeout(() => {
      playerNameInputRef.current?.focus({ preventScroll: true });
      playerNameInputRef.current?.select();
    }, 220);

    return () => {
      window.clearTimeout(focusDelayId);
    };
  }, [editingPlayerId, isPlayerFormExpanded]);

  const resetForm = () => {
    setEditingPlayerId(null);
    setName('');
    setPosition('');
    setPriceBDT('');
    setPriceUSD('');
    setImageUrl('');
    setIsPreBought(false);
    setPreBoughtTeamId('');
    setCountry('');
  };

  const handleCancelEdit = () => {
    resetForm();
    setIsPlayerFormExpanded(false);
  };

  const handleAddOrUpdatePlayer = async (
    e: React.SubmitEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    const payload: PlayerUpsertPayload = {
      name,
      category,
      subCategory,
      position,
      priceBDT,
      priceUSD,
      country,
      availability,
      imageUrl,
      isPreBought,
      teamId: preBoughtTeamId
        ? preBoughtTeamId.length === 0
          ? null
          : preBoughtTeamId
        : null,
    };

    const res = editingPlayerId
      ? await playersApi.update(editingPlayerId, payload)
      : await playersApi.create(payload);

    if (!res.ok) {
      pushError(res.error || 'Failed to save player.');
      return;
    }

    socket.emit('state_changed');
    await fetchAll({ silent: true, force: true });
    pushSuccess(
      editingPlayerId
        ? 'Player updated successfully.'
        : 'Player added successfully.'
    );
    resetForm();
    setIsPlayerFormExpanded(false);
  };

  const deletePlayer = async (id: string) => {
    if (!confirm('Delete player?')) {
      return;
    }
    const res = await playersApi.remove(id);
    if (!res.ok) {
      pushError('Failed to delete player.');
      return;
    }
    socket.emit('state_changed');
    await fetchAll({ silent: true, force: true });
    pushSuccess('Player deleted.');
  };

  const handleDeleteAllByCategory = async (cat: string) => {
    if (
      !confirm(
        `Are you absolutely sure you want to delete ALL ${cat} players? This cannot be undone.`
      )
    ) {
      return;
    }
    const res = await playersApi.removeByCategory(cat);
    if (!res.ok) {
      pushError(`Failed to delete ${cat} players.`);
      return;
    }
    socket.emit('state_changed');
    await fetchAll({ silent: true, force: true });
    pushSuccess(`Deleted all ${cat} players.`);
  };

  const startEdit = (player: ApiPlayer) => {
    setEditingPlayerId(player.id);
    setIsPlayerFormExpanded(true);
    setName(player.name);
    setCategory(player.category);
    setSubCategory(player.subCategory);
    setPosition(player.position);
    setPriceBDT(player.priceBDT?.toString() || '');
    setPriceUSD(player.priceUSD?.toString() || '');
    setCountry(player.country || '');
    setAvailability(player.availability || 'Full-Time');
    setImageUrl(player.imageUrl || '');
    setIsPreBought(player.isPreBought);
    setPreBoughtTeamId(player.teamId || '');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    setUploading(true);

    try {
      const res = await uploadApi.uploadFile(file);
      if (res.ok && res.data.url) {
        setImageUrl(res.data.url);
        pushSuccess('Player image uploaded.');
      } else {
        pushError(res.ok ? 'Image upload failed.' : res.error);
      }
    } catch (err: unknown) {
      console.error('Upload failed', err);
      pushError('Image upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleRowFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    playerId: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const uploadRes = await uploadApi.uploadFile(file);
      if (uploadRes.ok && uploadRes.data.url) {
        const patchRes = await playersApi.update(playerId, {
          imageUrl: uploadRes.data.url,
        });
        if (!patchRes.ok) {
          pushError('Failed to save uploaded image.');
          return;
        }
        socket.emit('state_changed');
        await fetchAll({ silent: true, force: true });
        pushSuccess('Player image updated.');
      } else {
        pushError(uploadRes.ok ? 'Image upload failed.' : uploadRes.error);
      }
    } catch (err: unknown) {
      console.error('Direct upload failed', err);
      pushError('Image upload failed.');
    }
  };

  const filteredPlayers = players.filter((player) => {
    if (player.category !== listCategory) {
      return false;
    }
    if (listSubCategory !== 'All' && player.subCategory !== listSubCategory) {
      return false;
    }
    if (
      listSearch &&
      !player.name.toLowerCase().includes(listSearch.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredPlayers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPlayers = filteredPlayers.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const draftedPlayersCount = players.filter((player) =>
    Boolean(player.team)
  ).length;
  const availablePlayersCount = players.length - draftedPlayersCount;
  const preBoughtCount = players.filter((player) => player.isPreBought).length;

  const handleManualAssign = async (playerId: string, teamId: string) => {
    if (!teamId) {
      return;
    }

    if (
      !confirm(
        'Are you sure you want to assign this player? This will update budgets and counts.'
      )
    ) {
      return;
    }

    setAssigningId(playerId);
    try {
      const res = await playersApi.assign(playerId, teamId);

      if (res.ok) {
        socket.emit('pick_made', {
          player: res.data.player,
          team: res.data.team,
        });

        socket.emit('state_changed');
        await fetchAll({ silent: true, force: true });
        pushSuccess('Player assigned successfully.');
      } else {
        pushError(res.error || 'Assignment failed.');
      }
    } catch {
      pushError('Error assigning player.');
    } finally {
      setAssigningId(null);
    }
  };

  const triggerAnimation = (player: ApiPlayer) => {
    if (!player.team) {
      pushError('Cannot broadcast: player has no assigned team.');
      return;
    }
    socket.emit('pick_made', { player, team: player.team });
    pushSuccess(`Broadcast sent for ${player.name}.`);
  };

  const fieldClassName = cn('theme-field', styles.fieldInput);
  const uploadControlClassName = cn(
    'flex items-center justify-center p-2.5 transition',
    styles.uploadControl
  );

  return (
    <Card className="overflow-hidden">
      <div ref={playerManagementRootRef} />
      <CardHeader
        className={cn(
          'flex items-center justify-between gap-4',
          'theme-toolbar',
          styles.cardHeader
        )}
      >
        <div>
          <h2 className={cn('text-xl font-black', styles.headerTitle)}>
            Player Management
          </h2>
          <p className={cn('mt-1 text-sm', styles.headerSubtitle)}>
            Add players to the draft pool or register pre-bought contracts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge label={`${players.length} total`} tone="active" />
          <button
            onClick={() => setShowCsvUploader(!showCsvUploader)}
            className={cn(
              'font-bold transition-all',
              styles.csvToggleButton,
              showCsvUploader
                ? styles.csvToggleButtonOpen
                : 'theme-button theme-button-info'
            )}
          >
            {showCsvUploader ? 'Close CSV Tool' : 'Bulk Upload CSV'}
          </button>
        </div>
      </CardHeader>

      <CardBody>
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatPill
            label="Total"
            value={players.length.toString()}
            tone="active"
          />
          <StatPill
            label="Available"
            value={availablePlayersCount.toString()}
            tone="success"
          />
          <StatPill
            label="Drafted"
            value={draftedPlayersCount.toString()}
            tone="warning"
          />
          <StatPill
            label="Pre-Bought"
            value={preBoughtCount.toString()}
            tone="neutral"
          />
        </div>

        {showCsvUploader ? (
          <div className={cn('mb-8 p-1', styles.csvShell)}>
            <CSVBulkUploader
              onImportComplete={() => {
                void fetchAll({ silent: true, force: true });
                setShowCsvUploader(false);
              }}
            />
          </div>
        ) : null}

        <section className={cn('mb-8', styles.formSection)}>
          <div
            className={cn(
              'flex flex-wrap items-center justify-between gap-3 px-4 py-3',
              styles.formHeader
            )}
          >
            <div>
              <h3
                className={cn(
                  'text-sm font-black uppercase tracking-wider',
                  styles.sectionTitle
                )}
              >
                {editingPlayerId ? 'Edit Player' : 'Add New Player'}
              </h3>
              <p
                className={cn('text-xs font-semibold', styles.sectionSubtitle)}
              >
                {editingPlayerId
                  ? 'Editing selected player details'
                  : 'Create a new player entry'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {editingPlayerId ? (
                <button
                  onClick={handleCancelEdit}
                  type="button"
                  className={cn(
                    'theme-button theme-button-danger',
                    styles.cancelButton
                  )}
                >
                  Cancel Edit
                </button>
              ) : null}
              <button
                type="button"
                aria-expanded={isPlayerFormExpanded}
                aria-controls="player-form-panel"
                onClick={() => setIsPlayerFormExpanded((current) => !current)}
                className={cn(
                  'theme-button theme-button-secondary inline-flex items-center gap-2',
                  styles.toggleButton
                )}
              >
                {isPlayerFormExpanded ? 'Collapse' : 'Expand'}
                <span className="text-sm leading-none" aria-hidden="true">
                  {isPlayerFormExpanded ? '▴' : '▾'}
                </span>
              </button>
            </div>
          </div>

          {isPlayerFormExpanded ? (
            <form
              id="player-form-panel"
              onSubmit={handleAddOrUpdatePlayer}
              className="grid grid-cols-1 gap-4 p-5 md:grid-cols-4"
            >
              <div>
                <label
                  className={cn('text-xs font-semibold', styles.fieldLabel)}
                >
                  Name
                </label>
                <input
                  ref={playerNameInputRef}
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  type="text"
                  className={fieldClassName}
                  placeholder="Player Name"
                />
              </div>
              <div>
                <label
                  className={cn('text-xs font-semibold', styles.fieldLabel)}
                >
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as PlayerCategory)
                  }
                  className={fieldClassName}
                >
                  <option value="Oversea">Oversea</option>
                  <option value="Local">Local</option>
                </select>
              </div>
              <div>
                <label
                  className={cn('text-xs font-semibold', styles.fieldLabel)}
                >
                  Sub-Category
                </label>
                <select
                  value={subCategory}
                  onChange={(e) => setSubCategory(e.target.value)}
                  className={fieldClassName}
                >
                  {SUB_CATEGORIES.map((subCategoryOption) => (
                    <option key={subCategoryOption} value={subCategoryOption}>
                      Category {subCategoryOption}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className={cn('text-xs font-semibold', styles.fieldLabel)}
                >
                  Position
                </label>
                <input
                  required
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  type="text"
                  className={fieldClassName}
                  placeholder="e.g. Batsman"
                />
              </div>

              <div className="flex flex-col gap-4 md:col-span-2">
                <div className="grid grid-cols-2 gap-4">
                  {category === 'Local' ? (
                    <div>
                      <label
                        className={cn(
                          'text-xs font-semibold',
                          styles.fieldLabel
                        )}
                      >
                        Price (BDT)
                      </label>
                      <input
                        required
                        value={priceBDT}
                        onChange={(e) => setPriceBDT(e.target.value)}
                        type="number"
                        className={fieldClassName}
                        placeholder="0"
                      />
                    </div>
                  ) : (
                    <div>
                      <label
                        className={cn(
                          'text-xs font-semibold',
                          styles.fieldLabel
                        )}
                      >
                        Price (USD)
                      </label>
                      <input
                        required
                        value={priceUSD}
                        onChange={(e) => setPriceUSD(e.target.value)}
                        type="number"
                        className={fieldClassName}
                        placeholder="0"
                      />
                    </div>
                  )}
                  {category === 'Oversea' ? (
                    <div>
                      <label
                        className={cn(
                          'text-xs font-semibold',
                          styles.fieldLabel
                        )}
                      >
                        Country
                      </label>
                      <input
                        required
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        type="text"
                        className={fieldClassName}
                        placeholder="Country"
                      />
                    </div>
                  ) : null}
                </div>
                {category === 'Oversea' ? (
                  <div>
                    <label
                      className={cn('text-xs font-semibold', styles.fieldLabel)}
                    >
                      Availability
                    </label>
                    <select
                      value={availability}
                      onChange={(e) => setAvailability(e.target.value)}
                      className={fieldClassName}
                    >
                      <option value="Full-Time">Full-Time</option>
                      <option value="Partial">Partial</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>
                ) : null}
              </div>

              <div className="space-y-4 md:col-span-2">
                <div>
                  <label
                    className={cn('text-xs font-semibold', styles.fieldLabel)}
                  >
                    Player Image
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      type="text"
                      className={cn('flex-1', fieldClassName)}
                      placeholder="Paste URL or upload..."
                    />
                    <label className={uploadControlClassName}>
                      <span className="max-w-[80px] truncate text-xs font-bold">
                        {uploading ? '...' : 'Upload'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>
                  </div>
                  {imageUrl ? (
                    <div className="mt-2 flex items-center gap-2">
                      <div className={cn('h-8 w-8', styles.imagePreview)}>
                        <Image
                          src={imageUrl}
                          alt="Player preview"
                          width={32}
                          height={32}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <span
                        className={cn(
                          'max-w-[220px] truncate text-[10px]',
                          styles.imagePreviewText
                        )}
                      >
                        {imageUrl}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div
                className={cn(
                  'grid grid-cols-1 gap-6 p-4 md:col-span-4 md:grid-cols-2',
                  styles.preBoughtPanel
                )}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="preBought"
                    checked={isPreBought}
                    onChange={(e) => setIsPreBought(e.target.checked)}
                    className={cn(
                      'h-5 w-5 rounded focus:ring-2',
                      styles.checkboxInput
                    )}
                  />
                  <label
                    htmlFor="preBought"
                    className={cn(
                      'text-sm font-black uppercase tracking-tight',
                      styles.checkboxLabel
                    )}
                  >
                    Register as Pre-bought?
                  </label>
                </div>

                {isPreBought || editingPlayerId ? (
                  <div className="flex-1">
                    <label
                      className={cn('text-xs font-semibold', styles.fieldLabel)}
                    >
                      {isPreBought
                        ? 'Assign To Team (Pre-bought)'
                        : 'Manually Assign/Re-assign To Team'}
                    </label>
                    <select
                      value={preBoughtTeamId}
                      onChange={(e) => setPreBoughtTeamId(e.target.value)}
                      className={cn(fieldClassName, styles.preBoughtSelect)}
                    >
                      <option value="">
                        {editingPlayerId ? 'Unassign' : 'Select a team...'}
                      </option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                    <p
                      className={cn(
                        'mt-1 text-[9px] font-bold uppercase tracking-tight',
                        styles.helperText
                      )}
                    >
                      * Changing this for a drafted player will auto-swap
                      budgets and counts.
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="flex justify-end md:col-span-4">
                <button
                  type="submit"
                  className={cn(
                    'theme-button theme-button-primary active:scale-95',
                    styles.primaryButton
                  )}
                >
                  {editingPlayerId ? 'Update Player' : 'Add to Pool'}
                </button>
              </div>
            </form>
          ) : null}
        </section>

        <div className="mb-6 flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <Tabs<'Oversea' | 'Local'>
              value={listCategory}
              onChange={setListCategory}
              options={[
                { value: 'Oversea', label: 'Oversea' },
                { value: 'Local', label: 'Local' },
              ]}
            />

            <button
              onClick={() => handleDeleteAllByCategory(listCategory)}
              className={cn(
                'theme-button theme-button-danger',
                styles.deleteCategoryButton
              )}
            >
              Delete All {listCategory}
            </button>
          </div>

          <div
            className={cn(
              'grid grid-cols-1 items-end gap-4 p-4 md:grid-cols-3',
              styles.filterShell
            )}
          >
            <div className="flex-1">
              <label
                className={cn(
                  'ml-1 text-[10px] font-black',
                  styles.filterLabel
                )}
              >
                Search Player
              </label>
              <div className={styles.searchWrap}>
                <input
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  type="text"
                  placeholder="Name..."
                  className={cn('theme-field text-sm', styles.searchInput)}
                />
                <svg
                  className={cn('h-4 w-4', styles.searchIcon)}
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
            <div>
              <label
                className={cn(
                  'ml-1 text-[10px] font-black',
                  styles.filterLabel
                )}
              >
                Sub-Category
              </label>
              <select
                value={listSubCategory}
                onChange={(e) => setListSubCategory(e.target.value)}
                className={fieldClassName}
              >
                <option value="All">All Categories</option>
                {SUB_CATEGORIES.map((subCategoryOption) => (
                  <option key={subCategoryOption} value={subCategoryOption}>
                    Category {subCategoryOption}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col items-end pb-3 pr-2 text-right text-xs font-black uppercase tracking-tight">
              <div className={styles.filterMeta}>
                Showing {paginatedPlayers.length} / {filteredPlayers.length}
              </div>
              <div
                className={cn('mt-0.5 text-[10px]', styles.filterMetaSecondary)}
              >
                Total pool:{' '}
                {
                  players.filter((player) => player.category === listCategory)
                    .length
                }
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div
              className={cn('h-10 w-full rounded-lg', styles.loadingSkeleton)}
            ></div>
            <div
              className={cn('h-10 w-full rounded-lg', styles.loadingSkeleton)}
            ></div>
            <div
              className={cn('h-10 w-full rounded-lg', styles.loadingSkeleton)}
            ></div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div
              className={cn(
                'hidden overflow-x-auto md:block',
                styles.tableShell
              )}
            >
              <table className="w-full text-left text-sm">
                <thead
                  className={cn(
                    'text-[10px] font-black uppercase',
                    styles.tableHead
                  )}
                >
                  <tr>
                    <th scope="col" className="px-6 py-4">
                      Player Details
                    </th>
                    <th scope="col" className="px-6 py-4">
                      Price / Info
                    </th>
                    <th scope="col" className="px-6 py-4">
                      Draft Status
                    </th>
                    <th scope="col" className="px-6 py-4 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody
                  className={cn('divide-y divide-gray-50', styles.tableBody)}
                >
                  {paginatedPlayers.map((player) => (
                    <tr key={player.id} className={styles.tableRow}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div
                            className={cn(
                              'flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden font-bold',
                              styles.avatarShell
                            )}
                          >
                            {player.imageUrl ? (
                              <Image
                                src={player.imageUrl}
                                alt={`${player.name} photo`}
                                width={40}
                                height={40}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              player.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <div
                              className={cn(
                                'leading-tight font-black',
                                styles.playerName
                              )}
                            >
                              {player.name}
                            </div>
                            <div
                              className={cn(
                                'text-[10px] font-bold uppercase tracking-tight',
                                styles.playerMeta
                              )}
                            >
                              {player.position} • Category {player.subCategory}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div
                          className={cn(
                            'font-mono font-black',
                            styles.priceText
                          )}
                        >
                          {player.category === 'Local'
                            ? `${formatMoney(player.priceBDT || 0)} BDT`
                            : `$${formatMoney(player.priceUSD || 0)}`}
                        </div>
                        {player.country ? (
                          <div
                            className={cn(
                              'text-[10px] font-bold uppercase',
                              styles.infoText
                            )}
                          >
                            {player.country} • {player.availability}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-6 py-4">
                        {player.team ? (
                          <StatusBadge
                            label={player.team.name}
                            tone={player.isPreBought ? 'warning' : 'active'}
                          />
                        ) : (
                          <StatusBadge label="Available" tone="success" />
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => startEdit(player)}
                            className={cn(
                              styles.rowIconButton,
                              styles.rowEditButton
                            )}
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5m-5-5l5 5m0 0l-5 5m5-5H12"
                              ></path>
                            </svg>
                          </button>

                          <label
                            className={cn(
                              'cursor-pointer',
                              styles.rowIconButton,
                              styles.rowUploadButton
                            )}
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              ></path>
                            </svg>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) =>
                                handleRowFileUpload(e, player.id)
                              }
                            />
                          </label>

                          {player.team ? (
                            <button
                              onClick={() => triggerAnimation(player)}
                              className={cn(
                                'theme-button theme-button-info',
                                styles.broadcastButton
                              )}
                            >
                              Broadcast
                            </button>
                          ) : (
                            <div className="flex items-center gap-1">
                              <select
                                disabled={assigningId === player.id}
                                value={''}
                                onChange={(e) =>
                                  handleManualAssign(player.id, e.target.value)
                                }
                                className={cn(
                                  'theme-field',
                                  styles.assignSelect
                                )}
                              >
                                <option value="">Assign To...</option>
                                {teams.map((team) => (
                                  <option key={team.id} value={team.id}>
                                    {team.name}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => deletePlayer(player.id)}
                                className={cn(
                                  styles.rowIconButton,
                                  styles.rowDeleteButton
                                )}
                              >
                                <svg
                                  className="h-3.5 w-3.5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  ></path>
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginatedPlayers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className={cn('py-20 text-center', styles.emptyCell)}
                      >
                        <div className="flex flex-col items-center">
                          <svg
                            className={cn(
                              'mb-2 h-12 w-12',
                              styles.emptyStateIcon
                            )}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                            ></path>
                          </svg>
                          <span
                            className={cn(
                              'text-sm font-bold italic',
                              styles.emptyStateText
                            )}
                          >
                            No players found match your current filters.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">
              {paginatedPlayers.map((player) => (
                <article
                  key={player.id}
                  className={cn('p-3', styles.mobileCard)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'flex h-9 w-9 items-center justify-center overflow-hidden font-bold',
                          styles.avatarShell
                        )}
                      >
                        {player.imageUrl ? (
                          <Image
                            src={player.imageUrl}
                            alt={`${player.name} photo`}
                            width={36}
                            height={36}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-bold">
                            {player.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div>
                        <p
                          className={cn(
                            'text-sm font-black',
                            styles.playerName
                          )}
                        >
                          {player.name}
                        </p>
                        <p
                          className={cn(
                            'text-[10px] font-bold uppercase',
                            styles.playerMeta
                          )}
                        >
                          {player.position} • {player.subCategory}
                        </p>
                      </div>
                    </div>
                    {player.team ? (
                      <StatusBadge
                        label={player.team.name}
                        tone={player.isPreBought ? 'warning' : 'active'}
                      />
                    ) : (
                      <StatusBadge label="Available" tone="success" />
                    )}
                  </div>

                  <p
                    className={cn('mt-2 text-xs font-bold', styles.mobilePrice)}
                  >
                    {player.category === 'Local'
                      ? `${formatMoney(player.priceBDT || 0)} BDT`
                      : `$${formatMoney(player.priceUSD || 0)}`}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => startEdit(player)}
                      className={cn(
                        'theme-button theme-button-secondary',
                        styles.mobileActionButton
                      )}
                    >
                      Edit
                    </button>
                    <label
                      className={cn(
                        'theme-button theme-button-secondary cursor-pointer',
                        styles.mobileActionButton
                      )}
                    >
                      Photo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleRowFileUpload(e, player.id)}
                      />
                    </label>
                    {player.team ? (
                      <button
                        onClick={() => triggerAnimation(player)}
                        className={cn(
                          'theme-button theme-button-info',
                          styles.mobileActionButton
                        )}
                      >
                        Broadcast
                      </button>
                    ) : (
                      <select
                        disabled={assigningId === player.id}
                        value={''}
                        onChange={(e) =>
                          handleManualAssign(player.id, e.target.value)
                        }
                        className={cn('theme-field', styles.assignSelect)}
                      >
                        <option value="">Assign To...</option>
                        {teams.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                    )}
                    {!player.team ? (
                      <button
                        onClick={() => deletePlayer(player.id)}
                        className={cn(
                          'theme-button theme-button-danger',
                          styles.mobileActionButton
                        )}
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>

            {totalPages > 1 ? (
              <div
                className={cn(
                  'flex items-center justify-between p-4',
                  styles.paginationShell
                )}
              >
                <div
                  className={cn(
                    'text-xs font-black uppercase tracking-widest',
                    styles.paginationText
                  )}
                >
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                    className={cn(
                      'theme-button theme-button-secondary',
                      styles.paginationButton
                    )}
                  >
                    Previous
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      setCurrentPage((page) => Math.min(totalPages, page + 1))
                    }
                    className={cn(
                      'theme-button theme-button-secondary',
                      styles.paginationButton
                    )}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function StatPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'neutral' | 'active' | 'warning' | 'danger' | 'success';
}) {
  const toneClassName = {
    neutral: styles.statPillNeutral,
    active: styles.statPillActive,
    warning: styles.statPillWarning,
    danger: styles.statPillWarning,
    success: styles.statPillSuccess,
  };

  return (
    <div className={cn('px-3 py-2', styles.statPill, toneClassName[tone])}>
      <p className="stat-label">{label}</p>
      <div className="mt-1 flex items-center justify-between">
        <p className={cn('text-xl font-black', styles.statValue)}>{value}</p>
        <StatusBadge
          label={label}
          tone={tone}
          className="px-2 py-0.5 text-[9px]"
        />
      </div>
    </div>
  );
}
