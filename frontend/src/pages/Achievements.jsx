import { useState, useEffect } from "react";
import { api } from "../api/client";

const BADGE_META = {
  first_session: { icon: "🌟", label: "First Session", desc: "Complete your first study session" },
  streak_3: { icon: "🔥", label: "3-Day Streak", desc: "Study 3 days in a row" },
  streak_7: { icon: "🔥", label: "7-Day Streak", desc: "Study 7 days in a row" },
  streak_30: { icon: "💎", label: "30-Day Streak", desc: "Study 30 days in a row" },
  topics_10: { icon: "📖", label: "10 Topics", desc: "Complete 10 topics" },
  topics_50: { icon: "📚", label: "50 Topics", desc: "Complete 50 topics" },
  pomodoro_10: { icon: "🍅", label: "10 Pomodoros", desc: "Complete 10 pomodoros" },
  pomodoro_100: { icon: "🏆", label: "100 Pomodoros", desc: "Complete 100 pomodoros" },
  quiz_ace: { icon: "💯", label: "Quiz Ace", desc: "Get 5 perfect quiz scores" },
  early_bird: { icon: "🌅", label: "Early Bird", desc: "Study before 7 AM" },
  night_owl: { icon: "🦉", label: "Night Owl", desc: "Study after 11 PM" },
  campaign_complete: { icon: "🎯", label: "Campaign Complete", desc: "Finish an entire campaign" },
};

export default function Achievements() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wellbeing, setWellbeing] = useState(null);
  const [wbLoading, setWbLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.gamification();
        setData(res);
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, []);

  const fetchWellbeing = async () => {
    setWbLoading(true);
    try {
      const res = await api.wellbeingNudge();
      setWellbeing(res);
    } catch { /* ignore */ } finally { setWbLoading(false); }
  };

  if (loading) return <div className="text-slate-500 text-center py-20">Loading…</div>;
  if (!data) return <div className="text-slate-500 text-center py-20">No data.</div>;

  const streakObj = data.streak ?? {};
  const currentStreak = typeof streakObj === "number" ? streakObj : (streakObj.current_streak ?? 0);
  const longestStreak = typeof streakObj === "number" ? streakObj : (streakObj.longest_streak ?? 0);
  const badges = data.badges ?? [];
  const metrics = data.metrics ?? {};
  const earnedIds = badges.map((b) => b.id || b);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold">🏅 Achievements</h1>

      {/* Streak Card */}
      <div className="glass p-6 text-center">
        <p className="text-5xl font-bold text-amber-500">🔥 {currentStreak}</p>
        <p className="text-slate-500 mt-1 font-medium">Day Streak</p>
        <p className="text-xs text-slate-500 mt-2 font-medium">Longest: {longestStreak} days · Keep it up!</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Sessions" value={metrics.total_sessions ?? 0} icon="📚" />
        <MetricCard label="Tasks Done" value={metrics.topics_completed ?? 0} icon="✅" />
        <MetricCard label="Pomodoros" value={metrics.pomodoro_count ?? 0} icon="🍅" />
        <MetricCard label="Quizzes" value={metrics.quiz_count ?? 0} icon="📝" />
      </div>

      {/* Badges Grid */}
      <div className="glass p-5 space-y-4">
        <h2 className="text-lg font-semibold text-indigo-700">🎖️ Badges</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(BADGE_META).map(([id, meta]) => {
            const earned = earnedIds.includes(id);
            return (
              <div key={id} className={`rounded-xl p-4 text-center transition-all ${earned
                  ? "bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200 shadow-sm"
                  : "bg-slate-50 border border-slate-200 opacity-70"
                }`}>
                <p className="text-3xl mb-1">{earned ? meta.icon : "🔒"}</p>
                <p className={`text-sm font-medium ${earned ? "text-amber-700" : "text-slate-500"}`}>{meta.label}</p>
                <p className="text-xs text-slate-500 mt-1">{meta.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Well-being */}
      <div className="glass p-5 space-y-3">
        <h2 className="text-lg font-semibold text-indigo-700">🧘 Well-being Check</h2>
        <p className="text-sm text-slate-500">Get personalized well-being recommendations based on your activity.</p>
        <button onClick={fetchWellbeing} disabled={wbLoading}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 shadow-sm disabled:opacity-50 text-white font-medium rounded-lg transition-colors">
          {wbLoading ? "⏳ Loading…" : "💆 Get Recommendations"}
        </button>
        {wellbeing && (
          <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-lg shadow-sm">
            {typeof wellbeing.nudge === "string" ? (
              <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans">{wellbeing.nudge}</pre>
            ) : wellbeing.nudge ? (
              <>
                {wellbeing.nudge.message && <p className="text-sm text-slate-700">{wellbeing.nudge.message}</p>}
                {wellbeing.nudge.tips && (
                  <ul className="mt-2 space-y-1">
                    {(Array.isArray(wellbeing.nudge.tips) ? wellbeing.nudge.tips : []).map((t, i) => (
                      <li key={i} className="text-sm text-slate-600">• {typeof t === "string" ? t : JSON.stringify(t)}</li>
                    ))}
                  </ul>
                )}
                {!wellbeing.nudge.message && !wellbeing.nudge.tips && (
                  <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans">{JSON.stringify(wellbeing.nudge, null, 2)}</pre>
                )}
              </>
            ) : (
              <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans">{JSON.stringify(wellbeing, null, 2)}</pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon }) {
  return (
    <div className="glass p-4 text-center">
      <p className="text-2xl">{icon}</p>
      <p className="text-xl font-bold text-indigo-600">{value}</p>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
    </div>
  );
}
