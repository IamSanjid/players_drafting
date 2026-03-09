"use client";

import { useState, useEffect } from "react";
import { getSocket } from "@/lib/socketClient";

export default function TeamManagement() {
  const [teams, setTeams] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // New Team State
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamPassword, setNewTeamPassword] = useState("");
  const [newTeamBudgetBDT, setNewTeamBudgetBDT] = useState("");
  const [newTeamBudgetUSD, setNewTeamBudgetUSD] = useState("");
  const [newTeamLogo, setNewTeamLogo] = useState("");
  const [newTeamBanner, setNewTeamBanner] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);

  const socket = getSocket();

  const fetchData = async () => {
    setLoading(true);
    const [sRes, tRes] = await Promise.all([fetch("/api/session"), fetch("/api/teams")]);
    setSession(await sRes.json());
    setTeams(await tRes.json());
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    socket.on("state_changed", fetchData);
    return () => { socket.off("state_changed", fetchData); };
  }, []);

  const handleAddTeam = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (session.draftStatus === "active") {
      alert("Draft is active. You cannot add new teams.");
      return;
    }
    const nextSerial = teams.length > 0 ? Math.max(...teams.map(t => t.serialNumber)) + 1 : 1;

    await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newTeamName,
        password: newTeamPassword,
        serialNumber: nextSerial,
        budgetBDT: newTeamBudgetBDT,
        budgetUSD: newTeamBudgetUSD,
        logoUrl: newTeamLogo,
        bannerUrl: newTeamBanner,
      }),
    });

    await fetchData();
    socket.emit("state_changed");

    // Reset form
    setNewTeamName("");
    setNewTeamPassword("");
    setNewTeamBudgetBDT("");
    setNewTeamBudgetUSD("");
    setNewTeamLogo("");
    setNewTeamBanner("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "banner") => {
    const file = e.target.files?.[0];
    if (!file) return null;

    setUploading(type);
    const formData = new FormData();
    formData.append("file", file);
    formData.set("type", type);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      return res.json();
      // if (data.url) {
      //   if (type === "logo") setNewTeamLogo(data.url);
      //   else setNewTeamBanner(data.url);
      // }
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploading(null);
    }
    return null;
  };

  const handleNewTeamFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "banner") => {
    const data = await handleFileUpload(e, type);
    if (data && data.url) {
      if (type === "logo") setNewTeamLogo(data.url);
      else setNewTeamBanner(data.url);
    }
  };

  const handleRowFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, teamId: string, type: "logo" | "banner") => {
    const data = await handleFileUpload(e, type);
    if (data && data.url) {
      await updateTeam(teamId, { [type === "logo" ? "logoUrl" : "bannerUrl"]: data.url });
    }
    // const file = e.target.files?.[0];
    // if (!file) return;

    // const formData = new FormData();
    // formData.append("file", file);
    // formData.set("type", type);

    // try {
    //   const res = await fetch("/api/upload", {
    //     method: "POST",
    //     body: formData,
    //   });
    //   const data = await res.json();
    //   if (data.url) {
    //     await updateTeam(teamId, { [type === "logo" ? "logoUrl" : "bannerUrl"]: data.url });
    //   }
    // } catch (err) {
    //   console.error("Row upload failed", err);
    // }
  };

  const handleTeamSerialSwap = async (teamId: string, newSerialNumber: number) => {
    if (session.draftStatus === "active") {
      alert("Draft is active. You cannot change team serials.");
      return;
    }
    await updateTeam(teamId, { serialNumber: newSerialNumber });
    await fetchData();
  };

  const updateTeam = async (id: string, updates: any) => {
    await fetch(`/api/teams/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    socket.emit("state_changed");
  };

  const deleteTeam = async (id: string) => {
    if (!confirm("Are you sure you want to delete this team?")) return;
    await fetch(`/api/teams/${id}`, { method: "DELETE" });
    await fetchData();
    socket.emit("state_changed");
  };

  const reverseDraftOrder = async () => {
    if (!confirm("Reverse the draft order for all teams?")) return;
    await fetch("/api/teams/reverse", { method: "POST" });
    await fetchData();
    socket.emit("state_changed");
  };

  const handleExportCSV = (team: any) => {
    const players = team.players || [];

    // Header
    let csv = `Team Report: ${team.name}\n\n`;

    csv += `Player Name,Country,Category,Sub-Category,Position,Price (BDT),Price (USD),Status\n`;

    let totalSpentBDT = BigInt(0);
    let totalSpentUSD = BigInt(0);

    players.forEach((p: any) => {
      const priceBDT = p.isPreBought ? BigInt(0) : BigInt(p.priceBDT || 0);
      const priceUSD = p.isPreBought ? BigInt(0) : BigInt(p.priceUSD || 0);
      const country = p.category == "Local" ? "BD" : (p.country || "");

      totalSpentBDT += priceBDT;
      totalSpentUSD += priceUSD;

      const status = p.isPreBought ? "Pre-Bought" : "Drafted";

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
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${team.name.replace(/\s+/g, '_')}_Report.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Team Management</h2>
          <p className="text-sm text-gray-500 mt-1">Manage franchises and budgets</p>
        </div>
        <button
          onClick={reverseDraftOrder}
          disabled={teams.length === 0}
          className="px-4 py-2 bg-indigo-50 text-indigo-600 font-medium rounded-lg hover:bg-indigo-100 transition disabled:opacity-50"
        >
          Reverse Draft Order
        </button>
      </div>

      <div className="p-6">
        <form onSubmit={handleAddTeam} className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8 bg-gray-50 p-4 rounded-xl border border-gray-200">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Team Name</label>
            <input required value={newTeamName} onChange={e => setNewTeamName(e.target.value)} type="text" className="w-full bg-white border border-gray-300 text-sm rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. Dhaka Dominators" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">BDT Budget</label>
            <input required value={newTeamBudgetBDT} onChange={e => setNewTeamBudgetBDT(e.target.value)} type="number" className="w-full bg-white border border-gray-300 text-sm rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500" placeholder="0" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">USD Budget</label>
            <input required value={newTeamBudgetUSD} onChange={e => setNewTeamBudgetUSD(e.target.value)} type="number" className="w-full bg-white border border-gray-300 text-sm rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500" placeholder="0" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Password</label>
            <input required value={newTeamPassword} onChange={e => setNewTeamPassword(e.target.value)} type="text" className="w-full bg-white border border-gray-300 text-sm rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500" placeholder="Secret" />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Logo URL (or Upload)</label>
            <div className="flex gap-2">
              <input value={newTeamLogo} onChange={e => setNewTeamLogo(e.target.value)} type="text" className="flex-1 bg-white border border-gray-300 text-sm rounded-lg p-2.5" placeholder="Logo path..." />
              <label className="cursor-pointer bg-white border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                {uploading === "logo" ? "..." : "Upload"}
                <input type="file" className="hidden" accept="image/*" onChange={e => handleNewTeamFileUpload(e, "logo")} />
              </label>
            </div>
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Banner URL (or Upload)</label>
            <div className="flex gap-2">
              <input value={newTeamBanner} onChange={e => setNewTeamBanner(e.target.value)} type="text" className="flex-1 bg-white border border-gray-300 text-sm rounded-lg p-2.5" placeholder="Banner path..." />
              <label className="cursor-pointer bg-white border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                {uploading === "banner" ? "..." : "Upload"}
                <input type="file" className="hidden" accept="image/*" onChange={e => handleNewTeamFileUpload(e, "banner")} />
              </label>
            </div>
          </div>

          <div className="md:col-span-6 flex justify-end">
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-md shadow-blue-200">
              Add Team
            </button>
          </div>
        </form>

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-gray-100 rounded-lg w-full"></div>
            <div className="h-12 bg-gray-100 rounded-lg w-full"></div>
            <div className="h-12 bg-gray-100 rounded-lg w-full"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 rounded-t-lg">
                <tr>
                  <th scope="col" className="px-4 py-3">Serial</th>
                  <th scope="col" className="px-4 py-3">Team Name / Branding</th>
                  <th scope="col" className="px-4 py-3">Budget (BDT)</th>
                  <th scope="col" className="px-4 py-3">Budget (USD)</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => (
                  <tr
                    key={team.id}
                    className="border-b hover:bg-gray-100 transition duration-150 group"
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
                      const draggedId = e.dataTransfer.getData("text/plain");
                      if (draggedId && draggedId !== team.id) {
                        // Swap serials!
                        await handleTeamSerialSwap(draggedId, team.serialNumber);
                      }
                    }}
                  >
                    <td className="px-4 py-4 font-medium text-gray-900 cursor-move flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16"></path></svg>
                      <select
                        value={team.serialNumber}
                        onChange={async (e) => {
                          // Swap serials!
                          await handleTeamSerialSwap(team.id, Number(e.target.value));
                        }}
                        className="font-black text-indigo-700 bg-indigo-50 px-2 py-1 rounded shadow-sm border border-indigo-100 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer text-center min-w-[50px]"
                      >
                        {Array.from({ length: teams.length }, (_, i) => i + 1).map(num => (
                          <option key={num} value={num}>{num}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-gray-100 border flex flex-shrink-0 items-center justify-center overflow-hidden">
                          {team.logoUrl ? <img src={team.logoUrl} className="w-full h-full object-contain" /> : <span className="text-[10px] font-bold text-gray-400">LOGO</span>}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 text-base">{team.name}</div>
                          <div className="flex gap-2 mt-1">
                            <label className="text-[10px] uppercase font-bold text-blue-500 cursor-pointer hover:underline">
                              Set Logo
                              <input type="file" className="hidden" accept="image/*" onChange={e => handleRowFileUpload(e, team.id, "logo")} />
                            </label>
                            <label className="text-[10px] uppercase font-bold text-indigo-500 cursor-pointer hover:underline">
                              Set Banner
                              <input type="file" className="hidden" accept="image/*" onChange={e => handleRowFileUpload(e, team.id, "banner")} />
                            </label>
                          </div>
                          {team.bannerUrl && <div className="text-[8px] text-gray-400 truncate max-w-[120px] mt-0.5">Banner: Set</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <input
                        type="number"
                        defaultValue={team.budgetBDT}
                        onBlur={(e) => updateTeam(team.id, { budgetBDT: e.target.value })}
                        className="w-24 px-2 py-1 border rounded"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <input
                        type="number"
                        defaultValue={team.budgetUSD}
                        onBlur={(e) => updateTeam(team.id, { budgetUSD: e.target.value })}
                        className="w-24 px-2 py-1 border rounded"
                      />
                    </td>
                    <td className="px-4 py-4 text-right flex items-center justify-end gap-3">
                      <button
                        onClick={() => handleExportCSV(team)}
                        className="text-indigo-600 hover:text-indigo-800 font-bold text-xs bg-indigo-50 px-2 py-1 rounded"
                      >
                        Export
                      </button>
                      <button onClick={() => deleteTeam(team.id)} className="text-red-500 hover:text-red-700 font-medium text-sm">Delete</button>
                    </td>
                  </tr>
                ))}
                {teams.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-500">No teams registered yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
