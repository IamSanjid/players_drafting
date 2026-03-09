"use client";

import { useState, useEffect } from "react";
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
  const session = useDraftStore((state) => state.session);
  const teams = useDraftStore((state) => state.teams);
  const loading = useDraftStore((state) => state.loading);
  const fetchAll = useDraftStore((state) => state.fetchAll);
  const [showEndWarning, setShowEndWarning] = useState(false);
  const socket = getSocket();

  useEffect(() => {
    if (!session) {
      void fetchAll();
    }
  }, [fetchAll, session]);

  const updateSession = async (updates: SessionUpdatePayload) => {
    await fetch("/api/session", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    await fetchAll({ silent: true, force: true });
    socket.emit("state_changed");
  };

  const handleStartNewDraft = async () => {
    // Sort teams by serial and persist draft order
    const sortedTeams = [...teams].sort((a, b) => a.serialNumber - b.serialNumber);
    if (sortedTeams.length === 0) return alert("Add teams first before starting a draft.");
    const draftOrderIds = sortedTeams.map((t) => t.id);
    const nextRound = (session?.draftRound || 0) + 1;
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
        if (!session?.draftStartedAt) {
          return false;
        }
        return p.createdAt < session.draftStartedAt;
      }),
    );
    if (!force && teamsWithNoPicks.length > 0) {
      setShowEndWarning(true);
      return;
    }
    setShowEndWarning(false);
    await updateSession({ isActive: false, draftStatus: "ended", currentTurnTeamId: null });
  };

  if (!session) {
    if (loading) {
      return <div className="animate-pulse h-20 bg-gray-200 rounded-xl" />;
    }
    return <div className="h-20 bg-gray-50 rounded-xl border border-gray-100" />;
  }

  const status = session.draftStatus || "idle";
  const teamsWithNoPicks = teams.filter((t) =>
    (t.picks?.length || 0) === 0 ||
    t.picks.every((p) => {
      if (!session?.draftStartedAt) {
        return false;
      }
      return p.createdAt < session.draftStartedAt;
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
          {(session.draftRound || 0) > 0 && status !== "idle" && status !== "ended" && (
            <p className="text-xs text-gray-500">Round #{session.draftRound}</p>
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
            value={session.allowedCategories}
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
            value={session.activeCategory}
            onChange={(e) => updateSession({ activeCategory: e.target.value as "Oversea" | "Local" })}
            disabled={session.allowedCategories !== "Both"}
            className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 disabled:opacity-50"
          >
            <option value="Local">Local Players</option>
            <option value="Oversea">Oversea Players</option>
          </select>
          <p className="text-xs text-gray-500 mt-2">Forces teams to draft from this category right now.</p>
        </div>
      </div>
    </div>
  );
}
