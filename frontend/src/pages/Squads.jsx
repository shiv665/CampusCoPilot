import { useState, useEffect, useRef } from "react";
import { api } from "../api/client";
import { motion } from "framer-motion";
import { Users, Search, Shield, Target, Plus, Key, LogOut, MessageCircle, Send, ArrowLeft, User } from "lucide-react";

export default function Squads() {
    const [squads, setSquads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState({ name: "", topic: "", maxMembers: 10 });
    const [creating, setCreating] = useState(false);

    const [showJoin, setShowJoin] = useState(false);
    const [joinCode, setJoinCode] = useState("");
    const [joining, setJoining] = useState(false);

    // Group Search
    const [searchForm, setSearchForm] = useState({ university: "", branch: "" });
    const [searchResults, setSearchResults] = useState([]);
    const [existingSquads, setExistingSquads] = useState([]);
    const [searching, setSearching] = useState(false);

    // Squad detail / chat view
    const [activeSquad, setActiveSquad] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState("");
    const [sendingChat, setSendingChat] = useState(false);
    const chatEndRef = useRef(null);
    const chatPollRef = useRef(null);

    // DM view
    const [dmTarget, setDmTarget] = useState(null); // { user_id, name }
    const [dmMessages, setDmMessages] = useState([]);
    const [dmInput, setDmInput] = useState("");
    const [sendingDm, setSendingDm] = useState(false);
    const dmEndRef = useRef(null);
    const dmPollRef = useRef(null);

    // Current user id
    const [meId, setMeId] = useState(null);

    useEffect(() => {
        loadSquads();
        api.me().then(u => u?.id && setMeId(u.id)).catch(() => { });
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
            setExistingSquads(res.existing_squads || []);
        } catch (e) {
            setError(e.message);
        } finally {
            setSearching(false);
        }
    };

    const handleJoinById = async (squadId) => {
        try {
            await api.joinSquadById(squadId);
            loadSquads();
            handleSearch(); // refresh search results
        } catch (e) {
            setError(e.message);
        }
    };

    const handleJoinGlobal = async (university, branch) => {
        setJoining(true);
        try {
            const res = await api.joinGlobalSquad(university, branch);
            loadSquads();
            handleSearch();
            if (res.squad) {
                openSquadChat(res.squad);
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setJoining(false);
        }
    };

    const openSquadChat = async (squad) => {
        setActiveSquad(squad);
        setDmTarget(null);
        try {
            const detail = await api.getSquad(squad._id);
            setActiveSquad(detail.squad);
            const msgs = await api.getSquadMessages(squad._id);
            setChatMessages(msgs.messages || []);
        } catch (e) { setError(e.message); }
        // Poll for new messages every 5s
        if (chatPollRef.current) clearInterval(chatPollRef.current);
        chatPollRef.current = setInterval(async () => {
            try {
                const msgs = await api.getSquadMessages(squad._id);
                setChatMessages(msgs.messages || []);
            } catch { /* ignore */ }
        }, 5000);
    };

    const closeSquadChat = () => {
        setActiveSquad(null);
        setChatMessages([]);
        setChatInput("");
        if (chatPollRef.current) clearInterval(chatPollRef.current);
    };

    const handleSendChat = async () => {
        if (!chatInput.trim() || !activeSquad) return;
        setSendingChat(true);
        try {
            await api.sendSquadMessage(activeSquad._id, chatInput.trim());
            setChatInput("");
            const msgs = await api.getSquadMessages(activeSquad._id);
            setChatMessages(msgs.messages || []);
        } catch (e) { setError(e.message); }
        finally { setSendingChat(false); }
    };

    const openDm = async (member) => {
        setDmTarget(member);
        setActiveSquad(null);
        if (chatPollRef.current) clearInterval(chatPollRef.current);
        try {
            const res = await api.getDmConversation(member._id || member.user_id);
            setDmMessages(res.messages || []);
        } catch (e) { setError(e.message); }
        if (dmPollRef.current) clearInterval(dmPollRef.current);
        dmPollRef.current = setInterval(async () => {
            try {
                const res = await api.getDmConversation(member._id || member.user_id);
                setDmMessages(res.messages || []);
            } catch { /* ignore */ }
        }, 5000);
    };

    const closeDm = () => {
        setDmTarget(null);
        setDmMessages([]);
        setDmInput("");
        if (dmPollRef.current) clearInterval(dmPollRef.current);
    };

    const handleSendDm = async () => {
        if (!dmInput.trim() || !dmTarget) return;
        setSendingDm(true);
        try {
            await api.sendDm(dmTarget._id || dmTarget.user_id, dmInput.trim());
            setDmInput("");
            const res = await api.getDmConversation(dmTarget._id || dmTarget.user_id);
            setDmMessages(res.messages || []);
        } catch (e) { setError(e.message); }
        finally { setSendingDm(false); }
    };

    // Auto-scroll chat
    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);
    useEffect(() => { dmEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [dmMessages]);
    // Cleanup intervals on unmount
    useEffect(() => () => { clearInterval(chatPollRef.current); clearInterval(dmPollRef.current); }, []);

    // ── DM Full-screen View ──
    if (dmTarget) {
        return (
            <div className="max-w-3xl mx-auto space-y-4">
                <button onClick={closeDm} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors">
                    <ArrowLeft size={16} /> Back
                </button>
                <div className="glass rounded-2xl overflow-hidden border border-slate-200 bg-white flex flex-col" style={{ height: "75vh" }}>
                    <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-purple-50 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
                            {dmTarget.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <h2 className="font-bold text-slate-800">{dmTarget.name}</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {dmMessages.length === 0 && <p className="text-center text-slate-400 text-sm py-10">No messages yet. Say hello!</p>}
                        {dmMessages.map((m, i) => {
                            const isMe = m.from_id === meId;
                            return (
                                <div key={m._id || i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                    <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${isMe ? "bg-indigo-600 text-white rounded-br-md" : "bg-slate-100 text-slate-800 rounded-bl-md"}`}>
                                        {m.text}
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={dmEndRef} />
                    </div>
                    <div className="p-3 border-t border-slate-200 flex gap-2">
                        <input value={dmInput} onChange={e => setDmInput(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSendDm()}
                            placeholder="Type your message..." className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        <button onClick={handleSendDm} disabled={!dmInput.trim() || sendingDm} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-colors">
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Squad Chat Full-screen View ──
    if (activeSquad) {
        return (
            <div className="max-w-4xl mx-auto space-y-4">
                <button onClick={closeSquadChat} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors">
                    <ArrowLeft size={16} /> Back to Squads
                </button>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ height: "75vh" }}>
                    {/* Chat Panel */}
                    <div className="md:col-span-2 glass rounded-2xl overflow-hidden border border-slate-200 bg-white flex flex-col">
                        <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                            <h2 className="font-bold text-slate-800 flex items-center gap-2">
                                <MessageCircle size={18} className="text-indigo-600" /> {activeSquad.name}
                            </h2>
                            {activeSquad.topic && <p className="text-xs text-slate-500 mt-0.5">{activeSquad.topic}</p>}
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {chatMessages.length === 0 && <p className="text-center text-slate-400 text-sm py-10">No messages yet. Start the conversation!</p>}
                            {chatMessages.map((m, i) => {
                                const isMe = m.sender_id === meId;
                                return (
                                    <div key={m._id || i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                        <div className={`max-w-[75%] ${isMe ? "" : "flex gap-2"}`}>
                                            {!isMe && (
                                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-1">
                                                    {m.sender_name?.charAt(0)?.toUpperCase() || "?"}
                                                </div>
                                            )}
                                            <div>
                                                {!isMe && <p className="text-[10px] text-slate-400 mb-0.5 ml-1">{m.sender_name}</p>}
                                                <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMe ? "bg-indigo-600 text-white rounded-br-md" : "bg-slate-100 text-slate-800 rounded-bl-md"}`}>
                                                    {m.text}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={chatEndRef} />
                        </div>
                        <div className="p-3 border-t border-slate-200 flex gap-2">
                            <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSendChat()}
                                placeholder="Type your message..." className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            <button onClick={handleSendChat} disabled={!chatInput.trim() || sendingChat} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-colors">
                                <Send size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Members Panel */}
                    <div className="glass rounded-2xl overflow-hidden border border-slate-200 bg-white flex flex-col">
                        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                            <h3 className="font-bold text-sm text-slate-700 flex items-center gap-2">
                                <Users size={14} /> Members ({activeSquad.members?.length || 0})
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {(activeSquad.members || []).map((m, i) => (
                                <div key={m._id || i} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                                            {m.name?.charAt(0)?.toUpperCase() || "?"}
                                        </div>
                                        <span className="text-sm text-slate-700 font-medium">{m.name}</span>
                                    </div>
                                    {m._id !== meId && (
                                        <button onClick={() => openDm(m)} className="text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2 py-1 rounded transition-colors" title="Direct Message">
                                            <MessageCircle size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="p-3 border-t border-slate-200">
                            <div className="text-[10px] text-slate-400 text-center">Invite Code: <span className="font-mono font-bold text-indigo-600">{activeSquad.invite_code}</span></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Main Squad List View ──
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
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm cursor-pointer" onClick={() => setError("")}>
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
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} key={s._id}
                            className="glass p-6 rounded-2xl relative overflow-hidden group hover:border-indigo-300 transition-colors bg-white cursor-pointer"
                            onClick={() => openSquadChat(s)}
                        >
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
                                        {s.members?.length || 0} / {s.max_members || 10} members
                                    </span>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center relative z-10">
                                <span className="text-xs text-indigo-600 font-medium flex items-center gap-1">
                                    <MessageCircle size={12} /> Open Chat
                                </span>
                                <button onClick={(e) => { e.stopPropagation(); handleLeave(s._id); }} className="text-xs font-medium text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded transition-colors">
                                    Leave
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* University Search Section */}
            <h2 className="text-xl font-bold flex items-center gap-2 mt-12 text-slate-800">
                <Search className="text-indigo-500" size={24} /> Find Classmates & Squads
            </h2>
            <div className="glass p-6 rounded-2xl border border-slate-200 bg-white/50">
                <div className="flex flex-col md:flex-row gap-3 items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-sm font-medium text-slate-600 mb-1">University</label>
                        <input value={searchForm.university} onChange={e => setSearchForm({ ...searchForm, university: e.target.value })} placeholder="Enter university name" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm" />
                    </div>
                    <div className="flex-1 w-full">
                        <label className="block text-sm font-medium text-slate-600 mb-1">Branch / Major</label>
                        <input value={searchForm.branch} onChange={e => setSearchForm({ ...searchForm, branch: e.target.value })} placeholder="Enter major/branch" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm" />
                    </div>
                    <button onClick={handleSearch} disabled={searching || (!searchForm.university && !searchForm.branch)} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors w-full md:w-auto h-[42px] shadow-sm">
                        {searching ? "Searching..." : "Search"}
                    </button>
                </div>

                {/* Existing Squads from Search */}
                {existingSquads.length > 0 && (
                    <div className="mt-6 space-y-3">
                        <h3 className="text-sm font-semibold text-indigo-600 flex items-center gap-1.5"><Shield size={14} /> Existing Squads You Can Join</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {existingSquads.map((sq) => {
                                const isMember = sq.members?.some(m => m._id === meId);
                                return (
                                    <div key={sq._id} className="bg-white border border-indigo-100 rounded-xl p-4 shadow-sm">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-semibold text-slate-800">{sq.name}</div>
                                                {sq.topic && <div className="text-xs text-slate-500 mt-0.5">{sq.topic}</div>}
                                            </div>
                                            <span className="text-[10px] px-2 py-0.5 bg-slate-100 rounded font-mono text-slate-500">
                                                {sq.members?.length || 0}/{sq.max_members || 10}
                                            </span>
                                        </div>
                                        <div className="mt-2 flex -space-x-2">
                                            {sq.members?.slice(0, 5).map((m, mi) => (
                                                <div key={mi} className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 border-2 border-white flex items-center justify-center text-[9px] font-bold text-white" title={m.name}>
                                                    {m.name?.charAt(0)?.toUpperCase() || "?"}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-3 pt-2 border-t border-slate-100">
                                            {isMember ? (
                                                <button onClick={() => openSquadChat(sq)} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-lg flex items-center gap-1 hover:bg-indigo-100 transition-colors">
                                                    <MessageCircle size={12} /> Open Chat
                                                </button>
                                            ) : (
                                                <button onClick={() => handleJoinById(sq._id)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg flex items-center gap-1 transition-colors shadow-sm">
                                                    <Users size={12} /> Join Squad
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Global Major Hubs from Search */}
                {searchResults.length > 0 && (
                    <div className="mt-6 space-y-3">
                        <h3 className="text-sm font-semibold text-slate-500 flex items-center gap-1.5"><User size={14} /> Global Major Hubs</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {searchResults.map((g, i) => (
                                <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow transition-shadow">
                                    <div className="font-semibold text-slate-800">{g.group_name}</div>
                                    <div className="text-xs text-slate-500 mt-1">{g.members.length} student(s) from this major are using CampusCoPilot.</div>
                                    {g.members.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                            {g.members.slice(0, 5).map((m, mi) => (
                                                <div key={mi} className="flex items-center gap-2 text-xs text-slate-600">
                                                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white">
                                                        {m.name?.charAt(0)?.toUpperCase() || "?"}
                                                    </div>
                                                    <span>{m.name}</span>
                                                </div>
                                            ))}
                                            {g.members.length > 5 && (
                                                <div className="pl-7 text-[10px] text-slate-400">+{g.members.length - 5} more...</div>
                                            )}
                                        </div>
                                    )}
                                    {g.subjects?.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                            {g.subjects.map((sub, j) => (
                                                <span key={j} className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-700 font-medium border border-indigo-100 rounded-full">{sub}</span>
                                            ))}
                                        </div>
                                    )}
                                    <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
                                        <button
                                            onClick={() => handleJoinGlobal(g.university, g.branch)}
                                            disabled={joining}
                                            className="w-full px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 disabled:opacity-50 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                                        >
                                            <MessageCircle size={14} /> {joining ? "Joining..." : "Join Hub Chat"}
                                        </button>
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
                                <input value={createForm.topic} onChange={e => setCreateForm({ ...createForm, topic: e.target.value })} placeholder="Enter focus topic" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
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
                            <input value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="Enter invite code" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono tracking-widest text-center text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
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
