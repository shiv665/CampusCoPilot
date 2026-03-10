import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import gsap from "gsap";

export default function Campaign() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSemester, setIsSemester] = useState(false);

  const [showDisruption, setShowDisruption] = useState(false);
  const [disruptionForm, setDisruptionForm] = useState({
    event_type: "sick_day",
    affected_day: "",
    description: "",
  });
  const [replanning, setReplanning] = useState(false);

  /* completed tasks local state */
  const [completedTasks, setCompletedTasks] = useState(new Set());

  // Refs for animation
  const containerRef = useRef(null);
  const headerRef = useRef(null);
  const weeksRef = useRef([]);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    // Detect semester plans (prefixed with "semester-")
    if (sessionId.startsWith("semester-")) {
      const planId = sessionId.replace("semester-", "");
      setIsSemester(true);
      api
        .getSemesterPlan(planId)
        .then((res) => {
          const p = res.plan ?? res;
          setSession(p);
          setCampaign(normalizeCampaign(p.campaign));
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    } else {
      api
        .getSession(sessionId)
        .then((res) => {
          const s = res.session ?? res;
          setSession(s);
          setCampaign(normalizeCampaign(s.campaign));
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [sessionId]);

  // Handle GSAP animations when loaded
  useEffect(() => {
    if (!loading && campaign && containerRef.current) {
      const tl = gsap.timeline();

      if (headerRef.current) {
        tl.fromTo(headerRef.current, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" });
      }

      const validWeeks = weeksRef.current.filter(el => el !== null);
      if (validWeeks.length > 0) {
        tl.fromTo(
          validWeeks,
          { opacity: 0, y: 30, scale: 0.98 },
          { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.15, ease: "back.out(1.1)" },
          "-=0.2"
        );
      }
    }
  }, [loading, campaign]);


  /* ── Disruption ── */
  const handleDisruption = async () => {
    if (!sessionId) return;
    setReplanning(true);
    try {
      let cleanId = sessionId;
      if (sessionId.startsWith("semester-")) cleanId = sessionId.replace("semester-", "");

      const res = await api.mockDisruption(cleanId, disruptionForm);
      setCampaign(normalizeCampaign(res.campaign));
      setShowDisruption(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setReplanning(false);
    }
  };

  const handleCompleteTask = async (taskObj, durationMinutes, taskKey) => {
    try {
      let cleanId = sessionId;
      if (sessionId?.startsWith("semester-")) cleanId = sessionId.replace("semester-", "");

      const taskName = typeof (taskObj.task ?? taskObj) === "string" ? (taskObj.task ?? taskObj) : JSON.stringify(taskObj.task ?? taskObj);
      const subjectTopic = typeof taskObj.subject === "string" ? taskObj.subject : "";

      await api.completeTask(taskName, subjectTopic, cleanId, Number(durationMinutes));
      setCompletedTasks(prev => {
        const next = new Set(prev);
        next.add(taskKey);
        return next;
      });
    } catch (e) {
      alert("Failed to log task: " + e.message);
    }
  };

  /* ── Render ── */
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
    </div>
  );

  if (!sessionId) {
    return (
      <div className="glass p-12 text-center text-slate-600 space-y-5 rounded-2xl">
        <p className="text-6xl drop-shadow-sm opacity-80">📭</p>
        <div>
          <p className="text-xl font-bold text-slate-800">No session selected.</p>
          <p className="text-sm font-medium mt-1">Upload a syllabus first.</p>
        </div>
        <button onClick={() => navigate("/planner")} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all shadow-[0_4px_15px_rgba(99,102,241,0.3)] hover:-translate-y-1">
          Go to Planner
        </button>
      </div>
    );
  }
  if (error) return <p className="text-rose-400 font-medium glass p-4 text-center">{error}</p>;
  if (!campaign) {
    return (
      <div className="glass p-12 text-center text-slate-600 space-y-5 rounded-2xl">
        <div className="relative inline-block">
          <p className="text-6xl drop-shadow-sm opacity-80 animate-pulse">⏳</p>
        </div>
        <div>
          <p className="text-xl font-bold text-slate-800">No campaign generated yet.</p>
          <p className="text-sm font-medium mt-1">Head back to the planner to create one for this session.</p>
        </div>
        <button onClick={() => navigate("/planner")} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all shadow-[0_4px_15px_rgba(99,102,241,0.3)] hover:-translate-y-1">
          Go to Planner
        </button>
      </div>
    );
  }

  const weeklyPlans = campaign.weekly_plans ?? [];

  return (
    <div className="space-y-8" ref={containerRef}>
      {/* Header */}
      <div ref={headerRef} className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <span className="text-4xl drop-shadow-sm">🗓️</span>
            <span className="text-gradient">Study Campaign</span>
          </h1>
          <p className="text-slate-600 text-sm mt-2 font-semibold flex items-center flex-wrap gap-2">
            <span className="bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm text-indigo-700">
              {isSemester ? (
                <>{session?.university} – {session?.branch} ({session?.semester_type})</>
              ) : (
                <>{session?.filename}</>
              )}
            </span>
            <span className="bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm text-slate-700">
              {isSemester ? `${session?.subjects?.length || 0} subjects` : `${campaign.total_weeks ?? weeklyPlans.length} weeks`}
            </span>
            <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100 shadow-sm">
              {campaign.hours_per_day ?? "–"}h / day
            </span>
            {campaign.student_name && campaign.student_name !== "Student" && (
              <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full border border-amber-100 shadow-sm">
                👤 {campaign.student_name}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowDisruption(true)}
          className="group relative overflow-hidden px-5 py-3 bg-amber-600/90 hover:bg-amber-500 text-white rounded-xl text-sm font-bold transition-all shadow-[0_4px_15px_rgba(217,119,6,0.3)] border border-amber-400/30 hover:-translate-y-1"
        >
          <span className="relative z-10 flex items-center gap-2">
            <span className="text-lg">⚡</span> Disruption
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
        </button>
      </div>

      {/* Weekly Plans */}
      <div className="space-y-8 relative z-10">
        {weeklyPlans.map((week, wi) => (
          <div
            key={wi}
            ref={(el) => (weeksRef.current[wi] = el)}
            className="glass p-6 md:p-8 space-y-6 relative overflow-hidden group"
          >
            {/* Subtle week background accent */}
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors duration-500"></div>

            <div className="border-b border-indigo-500/20 pb-4 relative z-10">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <span className="bg-indigo-500 text-white w-8 h-8 flex items-center justify-center rounded-lg text-lg shadow-[0_0_10px_rgba(99,102,241,0.5)]">
                  {week.week_number ?? wi + 1}
                </span>
                <span className="text-slate-200 tracking-wide">{week.theme ?? "Study Week"}</span>
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 relative z-10">
              {(week.days ?? []).filter(d => d && d.day).map((day, di) => (
                <DayCard
                  key={di}
                  weekIdx={wi}
                  day={day}
                  index={di}
                  completedTasks={completedTasks}
                  onComplete={handleCompleteTask}
                />
              ))}
            </div>
          </div>
        ))}

        {weeklyPlans.length === 0 && (
          <FallbackRaw data={campaign} />
        )}
      </div>

      {/* ── Disruption Modal ── */}
      {showDisruption && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="glass p-8 w-full max-w-md space-y-6 relative overflow-hidden border border-amber-500/30 shadow-[0_0_50px_rgba(217,119,6,0.15)] animate-in zoom-in-95 duration-300">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-amber-600"></div>

            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="p-2 bg-amber-500/20 rounded-lg text-amber-400">⚡</span>
              Disruption Event
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Event Type</label>
                <div className="relative">
                  <select
                    value={disruptionForm.event_type}
                    onChange={(e) => setDisruptionForm((p) => ({ ...p, event_type: e.target.value }))}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50 appearance-none shadow-sm transition-shadow hover:border-amber-300"
                  >
                    <option value="sick_day">Sick Day 🤒</option>
                    <option value="class_canceled">Class Canceled 🚫</option>
                    <option value="extra_assignment">Extra Assignment 📚</option>
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                    ▼
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Affected Day</label>
                <input
                  value={disruptionForm.affected_day}
                  onChange={(e) => setDisruptionForm((p) => ({ ...p, affected_day: e.target.value }))}
                  placeholder="Enter affected day"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-sm transition-shadow hover:border-amber-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description (optional)</label>
                <textarea
                  value={disruptionForm.description}
                  onChange={(e) => setDisruptionForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Enter disruption details..."
                  rows="2"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-sm transition-shadow hover:border-amber-300 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t border-slate-200/50">
              <button
                onClick={() => setShowDisruption(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-colors shadow-sm"
                disabled={replanning}
              >
                Cancel
              </button>
              <button
                onClick={handleDisruption}
                disabled={replanning || !disruptionForm.affected_day}
                className="relative overflow-hidden group px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 disabled:grayscale text-white rounded-xl text-sm font-bold transition-all shadow-[0_4px_15px_rgba(217,119,6,0.3)] hover:shadow-[0_4px_20px_rgba(217,119,6,0.5)] flex items-center gap-2"
              >
                {replanning ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Replanning...
                  </>
                ) : (
                  <>Apply Disruption</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Day card ── */
function DayCard({ weekIdx, day, index, completedTasks, onComplete }) {
  const [activeTaskNode, setActiveTaskNode] = useState(null);
  const [duration, setDuration] = useState(30);

  return (
    <div className="group bg-white/80 hover:bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl p-6 space-y-5 transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-lg relative overflow-hidden backdrop-blur-md">
      {/* Decorative gradient blob */}
      <div className={`absolute -right-10 -top-10 w-24 h-24 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-300 ${index % 2 === 0 ? 'bg-indigo-500' : 'bg-cyan-500'}`}></div>

      <div className="relative z-10 flex flex-col gap-1.5">
        <p className="font-bold text-xl text-slate-800 tracking-tight flex items-center gap-2">
          <span className="text-2xl drop-shadow-sm">📅</span> {day.day ?? "Day"}
        </p>

        {day.focus_topic && (
          <div className="inline-flex mt-2">
            <span className="text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded border border-indigo-100 shadow-sm">
              Focus: {day.focus_topic}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-3 relative z-10">
        {(day.tasks ?? []).map((task, ti) => {
          const isBreak = typeof task.task === 'string' && task.task.toLowerCase().includes('break');

          if (isBreak) {
            return (
              <div key={ti} className="flex flex-col gap-1 text-sm bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl px-4 py-3 transition-colors shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-teal-700 font-medium font-mono text-xs bg-white px-2 py-0.5 rounded border border-teal-100 shadow-sm">
                    {typeof task.time_slot === 'string' ? task.time_slot : (task.time_slot ? JSON.stringify(task.time_slot) : "Unscheduled")}
                  </span>
                  <span className="text-teal-600 text-lg">☕</span>
                </div>
                <div className="text-teal-800 mt-1 font-medium tracking-wide">
                  {typeof task.task === 'string' ? task.task : JSON.stringify(task.task)}
                </div>
              </div>
            );
          }

          const taskKey = `w${weekIdx}d${index}t${ti}`;
          const isCompleted = completedTasks.has(taskKey);

          return (
            <div key={ti} className={`flex flex-col gap-1 text-sm bg-white hover:bg-slate-50 border ${isCompleted ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200'} rounded-xl px-4 py-3 transition-colors shadow-sm`}>
              <div className="flex items-center justify-between">
                <span className="text-indigo-600 font-medium font-mono text-xs bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 shadow-sm">
                  {typeof task.time_slot === 'string' ? task.time_slot : (task.time_slot ? JSON.stringify(task.time_slot) : "Unscheduled")}
                </span>
                {task.priority === "high" && !isCompleted && (
                  <span className="text-rose-600 text-xs font-bold bg-rose-50 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm border border-rose-100">
                    <span className="text-sm">🔥</span> High Priority
                  </span>
                )}
                {isCompleted && (
                  <span className="text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    ✓ Completed
                  </span>
                )}
              </div>

              <div className={`text-slate-700 mt-2 leading-relaxed ${isCompleted ? 'opacity-60' : ''}`}>
                {task.subject && <span className="text-indigo-600 font-bold mr-2 text-xs uppercase tracking-wider bg-indigo-50 px-2 py-1 rounded inline-block mb-1">{typeof task.subject === 'string' ? task.subject : JSON.stringify(task.subject)}</span>}<br />
                <span className="font-medium text-[15px]">{typeof (task.task ?? task) === 'string' ? (task.task ?? task) : JSON.stringify(task.task ?? task)}</span>
              </div>
              {task.resource_hint && !isCompleted && (
                <div className="mt-2 text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">💡</span> <span>{typeof task.resource_hint === 'string' ? task.resource_hint : JSON.stringify(task.resource_hint)}</span>
                </div>
              )}

              {!isCompleted && !isBreak && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  {activeTaskNode === ti ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-500 font-medium">Time spent (mins):</label>
                        <input type="number" value={duration} onChange={e => setDuration(e.target.value)} min={1} className="w-16 px-2 py-1 bg-white border border-slate-200 rounded text-xs" />
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => {
                          onComplete(task, duration, taskKey);
                          setActiveTaskNode(null);
                        }} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium transition-colors">Confirm</button>
                        <button onClick={() => setActiveTaskNode(null)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-xs font-medium transition-colors">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setActiveTaskNode(ti)} className="text-xs text-indigo-600 font-medium hover:text-indigo-800 transition-colors">
                      + Mark Complete
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {(!day.tasks || day.tasks.length === 0) && (
          <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <p className="text-4xl mb-2 opacity-50">🌴</p>
            <p className="text-sm text-slate-500 font-medium">No tasks scheduled</p>
            <p className="text-xs text-slate-400 mt-1">Free day</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Fallback raw JSON display ── */
function FallbackRaw({ data }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass p-6 space-y-4 border-amber-500/30 relative z-10">
      <div className="flex items-center gap-3">
        <span className="text-2xl">⚠️</span>
        <p className="text-slate-300 text-sm font-medium">
          Campaign data doesn't have the expected standard structure. Showing raw Llama response instead.
        </p>
      </div>
      <button
        onClick={() => setOpen(!open)}
        className="text-amber-400 text-sm font-semibold hover:text-amber-300 transition-colors flex items-center gap-1"
      >
        {open ? "▲ Hide details" : "▼ Show raw JSON"}
      </button>
      {open && (
        <pre className="bg-slate-950 p-5 rounded-xl text-xs overflow-auto max-h-96 text-slate-300 shadow-inner border border-slate-800 custom-scrollbar">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

/* ── Repair truncated JSON ── */
function repairTruncatedJson(s) {
  let trimmed = s.trimEnd();
  // Remove trailing incomplete string value
  trimmed = trimmed.replace(/,?\s*"[^"]*"\s*:\s*"[^"]*$/, "");
  trimmed = trimmed.trimEnd().replace(/,$/, "");
  // Track open brackets
  const stack = [];
  let inStr = false, esc = false;
  for (const ch of trimmed) {
    if (esc) { esc = false; continue; }
    if (ch === "\\" && inStr) { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" && stack.length && stack[stack.length - 1] === "{") stack.pop();
    else if (ch === "]" && stack.length && stack[stack.length - 1] === "[") stack.pop();
  }
  if (!stack.length) return null;
  const closers = stack.reverse().map(c => c === "[" ? "]" : "}").join("");
  try {
    return JSON.parse(trimmed + closers);
  } catch {
    return null;
  }
}

/* ── Normalize campaign ── */
function normalizeCampaign(raw) {
  if (!raw) return null;
  let data = raw;
  // Unwrap stringified JSON
  for (let i = 0; i < 5; i++) {
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch {
        // Try repairing truncated JSON
        const repaired = repairTruncatedJson(data);
        if (repaired) { data = repaired; } else break;
      }
    } else break;
  }
  if (typeof data !== "object" || data === null) return raw;
  if (data.weekly_plans) return data;
  // Search nested wrapper keys
  for (const key of ["campaign", "study_campaign", "plan", "data"]) {
    let val = data[key];
    if (typeof val === "string") {
      try { val = JSON.parse(val); } catch {
        const repaired = repairTruncatedJson(val);
        if (repaired) val = repaired;
      }
    }
    if (val && typeof val === "object" && val.weekly_plans) return val;
  }
  return data;
}
