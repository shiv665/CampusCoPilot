import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

export default function Sessions() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [sessRes, semRes] = await Promise.all([
        api.listSessions().catch(() => ({ sessions: [] })),
        api.listSemesterPlans().catch(() => ({ plans: [] })),
      ]);
      const merged = [
        ...(sessRes.sessions ?? []).map((s) => ({ ...s, _type: "legacy" })),
        ...(semRes.plans ?? []).map((p) => ({ ...p, _type: "semester" })),
      ];
      merged.sort(
        (a, b) =>
          (b.updated_at || b.created_at || "").localeCompare(
            a.updated_at || a.created_at || ""
          )
      );
      setItems(merged);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (item) => {
    if (!window.confirm("Delete this roadmap? This cannot be undone.")) return;
    try {
      if (item._type === "semester") {
        await api.deleteSemesterPlan(item._id);
      } else {
        await api.deleteSession(item._id);
      }
      setItems((prev) => prev.filter((i) => i._id !== item._id));
    } catch {
      /* ignore */
    }
  };

  if (loading) return <p className="text-slate-400">Loading…</p>;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📂 Saved Roadmaps</h1>
        <Link
          to="/planner"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
        >
          + New Session
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="glass p-10 text-center text-slate-400">
          <p className="text-4xl mb-2">📭</p>
          <p>No saved roadmaps yet. Upload a syllabus to begin.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((s) => (
            <div
              key={s._id}
              className="glass p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                {s._type === "semester" ? (
                  <>
                    <p className="font-medium truncate">
                      🎓 {s.university || "Semester Plan"} – {s.branch || "Plan"}{" "}
                      <span className="text-slate-400 text-sm">({s.semester_type})</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {s.subjects?.length ?? 0} subjects &middot;{" "}
                      {s.campaign ? "✅ Campaign" : "❌ No campaign"}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium truncate">📎 {s.filename ?? "Untitled"}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {s.topics?.length ?? 0} topics &middot;{" "}
                      {s.campaign ? "✅ Campaign" : "❌ No campaign"}{" "}
                      {s.schedule ? " · 📅 Scheduled" : ""}
                    </p>
                  </>
                )}
                <p className="text-xs text-slate-500">
                  {(s.updated_at || s.created_at)
                    ? new Date(s.updated_at || s.created_at).toLocaleString()
                    : ""}
                </p>
              </div>

              <div className="flex gap-2 shrink-0">
                {s.campaign ? (
                  <Link
                    to={
                      s._type === "semester"
                        ? `/campaign/semester-${s._id}`
                        : `/campaign/${s._id}`
                    }
                    className="px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-500 text-white text-xs rounded-lg transition-colors"
                  >
                    View Campaign
                  </Link>
                ) : (
                  <Link
                    to="/planner"
                    state={{ resumePlanId: s._id, resumeType: s._type }}
                    className="px-3 py-1.5 bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs rounded-lg transition-colors"
                  >
                    Continue Editing
                  </Link>
                )}
                <Link
                  to="/planner"
                  state={{ resumePlanId: s._id, resumeType: s._type, editMode: true }}
                  className="px-3 py-1.5 bg-slate-600/80 hover:bg-slate-500 text-white text-xs rounded-lg transition-colors"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(s)}
                  className="px-3 py-1.5 bg-red-600/80 hover:bg-red-500 text-white text-xs rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
