// import { Navigate } from "react-router-dom"; // ORIGINAL – uncomment when restoring login
// import { useAuth } from "../context/AuthContext"; // ORIGINAL – uncomment when restoring login

// ═══ DEMO BYPASS: Always allow access ═══
export default function ProtectedRoute({ children }) {
  return children;
}
// ═══ END DEMO BYPASS ═══

/* ─── ORIGINAL ProtectedRoute (uncomment to restore auth guard) ───
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-slate-400">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
─── END ORIGINAL ─── */
