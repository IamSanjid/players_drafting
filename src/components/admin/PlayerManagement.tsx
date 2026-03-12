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
import { formatMoney } from '@/lib/ui';
import { getSocket } from '@/lib/socketClient';
import { useDraftStore } from '@/lib/draftStore';
import type { ApiPlayer, ApiTeam, PlayerCategory } from '@/types/domain';

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

  // State for list filtering
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

  // Reset to page 1 on filter changes
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
    if (!confirm('Delete player?')) return;
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
    )
      return;
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
    if (!file) return;

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
    if (!file) return;

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

  const filteredPlayers = players.filter((p) => {
    if (p.category !== listCategory) return false;
    if (listSubCategory !== 'All' && p.subCategory !== listSubCategory)
      return false;
    if (listSearch && !p.name.toLowerCase().includes(listSearch.toLowerCase()))
      return false;
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
    if (!teamId) return;

    if (
      !confirm(
        `Are you sure you want to assign this player? This will update budgets and counts.`
      )
    ) {
      // Logic to reset dropdown would be nice but simple refresh/alert is fine
      return;
    }

    setAssigningId(playerId);
    try {
      const res = await playersApi.assign(playerId, teamId);

      if (res.ok) {
        // Trigger latest pick animation
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

  return (
    <Card className="overflow-hidden">
      <div ref={playerManagementRootRef} />
      <CardHeader className="flex items-center justify-between gap-4 bg-slate-50">
        <div>
          <h2 className="text-xl font-black text-slate-900">
            Player Management
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Add players to the draft pool or register pre-bought contracts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge label={`${players.length} total`} tone="active" />
          <button
            onClick={() => setShowCsvUploader(!showCsvUploader)}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${
              showCsvUploader
                ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                : 'border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
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

        {showCsvUploader && (
          <div className="mb-8 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 p-1">
            <CSVBulkUploader
              onImportComplete={() => {
                void fetchAll({ silent: true, force: true });
                setShowCsvUploader(false);
              }}
            />
          </div>
        )}

        <section className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">
                {editingPlayerId ? 'Edit Player' : 'Add New Player'}
              </h3>
              <p className="text-xs font-semibold text-slate-500">
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
                  className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100"
                >
                  Cancel Edit
                </button>
              ) : null}
              <button
                type="button"
                aria-expanded={isPlayerFormExpanded}
                aria-controls="player-form-panel"
                onClick={() => setIsPlayerFormExpanded((current) => !current)}
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100"
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
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Name
                </label>
                <input
                  ref={playerNameInputRef}
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  type="text"
                  className="w-full bg-white border border-gray-300 text-sm rounded-lg p-2.5"
                  placeholder="Player Name"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as PlayerCategory)
                  }
                  className="w-full bg-white border border-gray-300 text-sm rounded-lg p-2.5"
                >
                  <option value="Oversea">Oversea</option>
                  <option value="Local">Local</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Sub-Category
                </label>
                <select
                  value={subCategory}
                  onChange={(e) => setSubCategory(e.target.value)}
                  className="w-full bg-white border border-gray-300 text-sm rounded-lg p-2.5"
                >
                  {SUB_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      Category {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Position
                </label>
                <input
                  required
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  type="text"
                  className="w-full bg-white border border-gray-300 text-sm rounded-lg p-2.5"
                  placeholder="e.g. Batsman"
                />
              </div>

              <div className="flex flex-col gap-4 md:col-span-2">
                <div className="grid grid-cols-2 gap-4">
                  {category === 'Local' ? (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        Price (BDT)
                      </label>
                      <input
                        required
                        value={priceBDT}
                        onChange={(e) => setPriceBDT(e.target.value)}
                        type="number"
                        className="w-full bg-white border border-gray-300 text-sm rounded-lg p-2.5"
                        placeholder="0"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        Price (USD)
                      </label>
                      <input
                        required
                        value={priceUSD}
                        onChange={(e) => setPriceUSD(e.target.value)}
                        type="number"
                        className="w-full bg-white border border-gray-300 text-sm rounded-lg p-2.5"
                        placeholder="0"
                      />
                    </div>
                  )}
                  {category === 'Oversea' && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        Country
                      </label>
                      <input
                        required
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        type="text"
                        className="w-full bg-white border border-gray-300 text-sm rounded-lg p-2.5"
                        placeholder="Country"
                      />
                    </div>
                  )}
                </div>
                {category === 'Oversea' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      Availability
                    </label>
                    <select
                      value={availability}
                      onChange={(e) => setAvailability(e.target.value)}
                      className="w-full bg-white border border-gray-300 text-sm rounded-lg p-2.5"
                    >
                      <option value="Full-Time">Full-Time</option>
                      <option value="Partial">Partial</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="md:col-span-2 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Player Image
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      type="text"
                      className="flex-1 bg-white border border-gray-300 text-sm rounded-lg p-2.5"
                      placeholder="Paste URL or upload..."
                    />
                    <label className="cursor-pointer bg-white border border-gray-300 p-2.5 rounded-lg hover:bg-gray-100 transition shadow-sm flex items-center justify-center min-w-[100px]">
                      <span className="text-xs font-bold text-gray-600 truncate max-w-[80px]">
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
                  {imageUrl && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="w-8 h-8 rounded border overflow-hidden">
                        <Image
                          src={imageUrl}
                          alt="Player preview"
                          width={32}
                          height={32}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="max-w-[220px] truncate text-[10px] text-gray-400">
                        {imageUrl}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="preBought"
                    checked={isPreBought}
                    onChange={(e) => setIsPreBought(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <label
                    htmlFor="preBought"
                    className="text-sm font-black text-gray-700 uppercase tracking-tight"
                  >
                    Register as Pre-bought?
                  </label>
                </div>

                {(isPreBought || editingPlayerId) && (
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      {isPreBought
                        ? 'Assign To Team (Pre-bought)'
                        : 'Manually Assign/Re-assign To Team'}
                    </label>
                    <select
                      value={preBoughtTeamId}
                      onChange={(e) => setPreBoughtTeamId(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 text-sm rounded-lg p-2.5 font-bold italic text-blue-800"
                    >
                      <option value="">
                        {editingPlayerId ? 'Unassign' : 'Select a team...'}
                      </option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-[9px] text-gray-400 mt-1 uppercase font-bold tracking-tight">
                      * Changing this for a drafted player will auto-swap
                      budgets and counts.
                    </p>
                  </div>
                )}
              </div>

              <div className="md:col-span-4 flex justify-end">
                <button
                  type="submit"
                  className="rounded-xl bg-blue-700 px-8 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-blue-200 transition hover:bg-blue-800 active:scale-95"
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
              className="text-red-500 border border-red-200 bg-red-50 px-4 py-2 rounded-lg text-xs font-black uppercase hover:bg-red-100 transition"
            >
              Delete All {listCategory}
            </button>
          </div>

          <div className="grid grid-cols-1 items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3">
            <div className="flex-1">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                Search Player
              </label>
              <div className="relative">
                <input
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  type="text"
                  placeholder="Name..."
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm"
                />
                <svg
                  className="w-4 h-4 text-gray-400 absolute left-3 top-2.5"
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
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                Sub-Category
              </label>
              <select
                value={listSubCategory}
                onChange={(e) => setListSubCategory(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-sm rounded-lg p-2 transition hover:border-gray-300"
              >
                <option value="All">All Categories</option>
                {SUB_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    Category {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-right text-xs font-black text-gray-400 uppercase tracking-tight pb-3 pr-2 flex flex-col items-end">
              <div>
                Showing {paginatedPlayers.length} / {filteredPlayers.length}
              </div>
              <div className="text-[10px] text-gray-300 mt-0.5">
                Total pool:{' '}
                {players.filter((p) => p.category === listCategory).length}
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-10 w-full rounded-lg bg-gray-100"></div>
            <div className="h-10 w-full rounded-lg bg-gray-100"></div>
            <div className="h-10 w-full rounded-lg bg-gray-100"></div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 shadow-sm md:block">
              <table className="w-full text-sm text-left">
                <thead className="border-b border-slate-100 bg-slate-50 text-[10px] font-black uppercase text-slate-500">
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
                <tbody className="divide-y divide-gray-50">
                  {paginatedPlayers.map((player) => (
                    <tr
                      key={player.id}
                      className="group bg-white transition hover:bg-blue-50/30"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0 border overflow-hidden flex items-center justify-center font-bold text-gray-400 shadow-sm border-white">
                            {player.imageUrl ? (
                              <Image
                                src={player.imageUrl}
                                alt={`${player.name} photo`}
                                width={40}
                                height={40}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              player.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <div className="font-black text-gray-900 leading-tight">
                              {player.name}
                            </div>
                            <div className="text-[10px] font-bold uppercase tracking-tight text-gray-400">
                              {player.position} • Category {player.subCategory}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-mono font-black text-indigo-600">
                          {player.category === 'Local'
                            ? `${formatMoney(player.priceBDT || 0)} BDT`
                            : `$${formatMoney(player.priceUSD || 0)}`}
                        </div>
                        {player.country && (
                          <div className="text-[10px] text-gray-400 font-bold uppercase">
                            {player.country} • {player.availability}
                          </div>
                        )}
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
                            className="p-2 text-gray-400 hover:text-blue-600 transition hover:bg-blue-50 rounded-lg group-hover:bg-white/50"
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
                                d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5m-5-5l5 5m0 0l-5 5m5-5H12"
                              ></path>
                            </svg>
                          </button>

                          <label className="p-2 text-gray-400 hover:text-emerald-600 transition hover:bg-emerald-50 rounded-lg group-hover:bg-white/50 cursor-pointer">
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
                              className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-tighter transition shadow-sm border border-indigo-100"
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
                                className="w-28 cursor-pointer rounded border border-gray-200 bg-white px-2 py-1 text-[10px] font-bold uppercase transition hover:border-blue-300"
                              >
                                <option value="">Assign To...</option>
                                {teams.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => deletePlayer(player.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 transition hover:bg-red-50 rounded-lg"
                              >
                                <svg
                                  className="w-3.5 h-3.5"
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
                  {paginatedPlayers.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="bg-gray-50/50 py-20 text-center"
                      >
                        <div className="flex flex-col items-center">
                          <svg
                            className="w-12 h-12 text-gray-200 mb-2"
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
                          <span className="text-sm font-bold italic text-gray-400">
                            No players found match your current filters.
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">
              {paginatedPlayers.map((player) => (
                <article
                  key={player.id}
                  className="rounded-xl border border-slate-200 bg-white p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                        {player.imageUrl ? (
                          <Image
                            src={player.imageUrl}
                            alt={`${player.name} photo`}
                            width={36}
                            height={36}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-500">
                            {player.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900">
                          {player.name}
                        </p>
                        <p className="text-[10px] font-bold uppercase text-slate-500">
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

                  <p className="mt-2 text-xs font-bold text-indigo-700">
                    {player.category === 'Local'
                      ? `${formatMoney(player.priceBDT || 0)} BDT`
                      : `$${formatMoney(player.priceUSD || 0)}`}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => startEdit(player)}
                      className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold uppercase text-slate-700"
                    >
                      Edit
                    </button>
                    <label className="cursor-pointer rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase text-emerald-700">
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
                        className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-bold uppercase text-indigo-700"
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
                        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[10px] font-bold uppercase"
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
                        className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-bold uppercase text-rose-700"
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="text-xs font-black uppercase tracking-widest text-gray-400">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-black uppercase text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition shadow-sm"
                  >
                    Previous
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-black uppercase text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition shadow-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
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
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="stat-label">{label}</p>
      <div className="mt-1 flex items-center justify-between">
        <p className="text-xl font-black text-slate-900">{value}</p>
        <StatusBadge
          label={label}
          tone={tone}
          className="px-2 py-0.5 text-[9px]"
        />
      </div>
    </div>
  );
}
