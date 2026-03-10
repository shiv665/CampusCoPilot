import { useState, useEffect } from "react";
import { api, API_BASE } from "../api/client";

export default function Profile() {
  const [profile, setProfile] = useState({
    university: "", major: "", semester: "", cgpa_target: "",
    target_companies: "", study_style: "balanced", daily_goal_hours: 4, language: "en"
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarKey, setAvatarKey] = useState(Date.now()); // for cache busting

  useEffect(() => {
    (async () => {
      try {
        const res = await api.getProfile();
        if (res.profile) {
          const p = res.profile;
          setProfile({
            university: p.university || "",
            major: p.major || "",
            semester: p.semester || "",
            cgpa_target: p.cgpa_target || "",
            target_companies: Array.isArray(p.target_companies) ? p.target_companies.join(", ") : (p.target_companies || ""),
            study_style: p.study_style || "balanced",
            daily_goal_hours: p.daily_goal_hours ?? 4,
            language: p.language || "en",
          });
        }
        const me = await api.me();
        if (me && me.id) setUserId(me.id);
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const payload = {
        ...profile,
        cgpa_target: profile.cgpa_target ? parseFloat(profile.cgpa_target) : undefined,
        daily_goal_hours: parseInt(profile.daily_goal_hours) || 4,
        target_companies: profile.target_companies.split(",").map(s => s.trim()).filter(Boolean),
      };
      await api.updateProfile(payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e?.message || String(e));
    } finally { setSaving(false); }
  };

  if (loading) return <div className="text-slate-400 text-center py-20">Loading profile…</div>;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">👤 Profile & Goals</h1>
      </div>

      <div className="glass p-6 space-y-5">

        {/* Avatar Upload Area */}
        <div className="flex items-center gap-6 pb-6 border-b border-slate-200">
          <div className="relative group w-24 h-24 rounded-full overflow-hidden bg-slate-100 border-4 border-white shadow-md flex-shrink-0">
            {userId ? (
              <img src={`${API_BASE}/api/users/${userId}/avatar?k=${avatarKey}`} alt="Avatar" className="w-full h-full object-cover"
                onError={(e) => { e.target.onerror = null; e.target.src = "https://api.dicebear.com/7.x/notionists/svg?seed=student"; }} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl">🧑‍🎓</div>
            )}
            <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <span className="text-white text-xs font-bold font-mono">CHANGE</span>
              <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setAvatarUploading(true);
                try {
                  await api.uploadAvatar(file);
                  setAvatarKey(Date.now());
                } catch (err) { setError(err.message); }
                finally { setAvatarUploading(false); }
              }} />
            </label>
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Profile Photo</h3>
            <p className="text-sm text-slate-500 mt-1">
              Upload a JPG or PNG. {avatarUploading && <span className="text-indigo-600 font-bold ml-2 animate-pulse">Uploading...</span>}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="University" value={profile.university}
            onChange={(e) => setProfile({ ...profile, university: e.target.value })} placeholder="MIT, Stanford…" />
          <Input label="Major" value={profile.major}
            onChange={(e) => setProfile({ ...profile, major: e.target.value })} placeholder="Computer Science" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Semester" value={profile.semester}
            onChange={(e) => setProfile({ ...profile, semester: e.target.value })} placeholder="e.g. 5th" />
          <Input label="CGPA Target" type="number" step="0.1" min="0" max="10" value={profile.cgpa_target}
            onChange={(e) => setProfile({ ...profile, cgpa_target: e.target.value })} placeholder="e.g. 9.0" />
        </div>

        <Input label="Target Companies (comma-separated)" value={profile.target_companies}
          onChange={(e) => setProfile({ ...profile, target_companies: e.target.value })} placeholder="Google, Microsoft, Amazon…" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Study Style</label>
            <select value={profile.study_style} onChange={(e) => setProfile({ ...profile, study_style: e.target.value })}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="intensive">Intensive (long sessions)</option>
              <option value="balanced">Balanced (mixed)</option>
              <option value="pomodoro">Pomodoro (short bursts)</option>
              <option value="spaced">Spaced Repetition</option>
            </select>
          </div>
          <Input label="Daily Study Goal (hours)" type="number" min={1} max={16} value={profile.daily_goal_hours}
            onChange={(e) => setProfile({ ...profile, daily_goal_hours: e.target.value })} />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Preferred Language</label>
          <select value={profile.language} onChange={(e) => setProfile({ ...profile, language: e.target.value })}
            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
            <option value="zh">Chinese</option>
          </select>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}
        {saved && <p className="text-green-400 text-sm">✅ Profile saved!</p>}

        <button onClick={handleSave} disabled={saving}
          className="w-full px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg">
          {saving ? "Saving…" : "Save Profile"}
        </button>
      </div>
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
