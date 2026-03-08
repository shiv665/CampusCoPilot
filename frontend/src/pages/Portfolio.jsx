import { useState, useEffect } from "react";
import { api } from "../api/client";

export default function Portfolio() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("portfolio"); // portfolio | resume
  const [form, setForm] = useState({ title: "", type: "project", description: "", skills: "", url: "" });
  const [saving, setSaving] = useState(false);
  const [bullets, setBullets] = useState(null);
  const [genLoading, setGenLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { loadPortfolio(); }, []);

  const loadPortfolio = async () => {
    try {
      const res = await api.getPortfolio();
      setEntries(res.entries ?? []);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const handleAdd = async () => {
    if (!form.title.trim() || !form.description.trim()) return setError("Title and description are required");
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
      };
      await api.addPortfolio(payload);
      setForm({ title: "", type: "project", description: "", skills: "", url: "" });
      await loadPortfolio();
    } catch (e) {
      setError(e?.message || String(e));
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await api.deletePortfolio(id);
      setEntries((p) => p.filter((e) => e._id !== id && e.id !== id));
    } catch { /* ignore */ }
  };

  const handleGenerateBullets = async () => {
    setGenLoading(true);
    setBullets(null);
    try {
      const res = await api.resumeBullets();
      setBullets(res);
    } catch (e) {
      setError(e?.message || String(e));
    } finally { setGenLoading(false); }
  };

  const typeColors = {
    project: "bg-blue-600/20 text-blue-300",
    internship: "bg-green-600/20 text-green-300",
    certification: "bg-amber-600/20 text-amber-300",
    achievement: "bg-purple-600/20 text-purple-300",
    course: "bg-indigo-600/20 text-indigo-300",
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold">💼 Career & Portfolio</h1>

      {/* Tabs */}
      <div className="flex gap-2">
        {[["portfolio", "📁 Portfolio"], ["add", "➕ Add Entry"], ["resume", "📄 Resume Builder"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${tab === k ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}>{l}</button>
        ))}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Portfolio List */}
      {tab === "portfolio" && (
        loading ? <p className="text-slate-400">Loading…</p> : (
          <div className="space-y-3">
            {entries.length === 0 ? (
              <div className="glass p-10 text-center text-slate-400">
                <p className="text-4xl mb-2">📭</p>
                <p>No portfolio entries yet. Add your projects, certifications, and achievements.</p>
              </div>
            ) : entries.map((e, i) => (
              <div key={e._id || e.id || i} className="glass p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{e.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${typeColors[e.type] || "bg-slate-700 text-slate-300"}`}>{e.type}</span>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">{e.description}</p>
                    {e.skills?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {e.skills.map((s, si) => (
                          <span key={si} className="text-xs px-2 py-0.5 bg-slate-700/60 text-slate-300 rounded">{s}</span>
                        ))}
                      </div>
                    )}
                    {e.url && (
                      <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:underline mt-1 inline-block">🔗 Link</a>
                    )}
                  </div>
                  <button onClick={() => handleDelete(e._id || e.id)} className="text-red-400 hover:text-red-300 text-sm">✕</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Add Entry */}
      {tab === "add" && (
        <div className="glass p-5 space-y-4">
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. ML Image Classifier" />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="project">Project</option>
              <option value="internship">Internship</option>
              <option value="certification">Certification</option>
              <option value="achievement">Achievement</option>
              <option value="course">Course</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3} placeholder="Describe what you did, what you learned…"
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          </div>
          <Input label="Skills (comma-separated)" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="Python, TensorFlow, FastAPI" />
          <Input label="URL (optional)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://github.com/..." />
          <button onClick={handleAdd} disabled={saving}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg">
            {saving ? "Saving…" : "Add to Portfolio"}
          </button>
        </div>
      )}

      {/* Resume Builder */}
      {tab === "resume" && (
        <div className="space-y-4">
          <div className="glass p-5">
            <p className="text-slate-400 text-sm mb-4">Generate AI-powered resume bullet points based on your portfolio and profile.</p>
            <button onClick={handleGenerateBullets} disabled={genLoading}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg">
              {genLoading ? "⏳ Generating…" : "✨ Generate Resume Bullets"}
            </button>
          </div>
          {bullets && (
            <div className="glass p-5 space-y-3">
              <h3 className="font-semibold text-indigo-300">Generated Resume Bullets</h3>
              {typeof bullets.bullets === "string" ? (
                <pre className="whitespace-pre-wrap text-sm text-slate-300">{bullets.bullets}</pre>
              ) : (Array.isArray(bullets.bullets) || Array.isArray(bullets.bullets?.resume_bullets) || Array.isArray(bullets?.resume_bullets)) ? (
                <ul className="space-y-2">
                  {(Array.isArray(bullets.bullets?.resume_bullets) ? bullets.bullets.resume_bullets : Array.isArray(bullets?.resume_bullets) ? bullets.resume_bullets : bullets.bullets).map((b, i) => (
                    <li key={i} className="text-sm text-slate-500 flex items-start gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100 shadow-sm">
                      <span className="text-indigo-400 mt-0.5 font-bold">»</span>
                      <div>
                        {b.category && <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider block mb-0.5">{b.category}</span>}
                        <span>{typeof b === "string" ? b : b.bullet || JSON.stringify(b)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <pre className="whitespace-pre-wrap text-sm text-slate-300">{JSON.stringify(bullets, null, 2)}</pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <input {...props}
        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-shadow" />
    </div>
  );
}
