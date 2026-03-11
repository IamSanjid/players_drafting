'use client';

import { useEffect, useMemo, useState } from 'react';

import AnimatedLatestPick from '@/components/AnimatedLatestPick';
import PlayerSelectionGrid from '@/components/PlayerSelectionGrid';
import DraftOrderList from '@/components/team/DraftOrderList';
import TeamDetailsPanel from '@/components/team/TeamDetailsPanel';
import { BrandFooter } from '@/components/ui/BrandFooter';
import { Card, CardBody } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Tabs } from '@/components/ui/Tabs';
import { authApi } from '@/lib/api';
import { useDraftStore } from '@/lib/draftStore';
import { useSessionDerivedState } from '@/lib/hooks/useSessionDerivedState';
import { useDraftStateSync } from '@/lib/hooks/useDraftStateSync';

type WorkspaceTab = 'Pick Board' | 'Order' | 'Intel';

export default function TeamView() {
  const teams = useDraftStore((state) => state.teams);
  const players = useDraftStore((state) => state.players);
  const draftSession = useDraftStore((state) => state.session);
  const { currentTurnTeam, isDraftRunning } = useSessionDerivedState();
  const loading = useDraftStore((state) => state.loading);
  const fetchAll = useDraftStore((state) => state.fetchAll);

  const [authenticatedTeamId, setAuthenticatedTeamId] = useState<string | null>(
    null
  );
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('Pick Board');

  useDraftStateSync({ fetchAll });

  useEffect(() => {
    const checkTeamSession = async () => {
      try {
        const res = await authApi.team.me();
        if (!res.ok) {
          setAuthenticatedTeamId(null);
          return;
        }

        setAuthenticatedTeamId(res.data.teamId ?? null);
      } catch {
        setAuthenticatedTeamId(null);
      } finally {
        setCheckingAuth(false);
      }
    };

    void checkTeamSession();
  }, []);

  const loggedInTeam = useMemo(() => {
    if (!authenticatedTeamId) {
      return null;
    }

    return teams.find((team) => team.id === authenticatedTeamId) ?? null;
  }, [authenticatedTeamId, teams]);

  const liveTeamData =
    teams.find((team) => team.id === loggedInTeam?.id) ?? null;

  const handleLogin = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    const team = teams.find((candidate) => candidate.id === selectedTeamId);
    if (!team) {
      setAuthError('Select a team first.');
      return;
    }

    const res = await authApi.team.login(selectedTeamId, password);

    if (!res.ok) {
      setAuthError('Incorrect password');
      return;
    }

    setAuthenticatedTeamId(team.id);
    setAuthError('');
    setPassword('');
  };

  const handleLogout = async () => {
    await authApi.team.logout();
    setAuthenticatedTeamId(null);
  };

  if (loading || checkingAuth) {
    return (
      <div className="flex h-dvh flex-col gap-4 overflow-y-auto p-4 md:p-6">
        <PageHeader
          title="Team Draft Hub"
          subtitle="Connecting to live draft state"
          logoSrc="/logo.png"
          logoAlt="Logo"
        />
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <p className="text-lg font-bold text-slate-700">
            Loading draft state...
          </p>
        </div>
        <BrandFooter compact />
      </div>
    );
  }

  if (!loggedInTeam) {
    return (
      <div className="flex h-dvh flex-col gap-4 overflow-y-auto p-4 md:p-6">
        <PageHeader
          title="Team Draft Hub"
          subtitle="Login to access your franchise control room"
          logoSrc="/logo.png"
          logoAlt="Logo"
        />
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <Card className="w-full max-w-md">
            <CardBody className="space-y-5 p-6">
              <div className="space-y-1 text-center">
                <h2 className="text-3xl font-black text-slate-900">
                  Team Login
                </h2>
                <p className="text-sm text-slate-500">
                  Enter your franchise credentials
                </p>
              </div>

              {authError ? (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                  {authError}
                </p>
              ) : null}

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">
                    Select Franchise
                  </label>
                  <select
                    required
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
                  >
                    <option value="">Choose team</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">
                    Passcode
                  </label>
                  <input
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
                    placeholder="Enter password"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-800"
                >
                  Access Draft Room
                </button>
              </form>
            </CardBody>
          </Card>
        </div>
        <BrandFooter compact />
      </div>
    );
  }

  const isMyTurn = isDraftRunning && currentTurnTeam?.id === liveTeamData?.id;

  return (
    <div className="relative flex h-dvh flex-col gap-4 overflow-y-auto p-4 md:p-6">
      <AnimatedLatestPick />

      <PageHeader
        title={`${liveTeamData?.name ?? 'Team'} Draft Hub`}
        subtitle={`Serial #${liveTeamData?.serialNumber ?? '-'}`}
        logoSrc="/logo.png"
        logoAlt="Logo"
        actions={
          <>
            {isDraftRunning ? (
              <StatusBadge
                label={isMyTurn ? 'Your Turn To Draft' : 'Waiting For Turn'}
                tone={isMyTurn ? 'success' : 'warning'}
                pulse={isMyTurn}
              />
            ) : (
              <StatusBadge label="Draft Paused" tone="danger" pulse />
            )}
            <button
              onClick={handleLogout}
              className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-semibold text-rose-700 hover:bg-rose-50"
            >
              Logout
            </button>
          </>
        }
      />

      <div className="lg:hidden">
        <Tabs<WorkspaceTab>
          value={workspaceTab}
          onChange={setWorkspaceTab}
          options={[
            { value: 'Pick Board', label: 'Pick Board' },
            { value: 'Order', label: 'Order' },
            { value: 'Intel', label: 'Intel' },
          ]}
        />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-12">
        <div
          className={`min-h-0 lg:col-span-3 ${workspaceTab === 'Order' ? 'block' : 'hidden lg:block'}`}
        >
          <Card className="h-full overflow-hidden">
            <CardBody className="h-full p-3">
              <DraftOrderList
                teams={teams}
                activeTurnTeamId={currentTurnTeam?.id}
                session={draftSession}
              />
            </CardBody>
          </Card>
        </div>

        <div
          className={`min-h-0 lg:col-span-6 ${workspaceTab === 'Pick Board' ? 'block' : 'hidden lg:block'}`}
        >
          <Card className="h-full overflow-hidden">
            <PlayerSelectionGrid
              players={players}
              session={draftSession}
              currentTeamId={loggedInTeam.id}
              teams={teams}
            />
          </Card>
        </div>

        <div
          className={`min-h-0 lg:col-span-3 ${workspaceTab === 'Intel' ? 'block' : 'hidden lg:block'}`}
        >
          <TeamDetailsPanel teams={teams} currentTeamId={loggedInTeam.id} />
        </div>
      </div>

      <BrandFooter />
    </div>
  );
}
