import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Calendar,
  Route,
  Save,
  Users,
  Camera,
  Brain,
  Timer,
  TrendingUp,
  Briefcase,
  Medal,
  UserCircle,
  LogOut,
  Plus,
  Bell,
  Trash2,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { useNotification } from "../context/NotificationContext";

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', color: 'from-blue-500 to-cyan-500', exact: true },
  { path: '/planner', icon: Calendar, label: 'Study Planner', color: 'from-indigo-500 to-blue-500' },
  { path: '/campaign', icon: Route, label: 'Campaign', color: 'from-purple-500 to-indigo-500' },
  { path: '/sessions', icon: Save, label: 'Saved Roadmaps', color: 'from-fuchsia-500 to-purple-500' },
  { path: '/squads', icon: Users, label: 'Study Squads', color: 'from-pink-500 to-rose-500' },
  { path: '/scan-notes', icon: Camera, label: 'Notes Scanner', color: 'from-rose-500 to-orange-500' },
  { path: '/micro-tutor', icon: Brain, label: 'Micro-Tutor', color: 'from-orange-500 to-amber-500' },
  { path: '/pomodoro', icon: Timer, label: 'Pomodoro', color: 'from-amber-500 to-yellow-500' },
  { path: '/analytics', icon: TrendingUp, label: 'Analytics', color: 'from-emerald-500 to-teal-500' },
  { path: '/portfolio', icon: Briefcase, label: 'Portfolio', color: 'from-teal-500 to-cyan-500' },
  { path: '/achievements', icon: Medal, label: 'Achievements', color: 'from-cyan-500 to-blue-500' },
  { path: '/profile', icon: UserCircle, label: 'Profile', color: 'from-blue-500 to-indigo-500' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { history, clearHistory } = useNotification();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-4 items-end pointer-events-none">

      {/* Notifications Drawer & Button Container */}
      <div className="relative flex flex-col items-end pointer-events-auto">
        <AnimatePresence>
          {notifOpen && (
            <motion.div
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className="absolute bottom-16 right-0 mb-2 w-80 bg-white/90 backdrop-blur-xl border border-slate-200/60 shadow-2xl rounded-2xl overflow-hidden flex flex-col z-[100]"
            >
              <div className="p-4 border-b border-slate-200/50 bg-slate-50/50 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Bell size={18} className="text-indigo-600" /> Notifications
                </h3>
                {history.length > 0 && (
                  <button onClick={clearHistory} className="text-xs font-medium text-slate-500 hover:text-rose-600 flex items-center gap-1 transition-colors">
                    <Trash2 size={14} /> Clear
                  </button>
                )}
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-2 scrollbar-hide space-y-1 bg-gradient-to-b from-white to-slate-50/30">
                {history.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 flex flex-col items-center">
                    <Bell size={24} className="mb-2 opacity-30" />
                    <p className="text-sm font-medium">All caught up!</p>
                  </div>
                ) : (
                  history.map((n, i) => (
                    <div key={i} className={`p-3 rounded-xl border flex items-start gap-3 transition-colors ${n.type === 'success' ? 'bg-emerald-50/50 border-emerald-100/50' :
                      n.type === 'error' ? 'bg-rose-50/50 border-rose-100/50' :
                        'bg-white border-slate-100'
                      }`}>
                      {n.type === "success" && <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />}
                      {n.type === "error" && <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />}
                      {n.type === "info" && <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />}

                      <div>
                        <p className="text-sm text-slate-700 font-medium leading-tight">{n.message}</p>
                        <p className="text-[10px] text-slate-400 mt-1 font-mono uppercase tracking-wider">{new Date(n.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => { setNotifOpen(!notifOpen); setOpen(false); }}
          whileTap={{ scale: 0.9 }}
          className="relative group w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-105 hover:border-indigo-300"
        >
          <Bell size={22} className="text-slate-600 group-hover:text-indigo-600 transition-colors drop-shadow-sm" />
          {history.length > 0 && (
            <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-white shadow-sm" />
          )}
        </motion.button>
      </div>

      {/* Main Menu & FAB Container */}
      <div className="relative flex flex-col items-end pointer-events-auto">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute bottom-16 right-0 mb-2"
            >
              <div className="flex flex-col gap-3 items-end max-h-[75vh] overflow-y-auto pr-2 pb-2 scrollbar-hide">
                {navItems.map((item, index) => (
                  <motion.div
                    key={item.path}
                    initial={{ opacity: 0, x: 20, y: 10 }}
                    animate={{ opacity: 1, x: 0, y: 0 }}
                    exit={{ opacity: 0, x: 20, y: 10 }}
                    transition={{ delay: index * 0.03 }}
                    className="group relative flex items-center gap-3"
                  >
                    <motion.span
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white backdrop-blur-sm rounded-lg border border-slate-200 shadow-lg whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>

                    <NavLink
                      to={item.path}
                      end={item.exact}
                      onClick={() => setOpen(false)}
                      className="relative group/btn"
                    >
                      <span className="absolute inset-0 w-12 h-12 rounded-full bg-slate-900/5 opacity-0 group-hover/btn:opacity-20 transition-all duration-300 pointer-events-none" />
                      <span className="absolute inset-0 w-12 h-12 rounded-full bg-slate-900/5 opacity-0 group-hover/btn:opacity-40 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-all duration-300 pointer-events-none" />
                      <span className="absolute inset-0 w-12 h-12 rounded-full bg-slate-900/5 opacity-0 group-hover/btn:opacity-60 group-hover/btn:translate-x-2 group-hover/btn:-translate-y-2 transition-all duration-300 pointer-events-none" />

                      <div className={`relative w-12 h-12 rounded-full bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg transition-all duration-300 group-hover/btn:translate-x-3 group-hover/btn:-translate-y-3 group-hover/btn:shadow-xl`}
                        style={{ boxShadow: 'inset 0 0 20px rgba(255,255,255,0.3), inset 0 0 5px rgba(255,255,255,0.5), 0 5px 15px rgba(0,0,0,0.1)' }}
                      >
                        <item.icon size={20} className="text-white drop-shadow-sm" />
                      </div>
                    </NavLink>
                  </motion.div>
                ))}

                <motion.div
                  initial={{ opacity: 0, x: 20, y: 10 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  exit={{ opacity: 0, x: 20, y: 10 }}
                  transition={{ delay: navItems.length * 0.03 }}
                  className="group relative flex items-center gap-3 mt-2"
                >
                  <motion.span
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="px-3 py-1.5 text-sm font-medium text-rose-700 bg-rose-50 backdrop-blur-sm rounded-lg border border-rose-200 shadow-lg whitespace-nowrap"
                  >
                    Sign Out
                  </motion.span>

                  <button
                    onClick={handleLogout}
                    className="relative group/btn"
                  >
                    <span className="absolute inset-0 w-12 h-12 rounded-full bg-rose-900/5 opacity-0 group-hover/btn:opacity-20 transition-all duration-300" />
                    <span className="absolute inset-0 w-12 h-12 rounded-full bg-rose-900/5 opacity-0 group-hover/btn:opacity-40 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-all duration-300" />
                    <span className="absolute inset-0 w-12 h-12 rounded-full bg-rose-900/5 opacity-0 group-hover/btn:opacity-60 group-hover/btn:translate-x-2 group-hover/btn:-translate-y-2 transition-all duration-300" />

                    <div className={`relative w-12 h-12 rounded-full bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-lg transition-all duration-300 group-hover/btn:translate-x-3 group-hover/btn:-translate-y-3 group-hover/btn:shadow-xl`}
                      style={{ boxShadow: 'inset 0 0 20px rgba(255,255,255,0.3), inset 0 0 5px rgba(255,255,255,0.5), 0 5px 15px rgba(225,29,72,0.2)' }}
                    >
                      <LogOut size={20} className="text-white drop-shadow-sm" />
                    </div>
                  </button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => { setOpen(!open); setNotifOpen(false); }}
          whileTap={{ scale: 0.9 }}
          className="relative group w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-105"
          style={{
            boxShadow: open
              ? 'inset 0 0 20px rgba(255,255,255,0.3), 0 0 30px rgba(99,102,241,0.5), 0 10px 40px rgba(0,0,0,0.2)'
              : 'inset 0 0 20px rgba(255,255,255,0.3), 0 5px 20px rgba(0,0,0,0.15)'
          }}
        >
          <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }}>
            <Plus size={28} className="text-white drop-shadow-md" />
          </motion.div>
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-40 blur-xl transition-opacity duration-300" />
        </motion.button>
      </div>

    </div>
  );
}
