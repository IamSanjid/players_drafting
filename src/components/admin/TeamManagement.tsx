'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

import { useAdminToast } from '@/components/admin/AdminToastProvider';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { teamsApi, uploadApi } from '@/lib/api';
import type { TeamUpdatePayload } from '@/lib/api';
import { formatMoney } from '@/lib/ui';
import { getSocket } from '@/lib/socketClient';
import { useDraftStore } from '@/lib/draftStore';
import type { ApiPlayer, ApiTeam } from '@/types/domain';

export default function TeamManagement() {
  const teams = useDraftStore((state) => state.teams);
  const draftSession = useDraftStore((state) => state.session);
  const loading = useDraftStore((state) => state.loading);
  const fetchAll = useDraftStore((state) => state.fetchAll);

  // New Team State
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamPassword, setNewTeamPassword] = useState('');
  const [newTeamBudgetBDT, setNewTeamBudgetBDT] = useState('');
  const [newTeamBudgetUSD, setNewTeamBudgetUSD] = useState('');
  const [newTeamLogo, setNewTeamLogo] = useState('');
  const [newTeamBanner, setNewTeamBanner] = useState('');
  const [uploading, setUploading] = useState<string | null>(null);
  const [teamSearch, setTeamSearch] = useState('');
  const [savingTeamId, setSavingTeamId] = useState<string | null>(null);
  const { pushSuccess, pushError } = useAdminToast();

  const socket = getSocket();

  useEffect(() => {
    if (!draftSession && teams.length === 0) {
      void fetchAll();
    }
  }, [fetchAll, draftSession, teams.length]);

  const handleAddTeam = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (draftSession?.draftStatus === 'active') {
      alert('Draft is active. You cannot add new teams.');
      return;
    }
    const nextSerial =
      teams.length > 0 ? Math.max(...teams.map((t) => t.serialNumber)) + 1 : 1;

    const res = await teamsApi.create({
      name: newTeamName,
      password: newTeamPassword,
      serialNumber: nextSerial,
      budgetBDT: newTeamBudgetBDT,
      budgetUSD: newTeamBudgetUSD,
      logoUrl: newTeamLogo,
      bannerUrl: newTeamBanner,
    });

    if (!res.ok) {
      pushError(res.error ?? 'Failed to add team.');
      return;
    }

    await fetchAll({ silent: true, force: true });
    socket.emit('state_changed');
    pushSuccess('Team added successfully.');

    // Reset form
    setNewTeamName('');
    setNewTeamPassword('');
    setNewTeamBudgetBDT('');
    setNewTeamBudgetUSD('');
    setNewTeamLogo('');
    setNewTeamBanner('');
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'logo' | 'banner'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return null;

    setUploading(type);

    try {
      const res = await uploadApi.uploadFile(file, type);
      return res.ok ? res.data : null;
    } catch (err: unknown) {
      console.error('Upload failed', err);
    } finally {
      setUploading(null);
    }
    return null;
  };

  const handleNewTeamFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'logo' | 'banner'
  ) => {
    const data = await handleFileUpload(e, type);
    if (data && data.url) {
      if (type === 'logo') setNewTeamLogo(data.url);
      else setNewTeamBanner(data.url);
      pushSuccess(
        `${type === 'logo' ? 'Logo' : 'Banner'} uploaded for new team.`
      );
    }
  };

  const handleRowFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    teamId: string,
    type: 'logo' | 'banner'
  ) => {
    const data = await handleFileUpload(e, type);
    if (data && data.url) {
      await updateTeam(teamId, {
        [type === 'logo' ? 'logoUrl' : 'bannerUrl']: data.url,
      });
    }
  };

  const updateTeam = async (id: string, updates: TeamUpdatePayload) => {
    setSavingTeamId(id);
    try {
      const res = await teamsApi.update(id, updates);
      if (!res.ok) {
        pushError(res.error ?? 'Failed to update team.');
        return;
      }
      await fetchAll({ silent: true, force: true });
      socket.emit('state_changed');
      pushSuccess('Team updated.');
    } finally {
      setSavingTeamId(null);
    }
  };

  const deleteTeam = async (id: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return;
    const res = await teamsApi.remove(id);
    if (!res.ok) {
      pushError('Failed to delete team.');
      return;
    }
    await fetchAll({ silent: true, force: true });
    socket.emit('state_changed');
    pushSuccess('Team deleted.');
  };

  const handleExportCSV = (team: ApiTeam) => {
    const players: ApiPlayer[] = team.players || [];

    // Header
    let csv = `Team Report: ${team.name}\n\n`;

    csv += `Player Name,Country,Category,Sub-Category,Position,Price (BDT),Price (USD),Status\n`;

    let totalSpentBDT = BigInt(0);
    let totalSpentUSD = BigInt(0);

    players.forEach((p) => {
      const priceBDT = p.isPreBought ? BigInt(0) : BigInt(p.priceBDT || 0);
      const priceUSD = p.isPreBought ? BigInt(0) : BigInt(p.priceUSD || 0);
      const country = p.category === 'Local' ? 'BD' : p.country || '';

      totalSpentBDT += priceBDT;
      totalSpentUSD += priceUSD;

      const status = p.isPreBought ? 'Pre-Bought' : 'Drafted';

      csv += `"${p.name}",${country},"${p.category}","${p.subCategory}","${p.position}",${priceBDT},${priceUSD},"${status}"\n`;
    });

    // Server stores "current left" budget.
    const leftBudgetBDT = BigInt(team.budgetBDT);
    const leftBudgetUSD = BigInt(team.budgetUSD);

    csv += `\nSUMMARY\n`;
    csv += `Total Spent (BDT),${totalSpentBDT}\n`;
    csv += `Left Budget (BDT),${leftBudgetBDT}\n`;
    csv += `Total Spent (USD),${totalSpentUSD}\n`;
    csv += `Left Budget (USD),${leftBudgetUSD}\n`;

    // Create and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `${team.name.replace(/\s+/g, '_')}_Report.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredTeams = [...teams]
    .sort((a, b) => a.serialNumber - b.serialNumber)
    .filter((team) =>
      team.name.toLowerCase().includes(teamSearch.trim().toLowerCase())
    );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex items-center justify-between gap-4 bg-slate-50">
        <div>
          <h2 className="text-xl font-black text-slate-900">Team Management</h2>
          <p className="mt-1 text-sm text-slate-600">
            Manage franchises and budgets
          </p>
        </div>
      </CardHeader>

      <CardBody>
        <form
          onSubmit={handleAddTeam}
          className="mb-8 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-6"
        >
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Team Name
            </label>
            <input
              required
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              type="text"
              className="w-full bg-white border border-gray-300 text-sm rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. Dhaka Dominators"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              BDT Budget
            </label>
            <input
              required
              value={newTeamBudgetBDT}
              onChange={(e) => setNewTeamBudgetBDT(e.target.value)}
              type="number"
              className="w-full bg-white border border-gray-300 text-sm rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              USD Budget
            </label>
            <input
              required
              value={newTeamBudgetUSD}
              onChange={(e) => setNewTeamBudgetUSD(e.target.value)}
              type="number"
              className="w-full bg-white border border-gray-300 text-sm rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Password
            </label>
            <input
              required
              value={newTeamPassword}
              onChange={(e) => setNewTeamPassword(e.target.value)}
              type="text"
              className="w-full bg-white border border-gray-300 text-sm rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Secret"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Logo URL (or Upload)
            </label>
            <div className="flex gap-2">
              <input
                value={newTeamLogo}
                onChange={(e) => setNewTeamLogo(e.target.value)}
                type="text"
                className="flex-1 bg-white border border-gray-300 text-sm rounded-lg p-2.5"
                placeholder="Logo path..."
              />
              <label className="cursor-pointer bg-white border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                {uploading === 'logo' ? '...' : 'Upload'}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleNewTeamFileUpload(e, 'logo')}
                />
              </label>
            </div>
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Banner URL (or Upload)
            </label>
            <div className="flex gap-2">
              <input
                value={newTeamBanner}
                onChange={(e) => setNewTeamBanner(e.target.value)}
                type="text"
                className="flex-1 bg-white border border-gray-300 text-sm rounded-lg p-2.5"
                placeholder="Banner path..."
              />
              <label className="cursor-pointer bg-white border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                {uploading === 'banner' ? '...' : 'Upload'}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleNewTeamFileUpload(e, 'banner')}
                />
              </label>
            </div>
          </div>

          <div className="md:col-span-6 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-md shadow-blue-200"
            >
              Add Team
            </button>
          </div>
        </form>

        <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-3 md:items-end">
          <div className="md:col-span-2">
            <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">
              Search Team
            </label>
            <input
              value={teamSearch}
              onChange={(e) => setTeamSearch(e.target.value)}
              placeholder="Search by franchise name..."
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
            />
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Showing {filteredTeams.length} / {teams.length}
            </p>
            {savingTeamId ? (
              <p className="mt-1 text-xs font-semibold text-sky-700">
                Saving team changes...
              </p>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-12 w-full rounded-lg bg-slate-100"></div>
            <div className="h-12 w-full rounded-lg bg-slate-100"></div>
            <div className="h-12 w-full rounded-lg bg-slate-100"></div>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
              <table className="w-full text-sm text-left text-gray-500">
                <thead className="rounded-t-lg bg-slate-50 text-xs uppercase text-slate-700">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      Serial
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Team Name / Branding
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Budget (BDT)
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Budget (USD)
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeams.map((team) => (
                    <tr
                      key={team.id}
                      className="border-b hover:bg-gray-100 transition duration-150 group"
                    >
                      <td className="px-4 py-4 font-medium text-gray-900">
                        <span className="inline-flex items-center px-2 py-1 rounded bg-indigo-50 text-indigo-700 font-black min-w-[50px] justify-center">
                          {team.serialNumber}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-gray-100 border flex flex-shrink-0 items-center justify-center overflow-hidden">
                            {team.logoUrl ? (
                              <Image
                                src={team.logoUrl}
                                alt={`${team.name} logo`}
                                width={40}
                                height={40}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <span className="text-[10px] font-bold text-gray-400">
                                LOGO
                              </span>
                            )}
                          </div>
                          <div>
                            <input
                              type="text"
                              defaultValue={team.name}
                              onBlur={(e) => {
                                const next = e.target.value.trim();
                                if (next && next !== team.name) {
                                  void updateTeam(team.id, { name: next });
                                }
                              }}
                              className="w-full min-w-44 rounded border border-slate-200 bg-white px-2 py-1 text-sm font-bold text-slate-900"
                              aria-label={`Team name for ${team.name}`}
                            />
                            <div className="mt-1 flex items-center gap-2">
                              <StatusBadge
                                label={`${team.players?.length ?? 0} players`}
                                tone="active"
                                className="px-2 py-0.5 text-[9px]"
                              />
                            </div>
                            <div className="flex gap-2 mt-1">
                              <label className="text-[10px] uppercase font-bold text-blue-500 cursor-pointer hover:underline">
                                Set Logo
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={(e) =>
                                    handleRowFileUpload(e, team.id, 'logo')
                                  }
                                />
                              </label>
                              <label className="text-[10px] uppercase font-bold text-indigo-500 cursor-pointer hover:underline">
                                Set Banner
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={(e) =>
                                    handleRowFileUpload(e, team.id, 'banner')
                                  }
                                />
                              </label>
                            </div>
                            {team.bannerUrl && (
                              <div className="text-[8px] text-gray-400 truncate max-w-[120px] mt-0.5">
                                Banner: Set
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="number"
                          defaultValue={team.budgetBDT}
                          onBlur={(e) =>
                            void updateTeam(team.id, {
                              budgetBDT: e.target.value,
                            })
                          }
                          className="w-28 rounded border border-slate-300 px-2 py-1"
                        />
                        <p className="mt-1 text-[10px] font-semibold text-slate-500">
                          {formatMoney(team.budgetBDT)} BDT left
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="number"
                          defaultValue={team.budgetUSD}
                          onBlur={(e) =>
                            void updateTeam(team.id, {
                              budgetUSD: e.target.value,
                            })
                          }
                          className="w-28 rounded border border-slate-300 px-2 py-1"
                        />
                        <p className="mt-1 text-[10px] font-semibold text-slate-500">
                          {formatMoney(team.budgetUSD)} USD left
                        </p>
                      </td>
                      <td className="px-4 py-4 text-right flex items-center justify-end gap-3">
                        <button
                          onClick={() => handleExportCSV(team)}
                          className="text-indigo-600 hover:text-indigo-800 font-bold text-xs bg-indigo-50 px-2 py-1 rounded"
                        >
                          Export
                        </button>
                        <button
                          onClick={() => deleteTeam(team.id)}
                          className="text-red-500 hover:text-red-700 font-medium text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredTeams.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="text-center py-8 text-gray-500"
                      >
                        No teams match the current search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">
              {filteredTeams.map((team) => (
                <article
                  key={team.id}
                  className="rounded-xl border border-slate-200 bg-white p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                        {team.logoUrl ? (
                          <Image
                            src={team.logoUrl}
                            alt={`${team.name} logo`}
                            width={36}
                            height={36}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <span className="text-[9px] font-bold text-slate-400">
                            LOGO
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900">
                          {team.name}
                        </p>
                        <p className="text-[10px] font-bold uppercase text-slate-500">
                          Serial #{team.serialNumber}
                        </p>
                      </div>
                    </div>
                    <StatusBadge
                      label={`${team.players?.length ?? 0} players`}
                      tone="active"
                      className="px-2 py-0.5 text-[9px]"
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      defaultValue={team.budgetBDT}
                      onBlur={(e) =>
                        void updateTeam(team.id, { budgetBDT: e.target.value })
                      }
                      className="rounded border border-slate-300 px-2 py-1 text-xs"
                      aria-label={`BDT budget for ${team.name}`}
                    />
                    <input
                      type="number"
                      defaultValue={team.budgetUSD}
                      onBlur={(e) =>
                        void updateTeam(team.id, { budgetUSD: e.target.value })
                      }
                      className="rounded border border-slate-300 px-2 py-1 text-xs"
                      aria-label={`USD budget for ${team.name}`}
                    />
                  </div>

                  <p className="mt-2 text-[10px] font-semibold text-slate-500">
                    Left: {formatMoney(team.budgetBDT)} BDT /{' '}
                    {formatMoney(team.budgetUSD)} USD
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleExportCSV(team)}
                      className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-bold uppercase text-indigo-700"
                    >
                      Export
                    </button>
                    <button
                      onClick={() => deleteTeam(team.id)}
                      className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-bold uppercase text-rose-700"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}
