'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

import { useAdminToast } from '@/components/admin/AdminToastProvider';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { teamsApi, uploadApi } from '@/lib/api';
import type { TeamUpdatePayload } from '@/lib/api';
import { cn, formatMoney } from '@/lib/ui';
import { getSocket } from '@/lib/socketClient';
import { useDraftStore } from '@/lib/draftStore';
import type { ApiPlayer, ApiTeam } from '@/types/domain';
import styles from './TeamManagement.module.css';

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

  const handleAddTeam = async (e: React.SubmitEvent<HTMLFormElement>) => {
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
  const fieldClassName = cn('theme-field', styles.fieldInput);

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className={cn(
          'theme-toolbar flex items-center justify-between gap-4',
          styles.cardHeader
        )}
      >
        <div>
          <h2 className={cn('text-xl font-black', styles.headerTitle)}>
            Team Management
          </h2>
          <p className={cn('mt-1 text-sm', styles.headerSubtitle)}>
            Manage franchises and budgets
          </p>
        </div>
      </CardHeader>

      <CardBody>
        <form
          onSubmit={handleAddTeam}
          className={cn(
            'mb-8 grid grid-cols-1 gap-4 p-4 md:grid-cols-6',
            styles.formShell
          )}
        >
          <div className="md:col-span-2">
            <label
              className={cn(
                'mb-1 block text-xs font-semibold tracking-wider',
                styles.fieldLabel
              )}
            >
              Team Name
            </label>
            <input
              required
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              type="text"
              className={fieldClassName}
              placeholder="e.g. Dhaka Dominators"
            />
          </div>
          <div>
            <label
              className={cn(
                'mb-1 block text-xs font-semibold tracking-wider',
                styles.fieldLabel
              )}
            >
              BDT Budget
            </label>
            <input
              required
              value={newTeamBudgetBDT}
              onChange={(e) => setNewTeamBudgetBDT(e.target.value)}
              type="number"
              className={fieldClassName}
              placeholder="0"
            />
          </div>
          <div>
            <label
              className={cn(
                'mb-1 block text-xs font-semibold tracking-wider',
                styles.fieldLabel
              )}
            >
              USD Budget
            </label>
            <input
              required
              value={newTeamBudgetUSD}
              onChange={(e) => setNewTeamBudgetUSD(e.target.value)}
              type="number"
              className={fieldClassName}
              placeholder="0"
            />
          </div>
          <div>
            <label
              className={cn(
                'mb-1 block text-xs font-semibold tracking-wider',
                styles.fieldLabel
              )}
            >
              Password
            </label>
            <input
              required
              value={newTeamPassword}
              onChange={(e) => setNewTeamPassword(e.target.value)}
              type="text"
              className={fieldClassName}
              placeholder="Secret"
            />
          </div>

          <div className="md:col-span-3">
            <label
              className={cn(
                'mb-1 block text-xs font-semibold tracking-wider',
                styles.fieldLabel
              )}
            >
              Logo URL (or Upload)
            </label>
            <div className="flex gap-2">
              <input
                value={newTeamLogo}
                onChange={(e) => setNewTeamLogo(e.target.value)}
                type="text"
                className={cn(fieldClassName, 'flex-1')}
                placeholder="Logo path..."
              />
              <label
                className={cn(
                  'theme-button px-3 py-2 text-xs font-bold',
                  styles.uploadButton
                )}
              >
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
            <label
              className={cn(
                'mb-1 block text-xs font-semibold tracking-wider',
                styles.fieldLabel
              )}
            >
              Banner URL (or Upload)
            </label>
            <div className="flex gap-2">
              <input
                value={newTeamBanner}
                onChange={(e) => setNewTeamBanner(e.target.value)}
                type="text"
                className={cn(fieldClassName, 'flex-1')}
                placeholder="Banner path..."
              />
              <label
                className={cn(
                  'theme-button px-3 py-2 text-xs font-bold',
                  styles.uploadButton
                )}
              >
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
              className={cn(
                'theme-button theme-button-primary font-medium',
                styles.primaryButton
              )}
            >
              Add Team
            </button>
          </div>
        </form>

        <div
          className={cn(
            'mb-4 grid grid-cols-1 gap-3 p-3 md:grid-cols-3 md:items-end',
            styles.searchShell
          )}
        >
          <div className="md:col-span-2">
            <label
              className={cn(
                'mb-1 block text-[10px] font-black uppercase tracking-wider',
                styles.searchLabel
              )}
            >
              Search Team
            </label>
            <input
              value={teamSearch}
              onChange={(e) => setTeamSearch(e.target.value)}
              placeholder="Search by franchise name..."
              className={fieldClassName}
            />
          </div>
          <div className="text-right">
            <p
              className={cn(
                'text-[10px] font-black uppercase tracking-wider',
                styles.counterText
              )}
            >
              Showing {filteredTeams.length} / {teams.length}
            </p>
            {savingTeamId ? (
              <p
                className={cn('mt-1 text-xs font-semibold', styles.savingText)}
              >
                Saving team changes...
              </p>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div
              className={cn('h-12 w-full rounded-lg', styles.skeleton)}
            ></div>
            <div
              className={cn('h-12 w-full rounded-lg', styles.skeleton)}
            ></div>
            <div
              className={cn('h-12 w-full rounded-lg', styles.skeleton)}
            ></div>
          </div>
        ) : (
          <>
            <div
              className={cn(
                'hidden overflow-x-auto md:block',
                styles.tableShell
              )}
            >
              <table className={cn('w-full text-left text-sm', styles.table)}>
                <thead
                  className={cn(
                    'rounded-t-lg text-xs uppercase',
                    styles.tableHead
                  )}
                >
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
                      className={cn(
                        'group border-b duration-150',
                        styles.tableRow
                      )}
                    >
                      <td className="px-4 py-4 font-medium">
                        <span
                          className={cn(
                            'inline-flex min-w-[50px] items-center justify-center px-2 py-1 font-black',
                            styles.serialBadge
                          )}
                        >
                          {team.serialNumber}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden',
                              styles.logoShell
                            )}
                          >
                            {team.logoUrl ? (
                              <Image
                                src={team.logoUrl}
                                alt={`${team.name} logo`}
                                width={40}
                                height={40}
                                className="w-full h-full object-contain"
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
                              className={cn(
                                'theme-field w-full text-sm',
                                styles.teamNameInput
                              )}
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
                              <label
                                className={cn(
                                  'cursor-pointer text-[10px] font-bold uppercase',
                                  styles.mediaLink
                                )}
                              >
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
                              <label
                                className={cn(
                                  'cursor-pointer text-[10px] font-bold uppercase',
                                  styles.mediaLinkSecondary
                                )}
                              >
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
                              <div
                                className={cn(
                                  'mt-0.5 max-w-[120px] truncate text-[8px]',
                                  styles.helperText
                                )}
                              >
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
                          className={cn('theme-field', styles.budgetField)}
                        />
                        <p
                          className={cn(
                            'mt-1 text-[10px] font-semibold',
                            styles.budgetText
                          )}
                        >
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
                          className={cn('theme-field', styles.budgetField)}
                        />
                        <p
                          className={cn(
                            'mt-1 text-[10px] font-semibold',
                            styles.budgetText
                          )}
                        >
                          {formatMoney(team.budgetUSD)} USD left
                        </p>
                      </td>
                      <td className={cn('px-4 py-4', styles.actionBar)}>
                        <button
                          onClick={() => handleExportCSV(team)}
                          className={cn(
                            'theme-button theme-button-info font-bold',
                            styles.exportButton
                          )}
                        >
                          Export
                        </button>
                        <button
                          onClick={() => deleteTeam(team.id)}
                          className={cn(
                            'theme-button theme-button-danger font-medium',
                            styles.deleteButton
                          )}
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
                        className={cn('py-8 text-center', styles.emptyState)}
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
                <article key={team.id} className={cn('p-3', styles.mobileCard)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'flex h-9 w-9 items-center justify-center overflow-hidden',
                          styles.logoShell
                        )}
                      >
                        {team.logoUrl ? (
                          <Image
                            src={team.logoUrl}
                            alt={`${team.name} logo`}
                            width={36}
                            height={36}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <span
                            className={cn(
                              'text-[9px] font-bold',
                              styles.logoPlaceholder
                            )}
                          >
                            LOGO
                          </span>
                        )}
                      </div>
                      <div>
                        <p
                          className={cn(
                            'text-sm font-black',
                            styles.headerTitle
                          )}
                        >
                          {team.name}
                        </p>
                        <p
                          className={cn(
                            'text-[10px] font-bold uppercase',
                            styles.mobileMeta
                          )}
                        >
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
                      className={cn(
                        'theme-field text-xs',
                        styles.mobileBudgetField
                      )}
                      aria-label={`BDT budget for ${team.name}`}
                    />
                    <input
                      type="number"
                      defaultValue={team.budgetUSD}
                      onBlur={(e) =>
                        void updateTeam(team.id, { budgetUSD: e.target.value })
                      }
                      className={cn(
                        'theme-field text-xs',
                        styles.mobileBudgetField
                      )}
                      aria-label={`USD budget for ${team.name}`}
                    />
                  </div>

                  <p
                    className={cn(
                      'mt-2 text-[10px] font-semibold',
                      styles.mobileMeta
                    )}
                  >
                    Left: {formatMoney(team.budgetBDT)} BDT /{' '}
                    {formatMoney(team.budgetUSD)} USD
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleExportCSV(team)}
                      className={cn(
                        'theme-button theme-button-info text-[10px] font-bold uppercase',
                        styles.exportButton
                      )}
                    >
                      Export
                    </button>
                    <button
                      onClick={() => deleteTeam(team.id)}
                      className={cn(
                        'theme-button theme-button-danger text-[10px] font-bold uppercase',
                        styles.deleteButton
                      )}
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
