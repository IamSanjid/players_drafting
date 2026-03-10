import { useState } from "react";
import Image from "next/image";
import type { ApiPlayer, ApiTeam } from "@/types/domain";

const toBigInt = (value: string | null | undefined): bigint => {
  if (!value) {
    return BigInt(0);
  }
  return BigInt(value);
};

export function TeamProfile({ team }: { team: ApiTeam }) {
  const [tab, setTab] = useState<"Local" | "Oversea">("Local");
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  const localPlayers = team.players?.filter((p) => p.category === "Local") || [];
  const overseaPlayers = team.players?.filter((p) => p.category === "Oversea") || [];

  const spentBDT: bigint = localPlayers
    .filter((p) => !p.isPreBought)
    .reduce((acc, p) => acc + toBigInt(p.priceBDT), BigInt(0));
  const spentUSD: bigint = overseaPlayers
    .filter((p) => !p.isPreBought)
    .reduce((acc, p) => acc + toBigInt(p.priceUSD), BigInt(0));

  const displayPlayers = tab === "Local" ? localPlayers : overseaPlayers;
  const totalPages = Math.ceil(displayPlayers.length / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const currentPlayers = displayPlayers.slice(startIndex, startIndex + itemsPerPage);

  const handleTabChange = (newTab: "Local" | "Oversea") => {
    setTab(newTab);
    setPage(1);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Team Header with Banner and Logo */}
      <div className="relative mb-6 rounded-xl overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-900 shadow-lg border border-white/20 h-32 flex-shrink-0">
        {team.bannerUrl ? (
          <Image
            src={team.bannerUrl}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 28rem"
            className="object-cover opacity-90"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-white/10 font-black text-4xl italic tracking-tighter uppercase select-none">FRANCHISE</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>

        <div className="absolute bottom-4 left-4 flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-white p-1.5 shadow-2xl flex-shrink-0 border-2 border-white/50">
            {team.logoUrl ? (
              <div className="relative w-full h-full">
                <Image
                  src={team.logoUrl}
                  alt={`${team.name} logo`}
                  fill
                  sizes="56px"
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-400 font-bold text-lg">{team.name.charAt(0)}</div>
            )}
          </div>
          <div>
            <h3 className="text-xl font-black text-white leading-none drop-shadow-md">{team.name}</h3>
            <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mt-1">Serial #{team.serialNumber}</p>
          </div>
        </div>
      </div>

      {/* Financials Summary */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
          <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">BDT Status</div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-red-500">Spent: ৳{spentBDT.toLocaleString()}</span>
            <span className="text-sm font-black text-emerald-600 mt-0.5">Avail: ৳{toBigInt(team.budgetBDT).toLocaleString()}</span>
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
          <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">USD Status</div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-red-500">Spent: ${spentUSD.toLocaleString()}</span>
            <span className="text-sm font-black text-blue-600 mt-0.5">Avail: ${toBigInt(team.budgetUSD).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
        <button onClick={() => handleTabChange("Local")} className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-all ${tab === "Local" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>Local List ({localPlayers.length})</button>
        <button onClick={() => handleTabChange("Oversea")} className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-all ${tab === "Oversea" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>Oversea List ({overseaPlayers.length})</button>
      </div>

      {/* Players Table */}
      <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] text-gray-400 uppercase bg-gray-50/50 border-b">
              <tr>
                <th className="px-3 py-2.5 font-bold">Player</th>
                <th className="px-3 py-2.5 font-bold">Pos</th>
                <th className="px-3 py-2.5 font-bold text-right">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {currentPlayers.map((p: ApiPlayer) => (
                <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-3 py-2.5">
                    <div className="font-bold text-gray-900">{p.name}</div>
                    <div className="text-[9px] text-gray-400 font-medium uppercase tracking-tighter">{p.subCategory}-Category</div>
                    {p.category === "Oversea" && p.country !== null && (
                      <span className="text-[10px] text-gray-400 font-bold uppercase">
                        {p.country}
                      </span>
                    )}
                    {p.category === "Oversea" && p.availability !== null && (
                      <span className="text-[10px] font-black uppercase text-gray-400 border border-gray-200 px-1 rounded">
                        {p.availability}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-gray-600 font-medium">{p.position}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-indigo-600 italic">
                    {p.isPreBought ? "Pre-Bought" : (tab === "Local" ? `৳${Number(p.priceBDT).toLocaleString()}` : `$${Number(p.priceUSD).toLocaleString()}`)}
                  </td>
                </tr>
              ))}
              {displayPlayers.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-8 text-center text-gray-400 italic">No players drafted yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-2 border-t bg-gray-50/50 flex items-center justify-between mt-auto">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="p-1 px-2 rounded bg-white border text-[10px] font-bold text-gray-500 disabled:opacity-30 hover:bg-gray-50 transition"
            >
              Prev
            </button>
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Page {page} of {totalPages}</span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="p-1 px-2 rounded bg-white border text-[10px] font-bold text-gray-500 disabled:opacity-30 hover:bg-gray-50 transition"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function TeamDetailsPanel({ teams, currentTeamId }: { teams: ApiTeam[]; currentTeamId: string }) {
  const [activeTab, setActiveTab] = useState<"Team" | "Others">("Team");
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  const currentTeam = teams.find(t => t.id === currentTeamId);
  const otherTeams = teams.filter(t => t.id !== currentTeamId);

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex border-b border-gray-100 font-bold flex-shrink-0">
        <button onClick={() => setActiveTab("Team")} className={`flex-1 py-3 text-sm transition-colors ${activeTab === "Team" ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50" : "text-gray-500 hover:bg-gray-50"}`}>My Team Info</button>
        <button onClick={() => setActiveTab("Others")} className={`flex-1 py-3 text-sm transition-colors ${activeTab === "Others" ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50" : "text-gray-500 hover:bg-gray-50"}`}>Other Teams</button>
      </div>

      <div className="flex-1 overflow-hidden p-4 flex flex-col min-h-0">
        {activeTab === "Team" && currentTeam && (
          <TeamProfile team={currentTeam} />
        )}

        {activeTab === "Others" && (
          <div className="overflow-y-auto pr-2 custom-scrollbar space-y-3 h-full pb-4">
            {otherTeams.map(team => (
              <div key={team.id} className="border rounded-xl overflow-hidden shadow-sm flex flex-col">
                <button
                  onClick={() => setExpandedTeamId(expandedTeamId === team.id ? null : team.id)}
                  className="w-full bg-gray-50 hover:bg-gray-100 p-3 flex justify-between items-center font-bold text-gray-800 transition"
                >
                  <span>{team.name}</span>
                  <svg className={`w-4 h-4 transition-transform ${expandedTeamId === team.id ? "rotate-180 text-blue-600" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </button>
                {expandedTeamId === team.id && (
                  <div className="p-4 bg-gray-50 border-t min-h-[450px]">
                    <TeamProfile team={team} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
