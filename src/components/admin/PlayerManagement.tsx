"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { getSocket } from "@/lib/socketClient";
import CSVBulkUploader from "@/components/admin/CSVBulkUploader";
import { useDraftStore } from "@/lib/draftStore";
import type { ApiPlayer, ApiTeam } from "@/types/domain";

export default function PlayerManagement({ teams }: { teams: ApiTeam[] }) {
  const players = useDraftStore((state) => state.players);
  const loading = useDraftStore((state) => state.loading);
  const fetchAll = useDraftStore((state) => state.fetchAll);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Oversea");
  const [subCategory, setSubCategory] = useState("A");
  const [position, setPosition] = useState("");
  const [priceBDT, setPriceBDT] = useState("");
  const [priceUSD, setPriceUSD] = useState("");
  const [country, setCountry] = useState("");
  const [availability, setAvailability] = useState("Full-Time");
  const [imageUrl, setImageUrl] = useState("");
  const [isPreBought, setIsPreBought] = useState(false);
  const [preBoughtTeamId, setPreBoughtTeamId] = useState("");
  const [uploading, setUploading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // State for list filtering
  const [listCategory, setListCategory] = useState<"Oversea" | "Local">("Oversea");
  const [listSubCategory, setListSubCategory] = useState<string>("All");
  const [listSearch, setListSearch] = useState("");

  const [showCsvUploader, setShowCsvUploader] = useState(false);

  const socket = getSocket();

  useEffect(() => {
    if (players.length === 0) {
      void fetchAll();
    }
  }, [fetchAll, players.length]);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [listCategory, listSubCategory, listSearch]);

  const resetForm = () => {
    setEditingPlayerId(null);
    setName("");
    setPosition("");
    setPriceBDT("");
    setPriceUSD("");
    setImageUrl("");
    setIsPreBought(false);
    setPreBoughtTeamId("");
    setCountry("");
  };

  const handleAddOrUpdatePlayer = async (e: React.SubmitEvent) => {
    e.preventDefault();
    const url = editingPlayerId ? `/api/players/${editingPlayerId}` : "/api/players";
    const method = editingPlayerId ? "PATCH" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, category, subCategory, position,
        priceBDT, priceUSD, country, availability, imageUrl,
        isPreBought, teamId: preBoughtTeamId ? (preBoughtTeamId.length === 0 ? null : preBoughtTeamId) : null
      }),
    });

    socket.emit("state_changed");
    await fetchAll({ silent: true, force: true });
    resetForm();
  };

  const deletePlayer = async (id: string) => {
    if (!confirm("Delete player?")) return;
    await fetch(`/api/players/${id}`, { method: "DELETE" });
    socket.emit("state_changed");
    await fetchAll({ silent: true, force: true });
  };

  const handleDeleteAllByCategory = async (cat: string) => {
    if (!confirm(`Are you absolutely sure you want to delete ALL ${cat} players? This cannot be undone.`)) return;
    await fetch(`/api/players/bulk?category=${cat}`, { method: "DELETE" });
    socket.emit("state_changed");
    await fetchAll({ silent: true, force: true });
  };

  const startEdit = (player: ApiPlayer) => {
    setEditingPlayerId(player.id);
    setName(player.name);
    setCategory(player.category);
    setSubCategory(player.subCategory);
    setPosition(player.position);
    setPriceBDT(player.priceBDT?.toString() || "");
    setPriceUSD(player.priceUSD?.toString() || "");
    setCountry(player.country || "");
    setAvailability(player.availability || "Full-Time");
    setImageUrl(player.imageUrl || "");
    setIsPreBought(player.isPreBought);
    setPreBoughtTeamId(player.teamId || "");

    // Scroll to top to see form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setImageUrl(data.url);
      }
    } catch (err: unknown) {
      console.error("Upload failed", err);
    } finally {
      setUploading(false);
    }
  };

  const handleRowFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, playerId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        await fetch(`/api/players/${playerId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: data.url }),
        });
        socket.emit("state_changed");
        await fetchAll({ silent: true, force: true });
      }
    } catch (err: unknown) {
      console.error("Direct upload failed", err);
    }
  };

  const filteredPlayers = players.filter((p) => {
    if (p.category !== listCategory) return false;
    if (listSubCategory !== "All" && p.subCategory !== listSubCategory) return false;
    if (listSearch && !p.name.toLowerCase().includes(listSearch.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredPlayers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPlayers = filteredPlayers.slice(startIndex, startIndex + itemsPerPage);

  const [assigningId, setAssigningId] = useState<string | null>(null);

  const handleManualAssign = async (playerId: string, teamId: string) => {
    if (!teamId) return;

    if (!confirm(`Are you sure you want to assign this player? This will update budgets and counts.`)) {
      // Logic to reset dropdown would be nice but simple refresh/alert is fine
      return;
    }

    setAssigningId(playerId);
    try {
      const res = await fetch(`/api/players/${playerId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      const data = await res.json();

      if (res.ok) {
        // Trigger latest pick animation
        socket.emit("pick_made", {
          player: data.player,
          team: data.team
        });

        socket.emit("state_changed");
        await fetchAll({ silent: true, force: true });
      } else {
        alert(data.error || "Assignment failed");
      }
    } catch {
      alert("Error assigning player");
    } finally {
      setAssigningId(null);
    }
  };

  const triggerAnimation = (player: ApiPlayer) => {
    if (!player.team) {
      alert("Cannot trigger animation for a player without a team!");
      return;
    }
    socket.emit("pick_made", { player, team: player.team });
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Player Management</h2>
          <p className="text-sm text-gray-500 mt-1">Add players to the draft pool or register pre-bought contracts</p>
        </div>
        <button
          onClick={() => setShowCsvUploader(!showCsvUploader)}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-all shadow-sm ${showCsvUploader ? "bg-gray-200 text-gray-700 hover:bg-gray-300" : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
            }`}
        >
          {showCsvUploader ? "Close CSV Tool" : "Bulk Upload CSV"}
        </button>
      </div>

      <div className="p-6">
        {showCsvUploader && (
          <div className="mb-8 p-1 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-xl">
            <CSVBulkUploader onImportComplete={() => { void fetchAll({ silent: true, force: true }); setShowCsvUploader(false); }} />
          </div>
        )}

        <form onSubmit={handleAddOrUpdatePlayer} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10 bg-gray-50 p-6 rounded-2xl border border-gray-200 shadow-inner">
          <div className="md:col-span-4 flex justify-between items-center mb-2">
            <h3 className="text-sm font-black text-gray-700 uppercase tracking-tighter">{editingPlayerId ? "Edit Player" : "Add New Player"}</h3>
            {editingPlayerId && <button onClick={resetForm} type="button" className="text-xs font-bold text-red-500 hover:underline">Cancel Edit</button>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Name</label>
            <input required value={name} onChange={e => setName(e.target.value)} type="text" className="w-full bg-white border border-gray-300 text-sm rounded-lg p-2.5" placeholder="Player Name" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-white border border-gray-300 text-sm rounded-lg p-2.5">
              <option value="Oversea">Oversea</option>
              <option value="Local">Local</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Sub-Category</label>
            <select value={subCategory} onChange={e => setSubCategory(e.target.value)} className="w-full bg-white border border-gray-300 text-sm rounded-lg p-2.5">
              {['A', 'B', 'C', 'D', 'E', 'F'].map(c => <option key={c} value={c}>Category {c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Position</label>
            <input required value={position} onChange={e => setPosition(e.target.value)} type="text" className="w-full bg-white border border-gray-300 text-sm rounded-lg p-2.5" placeholder="e.g. Batsman" />
          </div>

          <div className="flex flex-col gap-4 md:col-span-2">
            <div className="grid grid-cols-2 gap-4">
              {category === "Local" ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Price (BDT)</label>
                  <input required value={priceBDT} onChange={e => setPriceBDT(e.target.value)} type="number" className="w-full bg-white border border-gray-300 text-sm rounded-lg p-2.5" placeholder="0" />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Price (USD)</label>
                  <input required value={priceUSD} onChange={e => setPriceUSD(e.target.value)} type="number" className="w-full bg-white border border-gray-300 text-sm rounded-lg p-2.5" placeholder="0" />
                </div>
              )}
              {category === "Oversea" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Country</label>
                  <input required value={country} onChange={e => setCountry(e.target.value)} type="text" className="w-full bg-white border border-gray-300 text-sm rounded-lg p-2.5" placeholder="Country" />
                </div>
              )}
            </div>
            {category === "Oversea" && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Availability</label>
                <select value={availability} onChange={e => setAvailability(e.target.value)} className="w-full bg-white border border-gray-300 text-sm rounded-lg p-2.5">
                  <option value="Full-Time">Full-Time</option>
                  <option value="Partial">Partial</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>
            )}
          </div>

          <div className="md:col-span-2 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Player Image</label>
              <div className="flex gap-2">
                <input
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  type="text"
                  className="flex-1 bg-white border border-gray-300 text-sm rounded-lg p-2.5"
                  placeholder="Paste URL or upload..."
                />
                <label className="cursor-pointer bg-white border border-gray-300 p-2.5 rounded-lg hover:bg-gray-100 transition shadow-sm flex items-center justify-center min-w-[100px]">
                  <span className="text-xs font-bold text-gray-600 truncate max-w-[80px]">{uploading ? "..." : "Upload"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
              {imageUrl && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="w-8 h-8 rounded border overflow-hidden">
                    <Image src={imageUrl} alt="Player preview" width={32} height={32} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] text-gray-400 truncate max-w-[200px]">{imageUrl}</span>
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <input type="checkbox" id="preBought" checked={isPreBought} onChange={e => setIsPreBought(e.target.checked)} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 focus:ring-2" />
              <label htmlFor="preBought" className="text-sm font-black text-gray-700 uppercase tracking-tight">Register as Pre-bought?</label>
            </div>

            {(isPreBought || editingPlayerId) && (
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  {isPreBought ? "Assign To Team (Pre-bought)" : "Manually Assign/Re-assign To Team"}
                </label>
                <select value={preBoughtTeamId} onChange={e => setPreBoughtTeamId(e.target.value)} className="w-full bg-gray-50 border border-gray-300 text-sm rounded-lg p-2.5 font-bold italic text-blue-800">
                  <option value="">{editingPlayerId ? "Unassign" : "Select a team..."}</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <p className="text-[9px] text-gray-400 mt-1 uppercase font-bold tracking-tight">* Changing this for a drafted player will auto-swap budgets and counts.</p>
              </div>
            )}
          </div>

          <div className="md:col-span-4 flex justify-end">
            <button type="submit" className="px-10 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-sm tracking-widest hover:bg-blue-700 transition shadow-lg shadow-blue-200 transform active:scale-95">
              {editingPlayerId ? "Update Player" : "Add to Pool"}
            </button>
          </div>
        </form>

        {/* List Header with Tabs and Filters */}
        <div className="flex flex-col gap-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-end gap-4">
            <div className="flex p-1 bg-gray-200 rounded-xl w-fit">
              <button onClick={() => setListCategory("Oversea")} className={`px-6 py-2 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${listCategory === "Oversea" ? "bg-white shadow-md text-blue-700" : "text-gray-500 hover:text-gray-700"}`}>Oversea</button>
              <button onClick={() => setListCategory("Local")} className={`px-6 py-2 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${listCategory === "Local" ? "bg-white shadow-md text-blue-700" : "text-gray-500 hover:text-gray-700"}`}>Local</button>
            </div>

            <button onClick={() => handleDeleteAllByCategory(listCategory)} className="text-red-500 border border-red-200 bg-red-50 px-4 py-2 rounded-lg text-xs font-black uppercase hover:bg-red-100 transition">
              Delete All {listCategory}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm items-end">
            <div className="flex-1">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Search Player</label>
              <div className="relative">
                <input value={listSearch} onChange={e => setListSearch(e.target.value)} type="text" placeholder="Name..." className="w-full bg-gray-50 border border-gray-200 text-sm rounded-lg pl-9 pr-4 py-2" />
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Sub-Category</label>
              <select value={listSubCategory} onChange={e => setListSubCategory(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-sm rounded-lg p-2 transition hover:border-gray-300">
                <option value="All">All Categories</option>
                {['A', 'B', 'C', 'D', 'E', 'F'].map(c => <option key={c} value={c}>Category {c}</option>)}
              </select>
            </div>
            <div className="text-right text-xs font-black text-gray-400 uppercase tracking-tight pb-3 pr-2 flex flex-col items-end">
              <div>Showing {paginatedPlayers.length} / {filteredPlayers.length}</div>
              <div className="text-[10px] text-gray-300 mt-0.5">Total pool: {players.filter(p => p.category === listCategory).length}</div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-gray-100 rounded-lg w-full"></div>
            <div className="h-10 bg-gray-100 rounded-lg w-full"></div>
            <div className="h-10 bg-gray-100 rounded-lg w-full"></div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="overflow-x-auto border border-gray-100 rounded-2xl shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] font-black text-gray-400 uppercase bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th scope="col" className="px-6 py-4">Player Details</th>
                    <th scope="col" className="px-6 py-4">Price / Info</th>
                    <th scope="col" className="px-6 py-4">Draft Status</th>
                    <th scope="col" className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedPlayers.map((player) => (
                    <tr key={player.id} className="bg-white hover:bg-blue-50/30 transition group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0 border overflow-hidden flex items-center justify-center font-bold text-gray-400 shadow-sm border-white">
                            {player.imageUrl ? (
                              <Image src={player.imageUrl} alt={`${player.name} photo`} width={40} height={40} className="w-full h-full object-cover" />
                            ) : (
                              player.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <div className="font-black text-gray-900 leading-tight">{player.name}</div>
                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{player.position} • Category {player.subCategory}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-mono font-black text-indigo-600">
                          {player.category === "Local" ? `${Number(player.priceBDT || 0).toLocaleString()} BDT` : `$${Number(player.priceUSD || 0).toLocaleString()}`}
                        </div>
                        {player.country && <div className="text-[10px] text-gray-400 font-bold uppercase">{player.country} • {player.availability}</div>}
                      </td>
                      <td className="px-6 py-4">
                        {player.team ? (
                          <div className="flex flex-col gap-1">
                            <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full w-fit ${player.isPreBought ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                              {player.team.name}
                            </span>
                          </div>
                        ) : (
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-100">Available</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => startEdit(player)} className="p-2 text-gray-400 hover:text-blue-600 transition hover:bg-blue-50 rounded-lg group-hover:bg-white/50">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5m-5-5l5 5m0 0l-5 5m5-5H12"></path></svg>
                          </button>

                          <label className="p-2 text-gray-400 hover:text-emerald-600 transition hover:bg-emerald-50 rounded-lg group-hover:bg-white/50 cursor-pointer">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleRowFileUpload(e, player.id)} />
                          </label>

                          {player.team ? (
                            <button
                              onClick={() => triggerAnimation(player)}
                              className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-tighter transition shadow-sm border border-indigo-100"
                            >
                              Broadcast
                            </button>
                          ) : (
                            <div className="flex items-center gap-1">
                              <select
                                disabled={assigningId === player.id}
                                value={""}
                                onChange={(e) => handleManualAssign(player.id, e.target.value)}
                                className="text-[10px] font-bold bg-white border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 outline-none w-28 uppercase cursor-pointer hover:border-blue-300 transition"
                              >
                                <option value="">Assign To...</option>
                                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                              </select>
                              <button onClick={() => deletePlayer(player.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition hover:bg-red-50 rounded-lg">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginatedPlayers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-20 bg-gray-50/50">
                        <div className="flex flex-col items-center">
                          <svg className="w-12 h-12 text-gray-200 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                          <span className="text-sm font-bold text-gray-400 italic">No players found match your current filters.</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="text-xs font-black text-gray-400 uppercase tracking-widest">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-black uppercase text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition shadow-sm"
                  >
                    Previous
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-black uppercase text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition shadow-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
