'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

import AnimatedLatestPick from '@/components/AnimatedLatestPick';
import PlayerSelectionGrid from '@/components/PlayerSelectionGrid';
import { TeamProfile } from '@/components/team/TeamDetailsPanel';
import { getSocket } from '@/lib/socketClient';
import { useDraftStore } from '@/lib/draftStore';
import type { ApiTeam } from '@/types/domain';

const dashboardTitle =
  process.env.NEXT_PUBLIC_TITLE ?? "BPL Female Players' Draft 2026";
const dashboardDescription =
  process.env.NEXT_PUBLIC_DESCRIPTION ?? 'Live Draft Status';

export default function PublicDashboard() {
  const teams = useDraftStore((state) => state.teams);
  const players = useDraftStore((state) => state.players);
  const draftSession = useDraftStore((state) => state.session);
  const loading = useDraftStore((state) => state.loading);
  const fetchAll = useDraftStore((state) => state.fetchAll);

  const [activeTab, setActiveTab] = useState<'Session' | 'Players' | 'Teams'>(
    'Session'
  );
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [expandedProfileTeamId, setExpandedProfileTeamId] = useState<
    string | null
  >(null);

  const socket = getSocket();

  useEffect(() => {
    const refresh = () => {
      void fetchAll({ silent: true });
    };

    void fetchAll();
    socket.on('state_changed', refresh);
    socket.on('pick_made', refresh);

    return () => {
      socket.off('state_changed', refresh);
      socket.off('pick_made', refresh);
    };
  }, [fetchAll, socket]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="animate-pulse bg-blue-500 h-16 w-16 rounded-full" />
      </div>
    );
  }

  const currentTurnTeam = draftSession?.currentTurnTeamId
    ? teams.find((team) => team.id === draftSession.currentTurnTeamId)
    : null;
  const activeSerial = currentTurnTeam ? currentTurnTeam.serialNumber : 9999;
  const sortedTeams = [...teams].sort(
    (a, b) => a.serialNumber - b.serialNumber
  );

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col relative w-full h-screen overflow-hidden">
      <AnimatedLatestPick />

      <header className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0 z-40 w-full">
        <div className="px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-lg border border-gray-100 overflow-hidden">
              <Image
                src="/bpl_logo.png"
                alt="BPL Logo"
                width={56}
                height={56}
                className="w-full h-full object-contain p-1"
              />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">
                {dashboardTitle}
              </h1>
              <p className="text-sm text-gray-500 mt-1 uppercase tracking-widest font-bold">
                {dashboardDescription}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {draftSession?.isActive ? (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-2 flex items-center gap-4 shadow-inner">
                <div className="flex flex-col text-right">
                  <span className="text-[10px] uppercase font-bold text-blue-500 tracking-wider">
                    Current Turn
                  </span>
                  <span className="text-lg font-black text-blue-900 leading-tight">
                    {currentTurnTeam ? currentTurnTeam.name : 'N/A'}
                  </span>
                </div>
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow font-black text-blue-600 ring-2 ring-blue-400">
                  {currentTurnTeam?.serialNumber || '#'}
                </div>
              </div>
            ) : (
              <div className="px-6 py-3 bg-red-100 text-red-800 rounded-xl border border-red-200 font-bold uppercase tracking-widest text-sm animate-pulse shadow-sm">
                Draft Paused
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 flex space-x-8 flex-shrink-0">
        <button
          onClick={() => setActiveTab('Session')}
          className={`py-4 px-2 border-b-4 font-bold transition-all text-sm uppercase tracking-widest ${
            activeTab === 'Session'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Draft Session
        </button>
        <button
          onClick={() => setActiveTab('Players')}
          className={`py-4 px-2 border-b-4 font-bold transition-all text-sm uppercase tracking-widest ${
            activeTab === 'Players'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Players
        </button>
        <button
          onClick={() => setActiveTab('Teams')}
          className={`py-4 px-2 border-b-4 font-bold transition-all text-sm uppercase tracking-widest ${
            activeTab === 'Teams'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Teams Info
        </button>
      </div>

      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 overflow-hidden">
        {activeTab === 'Session' && (
          <div className="max-w-4xl mx-auto h-full flex flex-col">
            <h2 className="text-xl font-bold text-gray-800 mb-6 uppercase tracking-wider">
              Draft Order & Live Status
            </h2>
            {draftSession?.draftStatus === 'idle' ||
            draftSession?.draftStatus === 'ended' ||
            !draftSession?.draftStatus ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-4xl">
                  ⏳
                </div>
                <p className="text-lg font-bold text-gray-500">
                  {draftSession?.draftStatus === 'ended'
                    ? 'This draft session has ended.'
                    : 'Waiting for the draft session to start...'}
                </p>
                <p className="text-sm text-gray-400">
                  {draftSession?.draftStatus === 'ended'
                    ? 'The admin may start a new draft round.'
                    : 'The Admin will kick things off shortly. Stay tuned!'}
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-3 pb-8">
                {sortedTeams.map((team: ApiTeam) => {
                  let statusText = 'Pending';
                  let statusColor = 'bg-gray-100 text-gray-600 border-gray-200';
                  if (team.id === draftSession?.currentTurnTeamId) {
                    statusText = 'Drafting';
                    statusColor =
                      'bg-blue-100 text-blue-700 border-blue-200 animate-pulse ring-2 ring-blue-300 ring-offset-1';
                  } else if (team.serialNumber < activeSerial) {
                    statusText = 'Already Drafted';
                    statusColor =
                      'bg-emerald-100 text-emerald-700 border-emerald-200';
                  }

                  return (
                    <div
                      key={team.id}
                      className={`border rounded-xl overflow-hidden shadow-sm flex flex-col ${
                        team.id === draftSession?.currentTurnTeamId
                          ? 'border-blue-400'
                          : 'border-gray-200'
                      }`}
                    >
                      <button
                        onClick={() =>
                          setExpandedTeamId(
                            expandedTeamId === team.id ? null : team.id
                          )
                        }
                        className={`w-full p-4 flex justify-between items-center transition ${
                          team.id === draftSession?.currentTurnTeamId
                            ? 'bg-blue-50/50 hover:bg-blue-50'
                            : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex gap-4 items-center">
                          <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center border overflow-hidden">
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
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase">
                                #{team.serialNumber}
                              </span>
                              <span className="font-black text-gray-900 text-lg leading-none">
                                {team.name}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-6 items-center">
                          <span
                            className={`px-3 py-1 uppercase text-[10px] font-black tracking-widest rounded border ${statusColor}`}
                          >
                            {statusText}
                          </span>
                          <svg
                            className={`w-5 h-5 transition-transform ${expandedTeamId === team.id ? 'rotate-180 text-blue-600' : 'text-gray-400'}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </div>
                      </button>
                      {expandedTeamId === team.id && (
                        <div className="p-6 bg-gray-50 border-t border-gray-200">
                          <TeamProfile team={team} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'Players' && (
          <div className="h-full max-w-7xl mx-auto flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <PlayerSelectionGrid
              players={players}
              session={draftSession}
              currentTeamId={null}
              teams={teams}
              readOnly={true}
              showAllCategories={true}
            />
          </div>
        )}

        {activeTab === 'Teams' && (
          <div className="max-w-6xl mx-auto h-full flex flex-col">
            <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-3 pb-8">
              {sortedTeams.map((team: ApiTeam) => (
                <div
                  key={team.id}
                  className="border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col bg-white"
                >
                  <button
                    onClick={() =>
                      setExpandedProfileTeamId(
                        expandedProfileTeamId === team.id ? null : team.id
                      )
                    }
                    className="w-full p-4 flex justify-between items-center transition hover:bg-gray-50"
                  >
                    <div className="flex gap-4 items-center">
                      <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center border overflow-hidden">
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
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase">
                            #{team.serialNumber}
                          </span>
                          <span className="font-black text-gray-900 text-lg leading-none">
                            {team.name}
                          </span>
                        </div>
                      </div>
                    </div>
                    <svg
                      className={`w-5 h-5 transition-transform ${expandedProfileTeamId === team.id ? 'rotate-180 text-blue-600' : 'text-gray-400'}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {expandedProfileTeamId === team.id && (
                    <div className="p-6 bg-gray-50 border-t border-gray-200">
                      <TeamProfile team={team} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
