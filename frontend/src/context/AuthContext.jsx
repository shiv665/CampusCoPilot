import { createContext, useContext, useEffect, useState } from "react";
// import { api } from "../api/client"; // ORIGINAL – uncomment when restoring login

const AuthContext = createContext(null);

// ═══ DEMO BYPASS: Auto-login as "Judges" test user ═══
// To restore real auth, uncomment the original code below and remove this block.
const TEST_USER = { id: "test-judge-user", email: "judges@demo.com", name: "Judges" };
const TEST_TOKEN = "demo-token-judges";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(TEST_USER);
  const [loading, setLoading] = useState(false);

  // Set fake token so API client includes Authorization header
  useEffect(() => {
    localStorage.setItem("token", TEST_TOKEN);
    localStorage.setItem("user", JSON.stringify(TEST_USER));
  }, []);

  const login = async () => ({ token: TEST_TOKEN, user: TEST_USER });
  const register = async () => ({ token: TEST_TOKEN, user: TEST_USER });
  const logout = () => {}; // no-op for demo

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
// ═══ END DEMO BYPASS ═══

/* ─── ORIGINAL AuthProvider (uncomment to restore login/register) ───
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    api.me()
      .then((u) => {
        setUser(u);
        localStorage.setItem("user", JSON.stringify(u));
      })
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const data = await api.login({ email, password });
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const register = async (email, name, password) => {
    const data = await api.register({ email, name, password });
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
─── END ORIGINAL ─── */

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
