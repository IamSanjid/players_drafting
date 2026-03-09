"use client";

import { useState, useEffect } from "react";
import { getSocket } from "@/lib/socketClient";
import PlayerSelectionGrid from "@/components/PlayerSelectionGrid";
import DraftOrderList from "@/components/team/DraftOrderList";
import TeamDetailsPanel from "@/components/team/TeamDetailsPanel";
import AnimatedLatestPick from "@/components/AnimatedLatestPick";

export default function TeamView() {
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Auth State
  const [loggedInTeam, setLoggedInTeam] = useState<any>(null);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const socket = getSocket();

  const fetchData = async () => {
    try {
      const [teamsRes, playersRes, sessionRes] = await Promise.all([
        fetch("/api/teams"),
        fetch("/api/players"),
        fetch("/api/session")
      ]);
      setTeams(await teamsRes.json());
      setPlayers(await playersRes.json());
      setSession(await sessionRes.json());
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    socket.on("state_changed", fetchData);
    return () => {
      socket.off("state_changed", fetchData);
    };
  }, []);

  // Hydrate login from localStorage once teams are loaded
  useEffect(() => {
    const savedTeamId = localStorage.getItem("teamAuthId");
    if (savedTeamId && teams.length > 0) {
      const t = teams.find(t => t.id === savedTeamId);
      if (t) setLoggedInTeam(t);
    }
  }, [teams]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const t = teams.find(t => t.id === selectedTeamId);
    if (!t) return setAuthError("Select a team");
    if (t.password !== password) return setAuthError("Incorrect password");
    setLoggedInTeam(t);
    localStorage.setItem("teamAuthId", t.id);
    setAuthError("");
  };

  const handleLogout = () => {
    setLoggedInTeam(null);
    localStorage.removeItem("teamAuthId");
  };

  if (loading) return <div className="flex justify-center items-center min-h-screen text-xl font-bold">Loading Draft State...</div>;

  if (!loggedInTeam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-6 text-center">Team Login</h2>

          {authError && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-200">{authError}</div>}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Franchise</label>
              <select required value={selectedTeamId} onChange={e => setSelectedTeamId(e.target.value)} className="w-full border-gray-300 rounded-lg p-3 bg-gray-50 focus:ring-blue-500">
                <option value="">-- Choose Team --</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Passcode</label>
              <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border-gray-300 rounded-lg p-3 bg-gray-50 focus:ring-blue-500" placeholder="Enter password" />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white font-bold p-3 rounded-lg shadow-lg shadow-blue-200 hover:bg-blue-700 transition">
              Access Draft Room
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Find updated logged in team dynamically
  const liveTeamData = teams.find(t => t.id === loggedInTeam.id);

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex flex-col h-screen">
      {/* Animated Pick Overlay */}
      <AnimatedLatestPick />

      {/* Header */}
      <div className="bg-white shadow-sm rounded-xl p-4 mb-4 flex justify-between items-center border border-gray-100 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-black text-gray-900">{liveTeamData?.name} Hub</h1>
          <p className="text-sm font-semibold text-gray-500">Your Serial: {liveTeamData?.serialNumber}</p>
        </div>
        <div className="flex gap-6 text-right items-center">
          <div className="hidden md:block">
            <p className="text-xs uppercase text-gray-500 font-bold mb-1 tracking-wider">Draft Status</p>
            {session?.isActive ? (
              session?.currentTurnTeamId === liveTeamData?.id ? (
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold animate-pulse inline-block">YOUR TURN TO DRAFT</span>
              ) : (
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold">WAITING FOR TURN</span>
              )
            ) : (
              <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold">DRAFT PAUSED</span>
            )}
          </div>
          <button onClick={handleLogout} className="text-sm text-red-500 font-semibold hover:text-red-700">Logout</button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Draft Order List */}
        <div className="lg:col-span-3 h-full overflow-hidden">
          <DraftOrderList teams={teams} activeTurnTeamId={session?.currentTurnTeamId} session={session} />
        </div>

        {/* Middle Column: Player Selection Grid */}
        <div className="lg:col-span-6 overflow-hidden flex flex-col h-full bg-white rounded-2xl shadow-sm border border-gray-100">
          <PlayerSelectionGrid
            players={players}
            session={session}
            currentTeamId={loggedInTeam.id}
            teams={teams}
          />
        </div>

        {/* Right Column: Team/Others Tabs */}
        <div className="lg:col-span-3 h-full overflow-hidden">
          <TeamDetailsPanel teams={teams} currentTeamId={loggedInTeam.id} />
        </div>
      </div>
    </div>
  );
}
