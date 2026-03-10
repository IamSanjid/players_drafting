"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { getSocket } from "@/lib/socketClient";
import { useDraftStore } from "@/lib/draftStore";

type SessionUpdatePayload = Partial<{
  isActive: boolean;
  draftStatus: "idle" | "active" | "paused" | "ended";
  allowedCategories: "Both" | "Oversea" | "Local";
  activeCategory: "Oversea" | "Local";
  currentTurnTeamId: string | null;
  draftOrder: string;
  draftRound: number;
  draftStartedAt: string | null;
}>;

export default function SessionControls() {
  const draftSession = useDraftStore((state) => state.session);
  const teams = useDraftStore((state) => state.teams);
  const loading = useDraftStore((state) => state.loading);
  const fetchAll = useDraftStore((state) => state.fetchAll);
  const [showEndWarning, setShowEndWarning] = useState(false);
  const socket = getSocket();

  useEffect(() => {
    if (!draftSession) {
      void fetchAll();
    }
  }, [fetchAll, draftSession]);

  const updateSession = async (updates: SessionUpdatePayload) => {
    await fetch("/api/draft/session", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    await fetchAll({ silent: true, force: true });
    socket.emit("state_changed");
  };

  const updateTeamSerial = async (teamId: string, newSerialNumber: number) => {
    await fetch(`/api/teams/${teamId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serialNumber: newSerialNumber }),
    });
    await fetchAll({ silent: true, force: true });
    socket.emit("state_changed");
  };

  const handleStartNewDraft = async () => {
    // Sort teams by serial and persist draft order
    const sortedTeams = [...teams].sort((a, b) => a.serialNumber - b.serialNumber);
    if (sortedTeams.length === 0) return alert("Add teams first before starting a draft.");
    const draftOrderIds = sortedTeams.map((t) => t.id);
    const nextRound = (draftSession?.draftRound || 0) + 1;
    await updateSession({
      isActive: true,
      draftStatus: "active",
      currentTurnTeamId: draftOrderIds[0],
      draftOrder: JSON.stringify(draftOrderIds),
      draftRound: nextRound,
      draftStartedAt: new Date().toISOString(),
    });
  };

  const handlePause = async () => {
    await updateSession({ isActive: false, draftStatus: "paused" });
  };

  const handleResume = async () => {
    await updateSession({ isActive: true, draftStatus: "active" });
  };

  const handleEndDraft = async (force = false) => {
    const teamsWithNoPicks = teams.filter((t) =>
      (t.picks?.length || 0) === 0 ||
      t.picks.every((p) => {
        if (!draftSession?.draftStartedAt) {
          return false;
        }
        return p.createdAt < draftSession.draftStartedAt;
      }),
    );
    if (!force && teamsWithNoPicks.length > 0) {
      setShowEndWarning(true);
      return;
    }
    setShowEndWarning(false);
    await updateSession({ isActive: false, draftStatus: "ended", currentTurnTeamId: null });
  };

  if (!draftSession) {
    if (loading) {
      return <div className="animate-pulse h-20 bg-gray-200 rounded-xl" />;
    }
    return <div className="h-20 bg-gray-50 rounded-xl border border-gray-100" />;
  }

  const status = draftSession.draftStatus || "idle";
  const isDraftRunning = status === "active" || status === "paused";
  const sortedTeams = [...teams].sort((a, b) => a.serialNumber - b.serialNumber);
  const currentTurnTeam = draftSession.currentTurnTeamId
    ? sortedTeams.find((team) => team.id === draftSession.currentTurnTeamId) ?? null
    : null;
  const activeSerial = currentTurnTeam?.serialNumber ?? null;
  const canSkipCurrentTurn = isDraftRunning && sortedTeams.length > 1 && currentTurnTeam !== null;
  const currentTurnIndex = currentTurnTeam
    ? sortedTeams.findIndex((team) => team.id === currentTurnTeam.id)
    : -1;
  const canGoToPreviousTurn = isDraftRunning && sortedTeams.length > 1 && currentTurnIndex > 0;

  const handleGoToPreviousTurn = async () => {
    if (!canGoToPreviousTurn || currentTurnIndex <= 0) {
      return;
    }

    const previousTeam = sortedTeams[currentTurnIndex - 1];
    if (!previousTeam) {
      return;
    }

    await updateSession({ currentTurnTeamId: previousTeam.id });
  };

  const handleSkipCurrentTurn = async () => {
    if (!canSkipCurrentTurn || activeSerial === null) {
      return;
    }

    if (currentTurnIndex < 0) {
      return;
    }

    if (currentTurnIndex === sortedTeams.length - 1) {
      const shouldForceEnd = confirm(
        "This is the last team's turn. Press OK to force-end the session, or Cancel to start over from the first team.",
      );

      if (shouldForceEnd) {
        await handleEndDraft(true);
        return;
      }

      await updateSession({
        currentTurnTeamId: sortedTeams[0].id,
        draftRound: (draftSession.draftRound || 1) + 1,
      });
      return;
    }

    const nextIndex = (currentTurnIndex + 1) % sortedTeams.length;
    const nextTeam = sortedTeams[nextIndex];
    await updateSession({ currentTurnTeamId: nextTeam.id });
  };

  const teamsWithNoPicks = teams.filter((t) =>
    (t.picks?.length || 0) === 0 ||
    t.picks.every((p) => {
      if (!draftSession?.draftStartedAt) {
        return false;
      }
      return p.createdAt < draftSession.draftStartedAt;
    }),
  );

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Draft Session Status</h2>
        <p className="text-gray-500 mt-1">Control the global flow of the event</p>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${status === "active" ? "bg-green-500 animate-pulse" : status === "paused" ? "bg-yellow-400" : status === "ended" ? "bg-red-400" : "bg-gray-400"}`} />
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">
            {status === "idle" && "Draft Not Started"}
            {status === "active" && "Draft is LIVE"}
            {status === "paused" && "Draft is PAUSED"}
            {status === "ended" && "Draft has ENDED"}
          </h3>
          {(draftSession.draftRound || 0) > 0 && status !== "idle" && status !== "ended" && (
            <p className="text-xs text-gray-500">Round #{draftSession.draftRound}</p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {/* Start New Draft (only when idle or ended) */}
        {(status === "idle" || status === "ended") && (
          <button
            onClick={handleStartNewDraft}
            className="px-5 py-2.5 rounded-lg text-white font-bold bg-green-600 hover:bg-green-700 shadow-md shadow-green-200 transition-all"
          >
            ▶ Start New Draft
          </button>
        )}

        {/* Pause Current Draft (when active) */}
        {status === "active" && (
          <button
            onClick={handlePause}
            className="px-5 py-2.5 rounded-lg text-white font-bold bg-yellow-500 hover:bg-yellow-600 shadow-md shadow-yellow-200 transition-all"
          >
            ⏸ Pause Draft
          </button>
        )}

        {/* Skip Current Team Turn (when active and valid) */}
        {isDraftRunning && (
          <button
            onClick={handleGoToPreviousTurn}
            disabled={!canGoToPreviousTurn}
            title={!canGoToPreviousTurn ? "Previous turn is unavailable when current turn is the first team." : undefined}
            className="px-5 py-2.5 rounded-lg text-white font-bold bg-violet-600 hover:bg-violet-700 shadow-md shadow-violet-200 transition-all disabled:bg-gray-300 disabled:text-gray-600 disabled:shadow-none disabled:cursor-not-allowed"
          >
            ⏮ Previous Turn
          </button>
        )}

        {/* Skip Current Team Turn (when active and valid) */}
        {isDraftRunning && (
          <button
            onClick={handleSkipCurrentTurn}
            disabled={!canSkipCurrentTurn}
            title={!canSkipCurrentTurn ? "Skip is available only when draft is active with a valid current team and at least 2 teams." : undefined}
            className="px-5 py-2.5 rounded-lg text-white font-bold bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all disabled:bg-gray-300 disabled:text-gray-600 disabled:shadow-none disabled:cursor-not-allowed"
          >
            ⏭ Skip Current Turn
          </button>
        )}

        {/* Resume (when paused) */}
        {status === "paused" && (
          <button
            onClick={handleResume}
            className="px-5 py-2.5 rounded-lg text-white font-bold bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200 transition-all"
          >
            ▶ Resume Draft
          </button>
        )}

        {/* End Draft (when active or paused) */}
        {(status === "active" || status === "paused") && (
          <button
            onClick={() => handleEndDraft(false)}
            className="px-5 py-2.5 rounded-lg text-white font-bold bg-red-600 hover:bg-red-700 shadow-md shadow-red-200 transition-all"
          >
            ■ End Current Draft
          </button>
        )}
      </div>

      {/* End Warning Modal */}
      {showEndWarning && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
          <p className="font-bold text-amber-800 mb-1">⚠ Warning: Teams Haven&apos;t Drafted</p>
          <p className="text-sm text-amber-700 mb-3">
            {teamsWithNoPicks.length} team(s) haven&apos;t made any picks yet: <strong>{teamsWithNoPicks.map((t) => t.name).join(", ")}</strong>.
            Are you sure you want to force-end the draft?
          </p>
          <div className="flex gap-3">
            <button onClick={() => handleEndDraft(true)} className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg font-bold hover:bg-red-700">Force End Draft</button>
            <button onClick={() => setShowEndWarning(false)} className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg font-bold hover:bg-gray-300">Cancel</button>
          </div>
        </div>
      )}

      {/* Category Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
        <div className="p-4 border border-gray-200 rounded-xl">
          <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">Allowed Categories</h3>
          <select
            value={draftSession.allowedCategories}
            onChange={(e) => {
              const newVal = e.target.value;
              const updates: SessionUpdatePayload = { allowedCategories: newVal as SessionUpdatePayload["allowedCategories"] };

              // Automatically switch active category if only one is allowed
              if (newVal === "Local") updates.activeCategory = "Local";
              if (newVal === "Oversea") updates.activeCategory = "Oversea";

              updateSession(updates);
            }}
            className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
          >
            <option value="Both">Both (Local & Oversea)</option>
            <option value="Local">Local Players Only</option>
            <option value="Oversea">Oversea Players Only</option>
          </select>
          <p className="text-xs text-gray-500 mt-2">Restricts what tabs are visible and selectable.</p>
        </div>

        <div className="p-4 border border-gray-200 rounded-xl">
          <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">Active Category</h3>
          <select
            value={draftSession.activeCategory}
            onChange={(e) => updateSession({ activeCategory: e.target.value as "Oversea" | "Local" })}
            disabled={draftSession.allowedCategories !== "Both"}
            className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 disabled:opacity-50"
          >
            <option value="Local">Local Players</option>
            <option value="Oversea">Oversea Players</option>
          </select>
          <p className="text-xs text-gray-500 mt-2">Forces teams to draft from this category right now.</p>
        </div>
      </div>

      {/* Team Draft Order (always visible) */}
      <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Team Draft Order</h3>
          {currentTurnTeam && (
            <p className="text-xs text-gray-500">
              Current: <span className="font-bold text-blue-700">#{currentTurnTeam.serialNumber} {currentTurnTeam.name}</span>
            </p>
          )}
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="flex gap-3 min-w-max">
            {sortedTeams.map((team) => {
              let statusText = "Pending";
              let badgeColor = "bg-gray-100 text-gray-600 border-gray-200";

              if (draftSession.currentTurnTeamId === team.id) {
                statusText = "Drafting";
                badgeColor = "bg-blue-100 text-blue-700 border-blue-200";
              } else if (activeSerial !== null && team.serialNumber < activeSerial) {
                statusText = "Already Drafted";
                badgeColor = "bg-emerald-100 text-emerald-700 border-emerald-200";
              }

              return (
                <div
                  key={team.id}
                  className="w-64 rounded-xl border border-gray-200 bg-white p-3 shadow-sm hover:shadow transition"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", team.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    const draggedTeamId = e.dataTransfer.getData("text/plain");
                    if (!draggedTeamId || draggedTeamId === team.id) {
                      return;
                    }
                    await updateTeamSerial(draggedTeamId, team.serialNumber);
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" />
                      </svg>
                      <select
                        value={team.serialNumber}
                        onChange={async (e) => {
                          await updateTeamSerial(team.id, Number(e.target.value));
                        }}
                        className="font-black text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100 focus:ring-1 focus:ring-indigo-500 outline-none min-w-[56px]"
                      >
                        {Array.from({ length: sortedTeams.length }, (_, index) => index + 1).map((num) => (
                          <option key={num} value={num}>{num}</option>
                        ))}
                      </select>
                    </div>
                    {isDraftRunning && (
                      <span className={`inline-block px-2 py-1 rounded border text-[10px] uppercase tracking-wider font-black ${badgeColor}`}>
                        {statusText}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-gray-100 border flex items-center justify-center overflow-hidden">
                      {team.logoUrl ? (
                        <Image src={team.logoUrl} alt={`${team.name} logo`} width={40} height={40} className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-[9px] font-bold text-gray-400">LOGO</span>
                      )}
                    </div>
                    <p className="font-semibold text-gray-900 truncate">{team.name}</p>
                  </div>
                </div>
              );
            })}
            {sortedTeams.length === 0 && (
              <div className="w-full min-h-24 flex items-center justify-center text-sm text-gray-500 border border-dashed border-gray-300 rounded-xl bg-white/50">
                No teams added yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
