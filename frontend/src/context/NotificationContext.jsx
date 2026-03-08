import { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

const NotificationContext = createContext();

export function useNotification() {
    return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
    const [notifications, setNotifications] = useState([]);
    const [history, setHistory] = useState([]);

    const notify = useCallback((message, type = "info", duration = 4000) => {
        const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
        const newNotif = { id, message, type, time: new Date() };

        setNotifications((prev) => [...prev, newNotif]);
        setHistory((prev) => [newNotif, ...prev].slice(0, 50)); // Keep last 50

        if (duration > 0) {
            setTimeout(() => {
                removeNotification(id);
            }, duration);
        }
    }, []);

    const removeNotification = useCallback((id) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    const clearHistory = useCallback(() => {
        setHistory([]);
    }, []);

    return (
        <NotificationContext.Provider value={{ notify, history, clearHistory }}>
            {children}

            {/* 3D Toaster Overlay */}
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
                <AnimatePresence>
                    {notifications.map((n) => (
                        <motion.div
                            key={n.id}
                            layout
                            initial={{ opacity: 0, y: 50, scale: 0.8, rotateX: 20 }}
                            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
                            exit={{ opacity: 0, scale: 0.9, x: 100 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-xl border-white/40 group ${n.type === "success" ? "bg-emerald-500/90 text-white" :
                                n.type === "error" ? "bg-rose-500/90 text-white" :
                                    "bg-slate-900/90 text-white"
                                }`}
                            style={{
                                transformStyle: "preserve-3d",
                                boxShadow: "0 20px 40px -10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)"
                            }}
                        >
                            {n.type === "success" && <CheckCircle className="w-5 h-5 drop-shadow-md" />}
                            {n.type === "error" && <AlertCircle className="w-5 h-5 drop-shadow-md" />}
                            {n.type === "info" && <Info className="w-5 h-5 drop-shadow-md text-blue-300" />}

                            <span className="font-medium text-sm drop-shadow-sm pr-4">{n.message}</span>

                            <button
                                onClick={() => removeNotification(n.id)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20 rounded-md"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </NotificationContext.Provider>
    );
}
