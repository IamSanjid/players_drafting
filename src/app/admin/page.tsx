"use client";

import { useState, useEffect } from "react";
import SessionControls from "@/components/admin/SessionControls";
import TeamManagement from "@/components/admin/TeamManagement";
import PlayerManagement from "@/components/admin/PlayerManagement";
import AdminAuthWrapper from "@/components/admin/AdminAuthWrapper";
import { getSocket } from "@/lib/socketClient";
import { useDraftStore } from "@/lib/draftStore";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"session" | "teams" | "players">("session");
  const teams = useDraftStore((state) => state.teams);
  const fetchAll = useDraftStore((state) => state.fetchAll);
  const socket = getSocket();

  useEffect(() => {
    const refresh = () => {
      void fetchAll({ silent: true });
    };

    void fetchAll();
    socket.on("state_changed", refresh);

    return () => {
      socket.off("state_changed", refresh);
    };
  }, [fetchAll, socket]);

  useEffect(() => {
    void fetchAll({ silent: true });
  }, [activeTab, fetchAll]);

  return (
    <AdminAuthWrapper>
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Admin Control Center</h1>
          <div className="flex items-center gap-4">
             <a href="/team" target="_blank" className="text-blue-600 hover:text-blue-800 font-medium">Open Team View ↗</a>
             <button 
               onClick={() => {
                 localStorage.removeItem("adminAuth");
                 window.location.reload();
               }} 
               className="text-red-500 hover:text-red-700 font-medium text-sm ml-4"
             >
               Logout
             </button>
          </div>
        </div>

        {/* Custom Tabs */}
        <div className="flex space-x-2 bg-white p-2 rounded-xl shadow-sm border border-gray-100 w-fit">
          <button 
            onClick={() => setActiveTab("session")}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "session" ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            Session Config
          </button>
          <button 
            onClick={() => setActiveTab("teams")}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "teams" ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            Manage Teams
          </button>
          <button 
            onClick={() => setActiveTab("players")}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "players" ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            Manage Players
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-8">
          {activeTab === "session" && <SessionControls />}
          {activeTab === "teams" && <TeamManagement />}
          {activeTab === "players" && <PlayerManagement teams={teams} />}
        </div>
        
        </div>
      </div>
    </AdminAuthWrapper>
  );
}
