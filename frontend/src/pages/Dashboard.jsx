import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import gsap from "gsap";
import {
  BookOpen,
  BrainCircuit,
  CalendarDays,
  Activity,
  Lightbulb,
  Target,
  Briefcase,
  FileText,
  Plus,
  Timer,
  TrendingUp
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [health, setHealth] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const containerRef = useRef(null);
  const statsRef = useRef([]);
  const sessionsRef = useRef([]);

  useEffect(() => {
    Promise.all([api.listSessions(), api.health(), api.getProfile()])
      .then(([s, h, p]) => {
        setSessions(s.sessions ?? []);
        setHealth(h);
        setProfile(p.profile ?? null);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  // GSAP Entry Animations
  useEffect(() => {
    if (!loading && containerRef.current) {
      const tl = gsap.timeline();

      // Header Animation
      tl.fromTo(
        ".dash-header",
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
      );

      // Stagger Stat Cards
      if (statsRef.current.length > 0) {
        tl.fromTo(
          statsRef.current,
          { opacity: 0, scale: 0.9, y: 20 },
          { opacity: 1, scale: 1, y: 0, duration: 0.5, stagger: 0.1, ease: "back.out(1.2)" },
          "-=0.3"
        );
      }

      // Stagger Recent Sessions
      if (sessionsRef.current.length > 0) {
        tl.fromTo(
          sessionsRef.current,
          { opacity: 0, x: -20 },
          { opacity: 1, x: 0, duration: 0.4, stagger: 0.08, ease: "power2.out" },
          "-=0.2"
        );
      }
    }
  }, [loading]);


  const recent = sessions.slice(0, 5);
  const totalTopics = sessions.reduce(
    (n, s) => n + (s.topics?.length ?? 0),
    0
  );
  const campaignCount = sessions.filter((s) => s.campaign).length;

  return (
    <div className="space-y-8" ref={containerRef}>
      {/* Greeting */}
      <div className="dash-header">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-800">
          Welcome back, <span className="text-indigo-600">{user?.name?.split(" ")[0] ?? "Student"}</span>
        </h1>
        <p className="text-slate-500 mt-2 text-lg">Here's an overview of your study hub.</p>
      </div>

      {/* Profile-based hints */}
      {!profile && (
        <Link to="/onboarding" className="dash-header block glass p-6 border-indigo-500/30 hover:border-indigo-400/80 transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(99,102,241,0.3)]">
              👋
            </div>
            <div>
              <p className="text-lg font-semibold text-indigo-300 tracking-wide">Complete your profile to get personalized guidance</p>
              <p className="text-sm text-slate-400 mt-1">Set your university, goals, and study preferences so CampusCoPilot can tailor everything for you.</p>
            </div>
            <span className="ml-auto text-indigo-400 text-xl font-bold group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </Link>
      )}

      {profile && <PersonalizedHints profile={profile} sessions={sessions} />}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard ref={(el) => (statsRef.current[0] = el)} icon={<BookOpen size={24} />} label="Total Sessions" value={sessions.length} />
        <StatCard ref={(el) => (statsRef.current[1] = el)} icon={<BrainCircuit size={24} />} label="Topics Extracted" value={totalTopics} />
        <StatCard ref={(el) => (statsRef.current[2] = el)} icon={<CalendarDays size={24} />} label="Campaigns" value={campaignCount} />
        <StatCard
          ref={(el) => (statsRef.current[3] = el)}
          icon={<Activity size={24} />}
          label="Backend Status"
          value={health?.status === "ok" ? "Online" : "Offline"}
          accent={health?.status === "ok" ? "text-emerald-600" : "text-rose-600"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Sessions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-wide text-slate-800">Recent Sessions</h2>
            <Link to="/sessions" className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors font-medium">View all →</Link>
          </div>

          {loading ? (
            <div className="glass p-8 flex justify-center items-center">
              <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
            </div>
          ) : recent.length > 0 ? (
            <div className="space-y-3">
              {recent.map((s, idx) => (
                <Link
                  key={s._id}
                  ref={(el) => (sessionsRef.current[idx] = el)}
                  to={s.campaign ? `/campaign/${s._id}` : "/planner"}
                  className="group flex items-center justify-between px-5 py-4 glass hover:bg-slate-50 transition-all duration-300"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                      {s.campaign ? <CalendarDays size={20} /> : <FileText size={20} />}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">{s.filename ?? "Untitled"}</p>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">
                        {s.topics?.length ?? 0} topics &middot;{" "}
                        {s.campaign ? <span className="text-emerald-600">Campaign ready</span> : <span className="text-amber-600">Needs planning</span>}
                      </p>
                    </div>
                  </div>
                  <span className="text-slate-500 text-xs font-medium bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                    {s.created_at ? new Date(s.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ""}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="glass p-12 text-center text-slate-500 flex flex-col items-center justify-center h-48">
              <div className="text-slate-300 mb-4"><FileText size={48} strokeWidth={1} /></div>
              <p className="font-medium text-lg text-slate-700">No study sessions yet.</p>
              <p className="text-sm mt-1">Upload a syllabus to get started!</p>
            </div>
          )}
        </div>

        {/* Quick Actions Sidebar */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold tracking-wide text-slate-800">Quick Actions</h2>
          <div className="glass p-6 flex flex-col gap-4">
            <Link
              to="/planner"
              className="relative overflow-hidden group px-5 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all duration-300 shadow-md flex items-center gap-3"
            >
              <Plus size={20} className="text-indigo-200" />
              <span className="relative z-10 w-full text-center tracking-wide">Upload Syllabus</span>
            </Link>

            <Link
              to="/micro-tutor"
              className="px-5 py-4 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-medium transition-all duration-300 border border-slate-200 flex items-center gap-3 shadow-sm hover:shadow"
            >
              <BrainCircuit size={20} className="text-indigo-500" />
              <span className="w-full text-center">Practice Quiz</span>
            </Link>

            <Link
              to="/pomodoro"
              className="px-5 py-4 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-medium transition-all duration-300 border border-slate-200 flex items-center gap-3 shadow-sm hover:shadow"
            >
              <Timer size={20} className="text-rose-500" />
              <span className="w-full text-center">Focus Timer</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const StatCard = ({ icon, label, value, accent, ref }) => {
  return (
    <div ref={ref} className="glass p-6 flex items-center gap-5 relative overflow-hidden group hover:border-indigo-200">
      <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100 relative z-10 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
        {icon}
      </div>
      <div className="relative z-10">
        <p className={`text-2xl font-bold tracking-tight ${accent ?? "text-slate-800"}`}>{value}</p>
        <p className="text-sm text-slate-500 font-medium">{label}</p>
      </div>
    </div>
  );
};

function PersonalizedHints({ profile, sessions }) {
  const hints = [];

  if (profile.cgpa_target && parseFloat(profile.cgpa_target) >= 8.5) {
    hints.push({ icon: <Target className="text-indigo-600" />, title: "Targeting Excellence", text: `Aiming for ${profile.cgpa_target} CGPA. Keep your study schedule consistent!`, link: "/pomodoro" });
  }

  if (profile.target_companies?.length > 0) {
    const companies = Array.isArray(profile.target_companies) ? profile.target_companies.join(", ") : profile.target_companies;
    hints.push({ icon: <Briefcase className="text-blue-600" />, title: "Career Focus", text: `Targeting ${companies}. Build your Portfolio to track projects!`, link: "/portfolio" });
  }

  if (sessions.length === 0) {
    hints.push({ icon: <FileText className="text-purple-600" />, title: "Get Started", text: "Upload your first syllabus to generate a personalized study campaign!", link: "/planner" });
  } else if (!sessions.some(s => s.campaign)) {
    hints.push({ icon: <CalendarDays className="text-rose-600" />, title: "Plan Needed", text: "You have sessions without campaigns. Generate one now!", link: `/campaign/${sessions[0]?._id}` });
  }

  // Force at least 3 hints exactly so the grid looks symmetrical on all screen sizes!
  if (hints.length < 3) {
    hints.push({ icon: <TrendingUp className="text-emerald-600" />, title: "Daily Review", text: `Take 15 minutes to review today's material before resting.`, link: "/micro-tutor" });
  }
  if (hints.length < 3) {
    hints.push({ icon: <Timer className="text-rose-500" />, title: "Focus Time", text: `Try a 25-minute Pomodoro session to kickstart your study block.`, link: "/pomodoro" });
  }
  if (hints.length < 3) {
    hints.push({ icon: <BrainCircuit className="text-indigo-500" />, title: "Active Recall", text: `Use the Micro-Tutor to test your knowledge dynamically.`, link: "/micro-tutor" });
  }

  if (hints.length === 0) return null;

  return (
    <div className="glass p-6 border-indigo-100 relative overflow-hidden">
      <h2 className="text-xl font-bold flex items-center gap-2 mb-5 relative z-10 text-slate-800">
        <Lightbulb size={24} className="text-amber-500" /> Personalized Guidance
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
        {hints.slice(0, 3).map((h, i) => (
          <Link key={i} to={h.link} className="group flex flex-col gap-3 p-5 bg-white hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-300 rounded-xl transition-all duration-300 hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-white transition-colors border border-slate-100 shadow-sm">{h.icon}</div>
              <h3 className="font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors tracking-tight">{h.title}</h3>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">{h.text}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
