import { useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { AnimatePresence, motion } from "framer-motion";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import Background3D from "./components/Background3D";

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Planner from "./pages/Planner";
import Campaign from "./pages/Campaign";
import Sessions from "./pages/Sessions";
import Squads from "./pages/Squads";
import ScanNotes from "./pages/ScanNotes";
import MicroTutor from "./pages/MicroTutor";
import Pomodoro from "./pages/Pomodoro";
import Analytics from "./pages/Analytics";
import Portfolio from "./pages/Portfolio";
import Achievements from "./pages/Achievements";
import Profile from "./pages/Profile";
import Onboarding from "./pages/Onboarding";

function Layout({ children }) {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <Background3D />
      <Sidebar />
      <main className="min-h-screen relative z-10 w-full">
        <div className="max-w-6xl mx-auto p-4 md:p-8 lg:p-10 pb-24">
          {children}
        </div>
      </main>
    </div>
  );
}

// Framer Motion Page Wrapper
function PageWrapper({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -15, scale: 1.02 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-slate-400">Loading...</div>;
  }

  return (
    <NotificationProvider>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* ═══ DEMO BYPASS: skip login/register, go to dashboard ═══ */}
          <Route path="/login" element={<Navigate to="/" />} />
          <Route path="/register" element={<Navigate to="/" />} />
          <Route path="/onboarding" element={<Navigate to="/" />} />
          {/* ═══ END DEMO BYPASS ═══ */}
          {/* ORIGINAL (uncomment to restore login/register):
          <Route path="/login" element={user ? <Navigate to="/" /> : <PageWrapper><Login /></PageWrapper>} />
          <Route path="/register" element={user ? <Navigate to="/onboarding" /> : <PageWrapper><Register /></PageWrapper>} />
          <Route path="/onboarding" element={<ProtectedRoute><PageWrapper><Onboarding /></PageWrapper></ProtectedRoute>} />
          */}

          {/* Protected Routes inside Layout */}
          <Route path="/" element={<ProtectedRoute><Layout><PageWrapper><Dashboard /></PageWrapper></Layout></ProtectedRoute>} />
          <Route path="/planner" element={<ProtectedRoute><Layout><PageWrapper><Planner /></PageWrapper></Layout></ProtectedRoute>} />
          <Route path="/campaign/:sessionId" element={<ProtectedRoute><Layout><PageWrapper><Campaign /></PageWrapper></Layout></ProtectedRoute>} />
          <Route path="/campaign" element={<ProtectedRoute><Layout><PageWrapper><Campaign /></PageWrapper></Layout></ProtectedRoute>} />
          <Route path="/sessions" element={<ProtectedRoute><Layout><PageWrapper><Sessions /></PageWrapper></Layout></ProtectedRoute>} />
          <Route path="/squads" element={<ProtectedRoute><Layout><PageWrapper><Squads /></PageWrapper></Layout></ProtectedRoute>} />
          <Route path="/scan-notes" element={<ProtectedRoute><Layout><PageWrapper><ScanNotes /></PageWrapper></Layout></ProtectedRoute>} />
          <Route path="/micro-tutor" element={<ProtectedRoute><Layout><PageWrapper><MicroTutor /></PageWrapper></Layout></ProtectedRoute>} />
          <Route path="/pomodoro" element={<ProtectedRoute><Layout><PageWrapper><Pomodoro /></PageWrapper></Layout></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Layout><PageWrapper><Analytics /></PageWrapper></Layout></ProtectedRoute>} />
          <Route path="/portfolio" element={<ProtectedRoute><Layout><PageWrapper><Portfolio /></PageWrapper></Layout></ProtectedRoute>} />
          <Route path="/achievements" element={<ProtectedRoute><Layout><PageWrapper><Achievements /></PageWrapper></Layout></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Layout><PageWrapper><Profile /></PageWrapper></Layout></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AnimatePresence>
    </NotificationProvider>
  );
}
