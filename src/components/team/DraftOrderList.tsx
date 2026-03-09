import { useState } from "react";
import Image from "next/image";
import type { ApiDraftSession, ApiPick, ApiPlayer, ApiTeam } from "@/types/domain";

type DraftOrderListProps = {
  teams: ApiTeam[];
  activeTurnTeamId?: string | null;
  session?: ApiDraftSession | null;
};

export default function DraftOrderList({ teams, activeTurnTeamId, session }: DraftOrderListProps) {
  // Sort teams by serial
  const sortedTeams = [...teams].sort((a, b) => a.serialNumber - b.serialNumber);
  
  const isDraftActive = session?.isActive === true;
  const activeTeam = teams.find(t => t.id === activeTurnTeamId);
  const activeSerial = activeTeam ? activeTeam.serialNumber : null;

  const draftStatus = session?.draftStatus || "idle";
  const isDraftRunning = draftStatus === "active" || draftStatus === "paused";

  return (
    <div className="h-full flex flex-col bg-gray-100 overflow-hidden">
       <div className="flex items-center justify-between mb-2 mt-1 px-1 flex-shrink-0">
         <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500">Draft Order</h2>
       </div>
       {!isDraftRunning ? (
         <div className="flex-1 flex flex-col items-center justify-center text-center px-4 gap-3">
           <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-2xl">⏳</div>
           <p className="text-sm font-bold text-gray-500">
             {draftStatus === "ended" ? "Draft has ended." : "Waiting for the draft session to start..."}
           </p>
           <p className="text-xs text-gray-400">
             {draftStatus === "ended" ? "The Admin may start a new draft." : "The Admin will start the session shortly."}
           </p>
         </div>
       ) : (
         <div className="flex-1 overflow-y-auto px-2 custom-scrollbar space-y-4 pb-4">
           {sortedTeams.map(team => (
             <TeamDraftCard key={team.id} team={team} isActive={activeTurnTeamId === team.id} activeSerial={activeSerial} isDraftActive={isDraftActive} />
           ))}
         </div>
       )}
    </div>
  )
}

function TeamDraftCard({ team, isActive, activeSerial, isDraftActive }: { team: ApiTeam; isActive: boolean; activeSerial: number | null; isDraftActive: boolean }) {
  const [tab, setTab] = useState<"Local" | "Oversea">("Local");

  const localPlayers = team.players?.filter((p) => p.category === "Local") || [];
  const overseaPlayers = team.players?.filter((p) => p.category === "Oversea") || [];

  const spentBDT = localPlayers.reduce((acc, p) => acc + Number(p.priceBDT || 0), 0);
  const spentUSD = overseaPlayers.reduce((acc, p) => acc + Number(p.priceUSD || 0), 0);
  
  const localPicks = team.picks?.filter((pick) => pick.player?.category === "Local") || [];
  const lastLocalTarget = localPicks.length > 0 ? (localPicks[localPicks.length - 1] as ApiPick).player as ApiPlayer | undefined : undefined;

  const overseaPicks = team.picks?.filter((pick) => pick.player?.category === "Oversea") || [];
  const lastOverseaTarget = overseaPicks.length > 0 ? (overseaPicks[overseaPicks.length - 1] as ApiPick).player as ApiPlayer | undefined : undefined;

  return (
    <div className={`bg-white rounded-xl shadow-sm border-2 transition-all ${isActive ? 'border-blue-500 ring-4 ring-blue-100 scale-[1.02] z-10' : 'border-gray-100'} overflow-hidden flex flex-col`}>
      <div className={`p-3 ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-900'} border-b flex justify-between items-center`}>
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded border overflow-hidden flex-shrink-0 flex items-center justify-center ${isActive ? 'bg-white/20 border-white/30' : 'bg-white border-gray-200 shadow-sm'}`}>
             {team.logoUrl ? (
               <Image src={team.logoUrl} alt={`${team.name} logo`} width={32} height={32} className="w-full h-full object-contain" />
             ) : (
               <span className={`text-[8px] font-bold ${isActive ? 'text-white/60' : 'text-gray-400'}`}>LOGO</span>
             )}
          </div>
          <div>
            <div className={`text-[10px] uppercase tracking-wider opacity-80 font-bold ${isActive ? 'text-blue-100' : 'text-gray-500'}`}>Pick #{team.serialNumber}</div>
            <h3 className="text-sm font-black truncate leading-tight">{team.name}</h3>
          </div>
        </div>
        {isActive && (
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
          </span>
        )}
      </div>
      
      <div className="p-2">
        <div className="flex bg-gray-100 rounded p-0.5 mb-2">
          <button onClick={() => setTab("Local")} className={`flex-1 text-[10px] font-bold py-1 rounded-sm ${tab === "Local" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}>Local</button>
          <button onClick={() => setTab("Oversea")} className={`flex-1 text-[10px] font-bold py-1 rounded-sm ${tab === "Oversea" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}>Oversea</button>
        </div>

        {tab === "Local" && (
           <div className="space-y-1">
             <div className="flex justify-between text-[10px]">
               <span className="text-gray-500 font-semibold">Spent:</span>
               <span className="font-mono text-red-600 font-bold">৳{Number(spentBDT).toLocaleString()}</span>
             </div>
             <div className="flex justify-between text-[10px]">
               <span className="text-gray-500 font-semibold">Avail:</span>
               <span className="font-mono text-green-600 font-bold">৳{Number(team.budgetBDT || 0).toLocaleString()}</span>
             </div>
             <div className="bg-gray-50 p-1.5 rounded border mt-2">
               <div className="text-[8px] uppercase text-gray-400 font-bold">Last Pick</div>
               <div className="text-xs font-bold text-gray-800 truncate">{lastLocalTarget ? lastLocalTarget.name : "None"}</div>
             </div>
           </div>
        )}

        {tab === "Oversea" && (
           <div className="space-y-1">
             <div className="flex justify-between text-[10px]">
               <span className="text-gray-500 font-semibold">Spent:</span>
               <span className="font-mono text-red-600 font-bold">${Number(spentUSD).toLocaleString()}</span>
             </div>
             <div className="flex justify-between text-[10px]">
               <span className="text-gray-500 font-semibold">Avail:</span>
               <span className="font-mono text-green-600 font-bold">${Number(team.budgetUSD || 0).toLocaleString()}</span>
             </div>
              <div className="bg-gray-50 p-1.5 rounded border mt-2">
               <div className="text-[8px] uppercase text-gray-400 font-bold">Last Pick</div>
               <div className="text-xs font-bold text-gray-800 truncate">{lastOverseaTarget ? lastOverseaTarget.name : "None"}</div>
             </div>
           </div>
        )}

        {/* Draft Status Indicator */}
        {(() => {
           let statusText = "Pending";
           let statusColor = "bg-gray-100 text-gray-500 border-gray-200";

           if (isActive) {
             statusText = "Drafting";
             statusColor = "bg-blue-100 text-blue-700 border-blue-200 animate-pulse";
           } else if (isDraftActive && activeSerial !== null && team.serialNumber < activeSerial) {
             statusText = "Already Drafted";
             statusColor = "bg-emerald-100 text-emerald-700 border-emerald-200";
           }

           return (
             <div className={`mt-3 py-1.5 border rounded-md text-center text-[10px] font-black uppercase tracking-widest ${statusColor}`}>
               {statusText}
             </div>
           );
        })()}
      </div>
    </div>
  )
}
