import { useState, useEffect } from "react";
import { api } from "../api/client";
import { motion } from "framer-motion";
import { Users, Search, Shield, Target, Plus, Key, LogOut } from "lucide-react";

export default function Squads() {
    const [squads, setSquads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState({ name: "", topic: "", maxMembers: 5 });
    const [creating, setCreating] = useState(false);

    const [showJoin, setShowJoin] = useState(false);
    const [joinCode, setJoinCode] = useState("");
    const [joining, setJoining] = useState(false);

    // Group Search
    const [searchForm, setSearchForm] = useState({ university: "", branch: "" });
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        loadSquads();
    }, []);

    const loadSquads = async () => {
        setLoading(true);
        try {
            const res = await api.listSquads();
            setSquads(res.squads || []);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!createForm.name) return;
        setCreating(true);
        try {
            await api.createSquad(createForm.name, createForm.topic, createForm.maxMembers);
            setShowCreate(false);
            setCreateForm({ name: "", topic: "", maxMembers: 5 });
            loadSquads();
        } catch (e) {
            setError(e.message);
        } finally {
            setCreating(false);
        }
    };

    const handleJoin = async () => {
        if (!joinCode) return;
        setJoining(true);
        try {
            await api.joinSquad(joinCode);
            setShowJoin(false);
            setJoinCode("");
            loadSquads();
        } catch (e) {
            setError(e.message);
        } finally {
            setJoining(false);
        }
    };

    const handleLeave = async (squadId) => {
        if (!confirm("Leave this squad?")) return;
        try {
            await api.leaveSquad(squadId);
            loadSquads();
        } catch (e) {
            setError(e.message);
        }
    };

    const handleSearch = async () => {
        setSearching(true);
        try {
            const res = await api.searchStudyGroups(searchForm.university, searchForm.branch);
            setSearchResults(res.groups || []);
        } catch (e) {
            setError(e.message);
        } finally {
            setSearching(false);
        }
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 flex items-center gap-3">
                        <Users className="text-indigo-600" size={32} /> Study Squads
                    </h1>
                    <p className="text-slate-500 mt-1 text-lg">Join forces, share knowledge, and conquer the semester together.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setShowJoin(true)} className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-xl transition-colors border border-slate-200 shadow-sm flex items-center gap-2">
                        <Key size={18} className="text-slate-400" /> Join via Code
                    </button>
                    <button onClick={() => setShowCreate(true)} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors shadow-md flex items-center gap-2">
                        <Plus size={18} className="text-indigo-200" /> Create Squad
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
                    {error}
                </div>
            )}

            {/* Main Squads Grid */}
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800 mt-10">
                <Shield className="text-indigo-500" size={24} /> Your Active Squads
            </h2>

            {loading ? (
                <div className="text-center py-12 text-slate-500">Loading squads...</div>
            ) : squads.length === 0 ? (
                <div className="glass p-12 text-center rounded-2xl flex flex-col items-center">
                    <Users size={64} strokeWidth={1} className="text-slate-300 mb-4" />
                    <h3 className="text-xl font-medium text-slate-700">No squads yet</h3>
                    <p className="text-slate-500 mb-6 mt-1 sm:max-w-md mx-auto">Create a squad and invite your friends, or join an existing one.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {squads.map((s, i) => (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} key={s._id} className="glass p-6 rounded-2xl relative overflow-hidden group hover:border-indigo-300 transition-colors bg-white">
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <h3 className="font-bold text-lg text-slate-800">{s.name}</h3>
                                <span className="px-2.5 py-1 bg-indigo-50 rounded-md border border-indigo-100 text-xs font-mono font-medium text-indigo-700" title="Invite Code">
                                    {s.invite_code}
                                </span>
                            </div>

                            <div className="space-y-4 relative z-10">
                                {s.topic && (
                                    <p className="text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 flex items-center gap-2">
                                        <Target size={14} className="text-slate-400" /> {s.topic}
                                    </p>
                                )}

                                <div className="flex items-center gap-2">
                                    <div className="flex -space-x-3">
                                        {s.members?.slice(0, 3).map((m, idx) => (
                                            <div key={idx} className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-sm" title={m.name}>
                                                {m.name.charAt(0).toUpperCase()}
                                            </div>
                                        ))}
                                        {s.members?.length > 3 && (
                                            <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-xs font-bold text-slate-600 shadow-sm">
                                                +{s.members.length - 3}
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-xs text-slate-500 font-medium ml-1">
                                        {s.members?.length || 0} / {s.max_members || 5} members
                                    </span>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end relative z-10">
                                <button onClick={() => handleLeave(s._id)} className="text-xs font-medium text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded transition-colors">
                                    Leave Squad
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* University Search Section */}
            <h2 className="text-xl font-bold flex items-center gap-2 mt-12 text-slate-800">
                <Search className="text-indigo-500" size={24} /> Find Classmates
            </h2>
            <div className="glass p-6 rounded-2xl border border-slate-200 bg-white/50">
                <div className="flex flex-col md:flex-row gap-3 items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-sm font-medium text-slate-600 mb-1">University</label>
                        <input value={searchForm.university} onChange={e => setSearchForm({ ...searchForm, university: e.target.value })} placeholder="e.g. Stanford University" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm" />
                    </div>
                    <div className="flex-1 w-full">
                        <label className="block text-sm font-medium text-slate-600 mb-1">Branch / Major</label>
                        <input value={searchForm.branch} onChange={e => setSearchForm({ ...searchForm, branch: e.target.value })} placeholder="e.g. Computer Science" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm" />
                    </div>
                    <button onClick={handleSearch} disabled={searching || (!searchForm.university && !searchForm.branch)} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors w-full md:w-auto h-[42px] shadow-sm">
                        {searching ? "Searching..." : "Search"}
                    </button>
                </div>

                {searchResults.length > 0 && (
                    <div className="mt-6 space-y-4">
                        <h3 className="text-sm font-semibold text-slate-500">Results</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {searchResults.map((g, i) => (
                                <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow transition-shadow">
                                    <div className="font-semibold text-slate-800">{g.group_name}</div>
                                    <div className="text-xs text-slate-500 mt-1">{g.members.length} student(s) from this major are using CampusCoPilot.</div>
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                        {g.subjects.map((sub, j) => (
                                            <span key={j} className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-700 font-medium border border-indigo-100 rounded-full">{sub}</span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showCreate && (
                <div className="fixed inset-0 bg-slate-800/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-6 w-full max-w-sm rounded-2xl relative overflow-hidden shadow-2xl border border-slate-100">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                        <h2 className="text-xl font-bold mb-4 text-slate-800">Create Squad</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Squad Name</label>
                                <input value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Focus Topic (Optional)</label>
                                <input value={createForm.topic} onChange={e => setCreateForm({ ...createForm, topic: e.target.value })} placeholder="e.g. CS101 Finals Prep" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Max Members</label>
                                <input type="number" min="2" max="20" value={createForm.maxMembers} onChange={e => setCreateForm({ ...createForm, maxMembers: parseInt(e.target.value) || 5 })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end mt-6">
                            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
                            <button onClick={handleCreate} disabled={!createForm.name || creating} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
                                {creating ? "Creating..." : "Create"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showJoin && (
                <div className="fixed inset-0 bg-slate-800/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-6 w-full max-w-sm rounded-2xl relative overflow-hidden shadow-2xl border border-slate-100">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                        <h2 className="text-xl font-bold mb-4 text-slate-800">Join Squad</h2>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Invite Code</label>
                            <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="e.g. SQ-12345" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono uppercase tracking-widest text-center text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div className="flex gap-3 justify-end mt-6">
                            <button onClick={() => setShowJoin(false)} className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
                            <button onClick={handleJoin} disabled={!joinCode || joining} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
                                {joining ? "Joining..." : "Join Squad"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
