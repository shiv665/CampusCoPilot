import { useState, useEffect } from "react";
import { api } from "../api/client";

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.analytics();
        setData(res);
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="text-slate-500 text-center py-20 font-medium">Loading analytics…</div>;
  if (!data) return <div className="text-slate-500 text-center py-20 font-medium">No data available.</div>;

  const metrics = data.metrics || {};
  const quizResults = data.recent_quizzes || [];
  const recentTasks = data.recent_completions || [];
  const sessions = data.sessions || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">📊 Analytics Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Sessions" value={metrics.total_sessions ?? sessions.length ?? 0} icon="📚" color="indigo" />
        <StatCard label="Tasks Done" value={metrics.topics_completed ?? 0} icon="✅" color="green" />
        <StatCard label="Pomodoros" value={metrics.pomodoro_count ?? 0} icon="🍅" color="red" />
        <StatCard label="Quizzes" value={metrics.quiz_count ?? quizResults.length ?? 0} icon="📝" color="amber" />
      </div>

      {/* Quiz Performance */}
      {quizResults.length > 0 && (
        <div className="glass p-5 space-y-4">
          <h2 className="text-lg font-semibold text-indigo-700">📝 Quiz Performance</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-indigo-600">
                {Math.round(quizResults.reduce((s, q) => s + (q.score / q.total) * 100, 0) / quizResults.length)}%
              </p>
              <p className="text-xs text-slate-500 font-medium">Avg Score</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{quizResults.filter(q => q.score === q.total).length}</p>
              <p className="text-xs text-slate-500 font-medium">Perfect Scores</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-500">{quizResults.length}</p>
              <p className="text-xs text-slate-500 font-medium">Total Quizzes</p>
            </div>
          </div>
          {/* Basic bar chart using divs */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-600">Recent quiz scores</p>
            {quizResults.slice(-10).map((q, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-500 w-28 truncate">{q.topic}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden border border-slate-200">
                  <div className={`h-full rounded-full ${q.score >= q.total ? "bg-green-500" :
                      q.score >= q.total * 0.7 ? "bg-indigo-500" : "bg-amber-500"
                    }`} style={{ width: `${(q.score / q.total) * 100}%` }} />
                </div>
                <span className="text-xs font-bold text-slate-600 w-12 text-right">{q.score}/{q.total}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Tasks */}
      {recentTasks.length > 0 && (
        <div className="glass p-5 space-y-3">
          <h2 className="text-lg font-semibold text-indigo-700">✅ Recent Completions</h2>
          {recentTasks.slice(0, 10).map((t, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-200 last:border-0">
              <div>
                <p className="text-sm font-semibold text-slate-800">{t.task_name || t.topic || "Task"}</p>
                <p className="text-xs font-medium text-slate-500">{t.topic && `Topic: ${t.topic}`}</p>
              </div>
              <span className="text-xs font-semibold text-slate-400">{t.completed_at ? new Date(t.completed_at).toLocaleDateString() : ""}</span>
            </div>
          ))}
        </div>
      )}

      {/* Study Sessions */}
      {sessions.length > 0 && (
        <div className="glass p-5 space-y-3">
          <h2 className="text-lg font-semibold text-indigo-700">📚 Saved Sessions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sessions.slice(0, 6).map((s, i) => (
              <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-3 shadow-sm hover:shadow transition-shadow">
                <p className="font-semibold text-sm text-slate-800">{s.session_name || s.name || `Session ${i + 1}`}</p>
                <p className="text-xs font-medium text-slate-500 mt-1">{s.topics?.length ?? 0} topics</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.created_at ? new Date(s.created_at).toLocaleDateString() : ""}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty fallback */}
      {quizResults.length === 0 && recentTasks.length === 0 && sessions.length === 0 && (
        <div className="glass p-10 text-center text-slate-500 font-medium">
          <p className="text-4xl mb-2">📈</p>
          <p>Start studying to see your analytics here!</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  const colors = {
    indigo: "from-indigo-50 to-indigo-100/50 text-indigo-700 border-indigo-200",
    green: "from-green-50 to-green-100/50 text-green-700 border-green-200",
    red: "from-rose-50 to-rose-100/50 text-rose-700 border-rose-200",
    amber: "from-amber-50 to-amber-100/50 text-amber-700 border-amber-200",
  };
  return (
    <div className={`rounded-xl p-4 bg-gradient-to-br border shadow-sm ${colors[color] || colors.indigo}`}>
      <p className="text-2xl mb-1">{icon}</p>
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="text-xs font-semibold opacity-80 mt-1">{label}</p>
    </div>
  );
}
