import { useState, useEffect } from "react";
import { api } from "../api/client";

const DEFAULT_EVENT = {
  event_name: "",
  difficulty: "medium",
  time_required_hours: 1.5,
  deadline: "",
  event_type: "dynamic",
  fixed_date: "",
  fixed_start_time: "",
  notes: "",
};

export default function Scheduler() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [events, setEvents] = useState([{ ...DEFAULT_EVENT }]);
  const [settings, setSettings] = useState({
    available_hours_per_day: 8,
    day_start_time: "08:00",
    day_end_time: "22:00",
    preferred_break_minutes: 15,
  });
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.listSessions().then((r) => setSessions(r.sessions ?? [])).catch(() => { });
  }, []);

  const addEvent = () => setEvents((prev) => [...prev, { ...DEFAULT_EVENT }]);
  const removeEvent = (idx) => setEvents((prev) => prev.filter((_, i) => i !== idx));
  const updateEvent = (idx, field, value) =>
    setEvents((prev) => prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)));

  const handleGenerate = async () => {
    if (!selectedSession) return setError("Select a session first.");
    const validEvents = events.filter((e) => e.event_name && e.deadline);
    if (validEvents.length === 0) return setError("Add at least one event with a name and deadline.");
    setLoading(true);
    setError("");
    try {
      const res = await api.schedule(selectedSession, { events: validEvents, ...settings });
      setSchedule(res.schedule);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">📅 Smart Scheduler</h1>

      {/* Session Select */}
      <div className="glass p-5 space-y-3">
        <label className="block text-sm font-medium text-slate-700">Link to Session</label>
        <select
          value={selectedSession}
          onChange={(e) => setSelectedSession(e.target.value)}
          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Select a session…</option>
          {sessions.map((s) => (
            <option key={s._id} value={s._id}>{s.filename}</option>
          ))}
        </select>
      </div>

      {/* Events */}
      <div className="glass p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Events</h2>
          <button onClick={addEvent} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg">+ Add Event</button>
        </div>
        {events.map((ev, idx) => (
          <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 shadow-sm">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-indigo-700">Event {idx + 1}</span>
              {events.length > 1 && (
                <button onClick={() => removeEvent(idx)} className="text-red-500 font-medium text-xs hover:text-red-600 transition-colors">Remove</button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input label="Event Name" value={ev.event_name} onChange={(e) => updateEvent(idx, "event_name", e.target.value)} placeholder="Math Homework" />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
                <select value={ev.difficulty} onChange={(e) => updateEvent(idx, "difficulty", e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <Input label="Hours Required" type="number" min={0.25} step={0.25} value={ev.time_required_hours}
                onChange={(e) => updateEvent(idx, "time_required_hours", parseFloat(e.target.value) || 1)} />
              <Input label="Deadline" type="date" value={ev.deadline} onChange={(e) => updateEvent(idx, "deadline", e.target.value)} />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select value={ev.event_type} onChange={(e) => updateEvent(idx, "event_type", e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="dynamic">Dynamic (AI picks time)</option>
                  <option value="fixed">Fixed (locked time)</option>
                </select>
              </div>
              {ev.event_type === "fixed" && (
                <>
                  <Input label="Fixed Date" type="date" value={ev.fixed_date} onChange={(e) => updateEvent(idx, "fixed_date", e.target.value)} />
                  <Input label="Start Time" type="time" value={ev.fixed_start_time} onChange={(e) => updateEvent(idx, "fixed_start_time", e.target.value)} />
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Settings */}
      <div className="glass p-5 space-y-3">
        <h2 className="text-lg font-semibold">⚙️ Schedule Settings</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Input label="Hours/Day" type="number" min={1} max={18} value={settings.available_hours_per_day}
            onChange={(e) => setSettings((p) => ({ ...p, available_hours_per_day: parseFloat(e.target.value) || 8 }))} />
          <Input label="Day Starts" type="time" value={settings.day_start_time}
            onChange={(e) => setSettings((p) => ({ ...p, day_start_time: e.target.value }))} />
          <Input label="Day Ends" type="time" value={settings.day_end_time}
            onChange={(e) => setSettings((p) => ({ ...p, day_end_time: e.target.value }))} />
          <Input label="Break (min)" type="number" min={0} max={60} value={settings.preferred_break_minutes}
            onChange={(e) => setSettings((p) => ({ ...p, preferred_break_minutes: parseInt(e.target.value) || 15 }))} />
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button onClick={handleGenerate} disabled={loading}
        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors">
        {loading ? "⏳ Generating Schedule…" : "🚀 Generate Schedule"}
      </button>

      {/* Schedule Display */}
      {schedule && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800">📋 Generated Schedule</h2>
          {schedule.warnings?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              {schedule.warnings.map((w, i) => <p key={i} className="text-amber-700 text-sm font-medium">⚠️ {w}</p>)}
            </div>
          )}
          <div className="grid gap-4">
            {(schedule.schedule || []).map((day, di) => (
              <div key={di} className="glass p-4 space-y-2">
                <h3 className="font-bold text-indigo-700">{day.day_name} — {day.date}</h3>
                {(day.slots || []).map((slot, si) => (
                  <div key={si} className="bg-white border border-slate-200 rounded-lg px-4 py-2 flex items-center justify-between shadow-sm">
                    <div>
                      <span className="text-indigo-600 font-mono text-sm font-medium">{slot.start_time}–{slot.end_time}</span>
                      <span className="ml-2 text-slate-700 font-semibold">{slot.event_name}</span>
                      {slot.is_fixed && <span className="ml-2 text-xs font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">📌 Fixed</span>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 font-bold rounded shadow-sm border ${slot.difficulty === "hard" ? "bg-rose-50 text-rose-700 border-rose-200" :
                        slot.difficulty === "medium" ? "bg-amber-50 text-amber-700 border-amber-200" :
                          "bg-green-50 text-green-700 border-green-200"
                      }`}>{slot.difficulty}</span>
                  </div>
                ))}
                {day.free_hours != null && (
                  <p className="text-xs font-medium text-slate-500 mt-1">{day.free_hours}h free</p>
                )}
              </div>
            ))}
          </div>
          <div className="text-sm text-slate-400">
            Total: {schedule.total_events} events ({schedule.fixed_events} fixed, {schedule.dynamic_events} dynamic)
          </div>
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
