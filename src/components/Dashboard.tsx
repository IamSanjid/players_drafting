"use client";

export default function Dashboard({ teams, activeTurnTeamId }: { teams: any[], activeTurnTeamId?: string | null }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {teams.map((team) => (
        <div 
          key={team.id} 
          className={`bg-white rounded-2xl shadow-lg border-2 transition-all ${
            activeTurnTeamId === team.id 
              ? "border-blue-500 ring-4 ring-blue-100 shadow-blue-200 transform scale-105 z-10" 
              : "border-gray-100"
          } overflow-hidden flex flex-col`}
        >
          <div className={`p-4 ${activeTurnTeamId === team.id ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-900'} border-b flex justify-between items-center`}>
            <div>
              <div className="text-xs uppercase tracking-wider opacity-80 font-bold">Pick #{team.serialNumber}</div>
              <h3 className="text-xl font-black">{team.name}</h3>
            </div>
            {activeTurnTeamId === team.id && (
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>
            )}
          </div>
          
          <div className="p-4 flex-1">
            <div className="flex justify-between items-center mb-4 text-sm font-medium">
              <div className="flex flex-col">
                <span className="text-gray-500 uppercase text-xs">BDT Left</span>
                <span className="text-lg text-emerald-600 font-mono">৳{Number(team.budgetBDT).toLocaleString()}</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-gray-500 uppercase text-xs">USD Left</span>
                <span className="text-lg text-blue-600 font-mono">${Number(team.budgetUSD).toLocaleString()}</span>
              </div>
            </div>

            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 border-b pb-1">Drafted Players ({team.players?.length || 0})</h4>
            <div className="space-y-1 mt-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {team.players && team.players.length > 0 ? (
                team.players.map((p: any) => (
                  <div key={p.id} className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
                    <div className="truncate pr-2 border-l-2 border-indigo-400 pl-2">
                       <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                       <p className="text-[10px] text-gray-500 uppercase">{p.category} • {p.subCategory} • {p.position}</p>
                    </div>
                    {p.isPreBought && (
                      <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[9px] rounded font-bold">PRE</span>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-400 font-medium italic text-center py-4">No players drafted yet</div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
