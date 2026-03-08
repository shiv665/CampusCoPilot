import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../api/client";

const WORK_MIN = 25;
const SHORT_BREAK = 5;
const LONG_BREAK = 15;

export default function Pomodoro() {
  const [task, setTask] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [duration, setDuration] = useState(WORK_MIN);
  const [timeLeft, setTimeLeft] = useState(WORK_MIN * 60);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState("work"); // work | break
  const [pomodorosDone, setPomodorosDone] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [focusPlan, setFocusPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [error, setError] = useState("");
  const intervalRef = useRef(null);

  useEffect(() => {
    (async () => {
      try { const r = await api.pomodoroCount(); setTotalCount(r.count ?? 0); } catch { }
    })();
  }, []);

  const tick = useCallback(() => {
    setTimeLeft((prev) => {
      if (prev <= 1) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setRunning(false);
        if (phase === "work") {
          handlePomodoroComplete();
        }
        return 0;
      }
      return prev - 1;
    });
  }, [phase]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(tick, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, tick]);

  const handlePomodoroComplete = async () => {
    const newCount = pomodorosDone + 1;
    setPomodorosDone(newCount);
    try {
      await api.logPomodoro(task || "Untitled", duration);
      setTotalCount((p) => p + 1);
    } catch { }
    // Auto switch to break
    const breakDur = newCount % 4 === 0 ? LONG_BREAK : SHORT_BREAK;
    setPhase("break");
    setTimeLeft(breakDur * 60);
  };

  const start = () => setRunning(true);
  const pause = () => { setRunning(false); if (intervalRef.current) clearInterval(intervalRef.current); };
  const reset = () => {
    pause();
    setPhase("work");
    setTimeLeft(duration * 60);
  };
  const skipToWork = () => {
    pause();
    setPhase("work");
    setTimeLeft(duration * 60);
  };

  const generatePlan = async () => {
    if (!task.trim()) return setError("Enter a task first");
    setPlanLoading(true);
    setError("");
    try {
      const res = await api.generateFocusSession(task, duration, difficulty);
      setFocusPlan(res.session || res);
    } catch (e) {
      setError(e?.message || String(e));
    } finally { setPlanLoading(false); }
  };

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");
  const progress = phase === "work"
    ? ((duration * 60 - timeLeft) / (duration * 60)) * 100
    : (((pomodorosDone % 4 === 0 ? LONG_BREAK : SHORT_BREAK) * 60 - timeLeft) / ((pomodorosDone % 4 === 0 ? LONG_BREAK : SHORT_BREAK) * 60)) * 100;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">🍅 Pomodoro Timer</h1>

      {/* Timer Card */}
      <div className="glass p-8 text-center space-y-6">
        <p className={`text-sm font-medium uppercase tracking-wider ${phase === "work" ? "text-red-400" : "text-green-400"}`}>
          {phase === "work" ? "🎯 Focus Time" : "☕ Break Time"}
        </p>

        {/* Progress ring simulation */}
        <div className="relative inline-block">
          <div className={`w-56 h-56 rounded-full flex items-center justify-center border-4 ${phase === "work" ? "border-red-600/30" : "border-green-600/30"
            }`} style={{
              background: `conic-gradient(${phase === "work" ? "#dc2626" : "#16a34a"} ${progress}%, transparent ${progress}%)`
            }}>
            <div className="w-48 h-48 rounded-full bg-white shadow-inner flex items-center justify-center">
              <span className="text-5xl font-mono font-bold tracking-wider text-slate-800">{mm}:{ss}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-3">
          {!running ? (
            <button onClick={start} className="px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg">
              ▶ {timeLeft === duration * 60 && phase === "work" ? "Start" : "Resume"}
            </button>
          ) : (
            <button onClick={pause} className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg">
              ⏸ Pause
            </button>
          )}
          <button onClick={reset} className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg">
            ↺ Reset
          </button>
          {phase === "break" && (
            <button onClick={skipToWork} className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg">
              ⏭ Skip Break
            </button>
          )}
        </div>

        <div className="flex justify-center gap-6 text-sm font-medium text-slate-500">
          <span>Session: <strong className="text-indigo-600 text-lg">{pomodorosDone}</strong></span>
          <span>Total: <strong className="text-indigo-600 text-lg">{totalCount}</strong></span>
        </div>
      </div>

      {/* Settings */}
      <div className="glass p-5 space-y-4">
        <h2 className="text-lg font-semibold">⚙️ Session Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Task</label>
            <input value={task} onChange={(e) => setTask(e.target.value)} placeholder="What are you working on?"
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Duration (min)</label>
            <select value={duration} onChange={(e) => { const d = parseInt(e.target.value); setDuration(d); if (!running && phase === "work") setTimeLeft(d * 60); }}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value={15}>15 min</option>
              <option value={25}>25 min</option>
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>60 min</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button onClick={generatePlan} disabled={planLoading}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg">
          {planLoading ? "⏳ Generating…" : "✨ Generate AI Focus Plan"}
        </button>
      </div>

      {/* Focus Plan */}
      {focusPlan && (
        <div className="glass p-5 space-y-3">
          <h2 className="text-lg font-bold text-indigo-700">🎯 Focus Plan</h2>
          {typeof focusPlan === "string" ? (
            <pre className="whitespace-pre-wrap text-sm text-slate-600 font-sans">{focusPlan}</pre>
          ) : (
            <>
              {focusPlan.objective && <p className="text-sm font-medium text-slate-600"><strong>Objective:</strong> {focusPlan.objective}</p>}

              {/* Pomodoro blocks */}
              {focusPlan.pomodoro_blocks && (
                <div className="space-y-2">
                  <p className="text-sm font-bold text-slate-700">📋 Pomodoro Blocks</p>
                  {focusPlan.pomodoro_blocks.map((block, i) => (
                    <div key={i} className="bg-white border border-slate-200 shadow-sm rounded-lg p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-indigo-600">Block {block.block_number ?? i + 1}</span>
                        <span className="text-xs font-bold text-slate-500">{block.duration_minutes ?? 25} min</span>
                      </div>
                      {block.focus && <p className="text-xs font-medium text-slate-700">🎯 {block.focus}</p>}
                      {block.mini_goal && <p className="text-xs font-bold text-green-600">✅ {block.mini_goal}</p>}
                    </div>
                  ))}
                </div>
              )}

              {/* Breaks */}
              {focusPlan.breaks && focusPlan.breaks.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-bold text-slate-700">☕ Breaks</p>
                  {focusPlan.breaks.map((brk, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-200 shadow-sm rounded-lg px-3 py-2 text-xs font-medium text-slate-600 flex justify-between">
                      <span>After block {brk.after_block ?? i + 1}: {brk.activity ?? "Rest"}</span>
                      <span className="font-bold text-slate-500">{brk.duration_minutes ?? 5} min</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Steps (alternative format) */}
              {focusPlan.steps && (
                <ol className="space-y-2 text-sm font-medium text-slate-700">
                  {(Array.isArray(focusPlan.steps) ? focusPlan.steps : []).map((s, i) => (
                    <li key={i} className="flex gap-2"><span className="text-indigo-600 font-bold">{i + 1}.</span><span>{typeof s === "string" ? s : s.description || JSON.stringify(s)}</span></li>
                  ))}
                </ol>
              )}

              {focusPlan.tip && <p className="text-xs font-medium text-amber-600 mt-2">💡 {focusPlan.tip}</p>}

              {/* Summary info */}
              {focusPlan.total_focus_minutes && (
                <p className="text-xs font-bold text-slate-500">⏱ Total focus: {focusPlan.total_focus_minutes} min</p>
              )}

              {!focusPlan.steps && !focusPlan.objective && !focusPlan.pomodoro_blocks && (
                <pre className="whitespace-pre-wrap text-sm text-slate-600 font-sans">{JSON.stringify(focusPlan, null, 2)}</pre>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
