import { useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

const SEMESTER_TYPES = ["autumn", "spring"];

export default function Planner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(0); // 0=choose mode, 1=semester setup, 2=add subjects, 3=review+generate

  /* ── past plans ── */
  const [pastPlans, setPastPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  /* ── semester info (Step 1) ── */
  const [semesterInfo, setSemesterInfo] = useState({
    university: "", branch: "", semester_type: "autumn", semester_number: "",
    semester_start: "", midterm_start: "", midterm_end: "",
    endterm_start: "", endterm_end: "", dates_released: false,
  });

  /* ── subjects (Step 2) ── */
  const [planId, setPlanId] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [newSubject, setNewSubject] = useState({ name: "", credits: "", weak: false, strength: "Okay", interest: "Okay", target_completion_date: "" });
  const [subjectFile, setSubjectFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  /* ── campaign gen (Step 3) ── */
  const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const [timetable, setTimetable] = useState(
    Object.fromEntries(WEEKDAYS.map((d) => [d, ""]))
  );
  const [timetableFile, setTimetableFile] = useState(null);
  const [timetableParsing, setTimetableParsing] = useState(false);
  const [timetableRaw, setTimetableRaw] = useState("");
  const [calendarFile, setCalendarFile] = useState(null);
  const [calendarParsing, setCalendarParsing] = useState(false);
  const [calendarHolidays, setCalendarHolidays] = useState("");
  const [constraints, setConstraints] = useState({
    available_hours_per_day: 4, language_preference: "English",
    fragmented_schedule: false, study_style: "balanced", target_career_track: "Core Engineering", additional_notes: "",
    additional_events: [],
  });
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  /* ── study groups ── */
  const [showGroups, setShowGroups] = useState(false);
  const [groups, setGroups] = useState([]);
  const [groupLoading, setGroupLoading] = useState(false);

  /* ── legacy single upload ── */
  const [showLegacy, setShowLegacy] = useState(false);
  const [legacyFile, setLegacyFile] = useState(null);
  const [legacyDragOver, setLegacyDragOver] = useState(false);
  const [legacyUploading, setLegacyUploading] = useState(false);
  const [legacyResult, setLegacyResult] = useState(null);
  const [legacyError, setLegacyError] = useState("");
  const [legacyConstraints, setLegacyConstraints] = useState({
    name: "", available_hours_per_day: 4, weak_subjects: "",
    language_preference: "English", fragmented_schedule: false,
    exam_date: "", additional_notes: "",
  });
  const [legacyGenerating, setLegacyGenerating] = useState(false);
  const [legacyGenError, setLegacyGenError] = useState("");

  /* ──────────── Load past plans ──────────── */
  const fetchPastPlans = async () => {
    setLoadingPlans(true);
    try {
      const [semRes, sessRes] = await Promise.all([
        api.listSemesterPlans().catch(() => ({ plans: [] })),
        api.listSessions().catch(() => ({ sessions: [] })),
      ]);
      const plans = [
        ...(semRes.plans || []).map((p) => ({ ...p, _type: "semester" })),
        ...(sessRes.sessions || []).map((s) => ({ ...s, _type: "legacy" })),
      ];
      plans.sort((a, b) => (b.updated_at || b.created_at || "").localeCompare(a.updated_at || a.created_at || ""));
      setPastPlans(plans);
    } catch { /* ignore */ }
    finally { setLoadingPlans(false); }
  };

  useEffect(() => {
    fetchPastPlans();
  }, []);

  /* ── Auto-resume from Sessions page ── */
  useEffect(() => {
    const st = location.state;
    if (!st?.resumePlanId) return;
    const resumePlan = async () => {
      try {
        if (st.resumeType === "semester") {
          const res = await api.getSemesterPlan(st.resumePlanId);
          const p = res.plan ?? res;
          setPlanId(p._id);
          setSubjects(p.subjects || []);
          setSemesterInfo({ university: p.university || "", branch: p.branch || "", semester_type: p.semester_type || "autumn", semester_number: p.semester_number || "", semester_start: p.semester_start || "", midterm_start: p.midterm_start || "", midterm_end: p.midterm_end || "", endterm_start: p.endterm_start || "", endterm_end: p.endterm_end || "", dates_released: p.dates_released || false });
          setStep(st.editMode ? 2 : (p.subjects?.length > 0 ? 3 : 2));
        } else {
          const res = await api.getSession(st.resumePlanId);
          const s = res.session ?? res;
          setShowLegacy(true);
          setStep(-1);
          setLegacyResult({ session_id: s._id, pdf_filename: s.filename, topics: s.topics, total_pages: s.total_pages, filename: s.filename });
        }
      } catch { /* ignore */ }
    };
    resumePlan();
    // Clear the location state so refreshing doesn't re-trigger
    window.history.replaceState({}, document.title);
  }, [location.state]);

  /* ──────────── Step 1: Create Semester Plan ──────────── */
  const handleCreatePlan = async () => {
    try {
      const res = await api.createSemesterPlan(semesterInfo);
      setPlanId(res.plan._id);
      setStep(2);
    } catch (err) {
      setGenError(err.message);
    }
  };

  /* ──────────── Step 2: Subject management ──────────── */
  const handleAddSubjectManual = async () => {
    if (!newSubject.name.trim()) return;
    try {
      const res = await api.addSubject(planId, {
        name: newSubject.name.trim(),
        credits: newSubject.credits ? parseInt(newSubject.credits) : null,
        weak: newSubject.weak,
        strength: newSubject.strength,
        interest: newSubject.interest,
        target_completion_date: newSubject.target_completion_date || null,
        topics: [],
      });
      setSubjects(res.subjects);
      setNewSubject({ name: "", credits: "", weak: false, strength: "Okay", interest: "Okay", target_completion_date: "" });
    } catch (err) {
      setUploadError(err.message);
    }
  };

  const handleUploadSubjectPdf = async () => {
    if (!subjectFile || !newSubject.name.trim()) return;
    setUploading(true);
    setUploadError("");
    try {
      const res = await api.uploadSubjectPdf(
        planId, subjectFile, newSubject.name.trim(),
        newSubject.credits ? parseInt(newSubject.credits) : 0,
        newSubject.weak,
        newSubject.strength,
        newSubject.interest
      );
      // Backend doesn't currently accept target_completion_date in upload doc natively, 
      // but we update the subjects array right after to save it if they set it.
      if (newSubject.target_completion_date) {
        const updatedSubjects = [...res.subjects];
        updatedSubjects[updatedSubjects.length - 1].target_completion_date = newSubject.target_completion_date;
        await api.updateSubjects(planId, updatedSubjects);
        setSubjects(updatedSubjects);
      } else {
        setSubjects(res.subjects);
      }
      setNewSubject({ name: "", credits: "", weak: false, strength: "Okay", interest: "Okay", target_completion_date: "" });
      setSubjectFile(null);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const toggleWeak = async (index) => {
    const updated = subjects.map((s, i) => i === index ? { ...s, weak: !s.weak } : s);
    try {
      await api.updateSubjects(planId, updated);
      setSubjects(updated);
    } catch { /* ignore */ }
  };

  const removeSubject = async (index) => {
    const updated = subjects.filter((_, i) => i !== index);
    try {
      await api.updateSubjects(planId, updated);
      setSubjects(updated);
    } catch { /* ignore */ }
  };


  const toggleTopicCovered = async (subjectIndex, topicIndex) => {
    const updated = [...subjects];
    const newCoveredState = !updated[subjectIndex].topics[topicIndex].covered;
    // ensure topics items are objects
    if (typeof updated[subjectIndex].topics[topicIndex] === "string") {
      updated[subjectIndex].topics[topicIndex] = { topic: updated[subjectIndex].topics[topicIndex], covered: newCoveredState };
    } else {
      updated[subjectIndex].topics[topicIndex].covered = newCoveredState;
    }

    try {
      await api.updateSubjects(planId, updated);
      setSubjects(updated);
    } catch { /* ignore */ }
  };

  /* ──────────── Step 3: Generate Campaign ──────────── */
  const handleGenerateSemesterCampaign = async () => {
    if (!planId) return;
    setGenerating(true);
    setGenError("");
    try {
      // Build unavailable_hours from structured timetable
      const timetableLines = [
        ...WEEKDAYS.filter((d) => timetable[d]?.trim()).map((d) => `${d}: ${timetable[d].trim()}`),
        timetableRaw
      ].filter(Boolean).join(". ");
      const unavailable = [timetableLines, calendarHolidays].filter(Boolean).join("\n\nAcademic Calendar:\n");

      const payload = {
        available_hours_per_day: Number(constraints.available_hours_per_day) || 4,
        language_preference: constraints.language_preference || "English",
        fragmented_schedule: constraints.fragmented_schedule,
        study_style: constraints.study_style || "balanced",
        target_career_track: constraints.target_career_track || "Core Engineering",
        additional_notes: constraints.additional_notes || null,
        unavailable_hours: unavailable || null,
      };
      await api.generateSemesterCampaign(planId, payload);
      navigate(`/campaign/semester-${planId}`);
    } catch (err) {
      setGenError(err?.message || String(err));
    } finally {
      setGenerating(false);
    }
  };

  /* ──────────── Study Groups ──────────── */
  const handleSearchGroups = async () => {
    setGroupLoading(true);
    try {
      const res = await api.searchStudyGroups(semesterInfo.university, semesterInfo.branch);
      setGroups(res.groups || []);
    } catch { setGroups([]); }
    finally { setGroupLoading(false); }
  };

  /* ──────────── Legacy single-upload flow ──────────── */
  const handleLegacyUpload = async () => {
    if (!legacyFile) return;
    setLegacyUploading(true);
    setLegacyError("");
    try {
      const res = await api.uploadSyllabus(legacyFile);
      setLegacyResult(res);
    } catch (err) { setLegacyError(err.message); }
    finally { setLegacyUploading(false); }
  };

  const onLegacyDrop = useCallback((e) => {
    e.preventDefault();
    setLegacyDragOver(false);
    const dropped = e.dataTransfer?.files?.[0];
    if (dropped?.type === "application/pdf" || dropped?.type?.startsWith("image/")) setLegacyFile(dropped);
  }, []);

  const handleLegacyGenerate = async () => {
    if (!legacyResult?.session_id) return;
    setLegacyGenerating(true);
    setLegacyGenError("");
    try {
      const timetableLines = [
        ...WEEKDAYS.filter((d) => timetable[d]?.trim()).map((d) => `${d}: ${timetable[d].trim()}`),
        timetableRaw
      ].filter(Boolean).join(". ");
      const unavailable = [timetableLines, calendarHolidays].filter(Boolean).join("\n\nAcademic Calendar:\n");

      const payload = {
        name: user?.name || "Student",
        available_hours_per_day: Number(legacyConstraints.available_hours_per_day) || 4,
        weak_subjects: legacyConstraints.weak_subjects ? legacyConstraints.weak_subjects.split(",").map((s) => s.trim()).filter(Boolean) : [],
        language_preference: legacyConstraints.language_preference || "English",
        fragmented_schedule: legacyConstraints.fragmented_schedule,
        exam_date: legacyConstraints.exam_date || null,
        additional_notes: legacyConstraints.additional_notes || null,
        unavailable_hours: unavailable || null,
      };
      await api.generateCampaign(legacyResult.session_id, payload);
      navigate(`/campaign/${legacyResult.session_id}`);
    } catch (err) { setLegacyGenError(err?.message || String(err)); }
    finally { setLegacyGenerating(false); }
  };

  const updateLegacy = (field) => (e) =>
    setLegacyConstraints((prev) => ({
      ...prev, [field]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    }));

  const updateField = (field) => (e) =>
    setConstraints((prev) => ({
      ...prev, [field]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    }));

  /* ──────────── RENDER ──────────── */
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">📄 Study Planner</h1>

      {/* ═══════ Step 0: Choose Mode ═══════ */}
      {step === 0 && (
        <>
          {/* Action cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setStep(1)}
              className="glass p-6 text-left hover:ring-2 hover:ring-indigo-500 transition-all rounded-xl"
            >
              <div className="text-3xl mb-2">🎓</div>
              <h2 className="text-lg font-semibold text-indigo-300">Semester Planner</h2>
              <p className="text-sm text-slate-400 mt-1">
                Plan your entire semester with multiple subjects, midterm/endterm dates, and
                smart scheduling across all courses.
              </p>
            </button>

            <button
              onClick={() => { setShowLegacy(true); setStep(-1); }}
              className="glass p-6 text-left hover:ring-2 hover:ring-indigo-500 transition-all rounded-xl"
            >
              <div className="text-3xl mb-2">📎</div>
              <h2 className="text-lg font-semibold text-indigo-300">Quick Single-Subject</h2>
              <p className="text-sm text-slate-400 mt-1">
                Upload a single syllabus PDF and generate a study campaign for one subject.
              </p>
            </button>
          </div>

          {/* Past plans */}
          <div className="glass p-6 space-y-3">
            <h2 className="text-lg font-semibold">📚 Your Plans</h2>
            {loadingPlans ? (
              <p className="text-slate-400 text-sm">Loading…</p>
            ) : pastPlans.length === 0 ? (
              <p className="text-slate-500 text-sm">No plans yet. Create your first one above!</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                {pastPlans.map((p) => (
                  <div
                    key={p._id}
                    className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-3 hover:border-indigo-300 hover:shadow-md cursor-pointer transition-all shadow-sm"
                    onClick={() => {
                      if (p._type === "semester") {
                        if (p.campaign) navigate(`/campaign/semester-${p._id}`);
                        else { setPlanId(p._id); setSubjects(p.subjects || []); setSemesterInfo({ university: p.university || "", branch: p.branch || "", semester_type: p.semester_type || "autumn", semester_number: p.semester_number || "", semester_start: p.semester_start || "", midterm_start: p.midterm_start || "", midterm_end: p.midterm_end || "", endterm_start: p.endterm_start || "", endterm_end: p.endterm_end || "", dates_released: p.dates_released || false }); setStep(2); }
                      } else {
                        if (p.campaign) navigate(`/campaign/${p._id}`);
                        else {
                          setShowLegacy(true);
                          setStep(-1);
                          setLegacyResult({ session_id: p._id, pdf_filename: p.filename });
                        }
                      }
                    }}
                  >
                    <div>
                      <p className="font-bold text-indigo-700">
                        {p._type === "semester" ? (
                          <>🎓 {p.university || "Semester"} – {p.branch || "Plan"} ({p.semester_type})</>
                        ) : (
                          <>📎 {p.filename || "Single Subject"}</>
                        )}
                      </p>
                      <p className="text-xs font-medium text-slate-500 mt-1">
                        {p._type === "semester" && p.subjects?.length ? `${p.subjects.length} subjects · ` : ""}
                        {p.campaign ? "✅ Campaign generated" : "⏳ In progress"}
                        {p.updated_at ? ` · ${new Date(p.updated_at).toLocaleDateString()}` : ""}
                      </p>
                    </div>
                    <span className="text-slate-500 text-xl">→</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══════ Step 1: Semester Setup ═══════ */}
      {step === 1 && (
        <div className="glass p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">🎓 Step 1 – Semester Information</h2>
            <button onClick={() => { fetchPastPlans(); setStep(0); }} className="text-sm text-slate-400 hover:text-slate-200">← Back</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="University Name" value={semesterInfo.university}
              onChange={(e) => setSemesterInfo({ ...semesterInfo, university: e.target.value })}
              placeholder="Enter university name" />
            <Input label="Branch / Department" value={semesterInfo.branch}
              onChange={(e) => setSemesterInfo({ ...semesterInfo, branch: e.target.value })}
              placeholder="Enter branch or department" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Semester Type</label>
              <select value={semesterInfo.semester_type}
                onChange={(e) => setSemesterInfo({ ...semesterInfo, semester_type: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {SEMESTER_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <Input label="Semester Number" value={semesterInfo.semester_number}
              onChange={(e) => setSemesterInfo({ ...semesterInfo, semester_number: e.target.value })}
              placeholder="Enter semester number" />
            <Input label="Semester Start Date" type="date" value={semesterInfo.semester_start}
              onChange={(e) => setSemesterInfo({ ...semesterInfo, semester_start: e.target.value })} />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={semesterInfo.dates_released}
              onChange={(e) => setSemesterInfo({ ...semesterInfo, dates_released: e.target.checked })}
              className="rounded bg-slate-700 border-slate-600" />
            Exam dates are released
          </label>

          {semesterInfo.dates_released && (
            <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-lg shadow-sm">
              <h3 className="text-sm font-bold text-slate-700">📅 Exam Dates</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Midterm Start" type="date" value={semesterInfo.midterm_start}
                  onChange={(e) => setSemesterInfo({ ...semesterInfo, midterm_start: e.target.value })} />
                <Input label="Midterm End" type="date" value={semesterInfo.midterm_end}
                  onChange={(e) => setSemesterInfo({ ...semesterInfo, midterm_end: e.target.value })} />
                <Input label="End-term Start" type="date" value={semesterInfo.endterm_start}
                  onChange={(e) => setSemesterInfo({ ...semesterInfo, endterm_start: e.target.value })} />
                <Input label="End-term End" type="date" value={semesterInfo.endterm_end}
                  onChange={(e) => setSemesterInfo({ ...semesterInfo, endterm_end: e.target.value })} />
              </div>
            </div>
          )}

          {/* Study Groups Search */}
          {semesterInfo.university && (
            <div className="pt-2">
              <button onClick={() => { setShowGroups(!showGroups); if (!showGroups) handleSearchGroups(); }}
                className="text-sm text-indigo-400 hover:text-indigo-300 underline">
                🔍 Find study groups from your university
              </button>
              {showGroups && (
                <div className="mt-3 space-y-2">
                  {groupLoading ? <p className="text-slate-400 text-sm">Searching…</p> : groups.length === 0 ? (
                    <p className="text-slate-500 text-sm">No groups found yet. Be the first!</p>
                  ) : groups.map((g, i) => (
                    <div key={i} className="bg-white border border-slate-200 shadow-sm rounded-lg px-4 py-2">
                      <p className="font-bold text-indigo-700">{g.group_name}</p>
                      <p className="text-xs font-medium text-slate-500 mt-0.5">{g.members?.length || 0} members · Subjects: {g.subjects?.join(", ") || "none"}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {genError && <p className="text-red-400 text-sm">{genError}</p>}

          <button onClick={handleCreatePlan} disabled={!semesterInfo.university.trim()}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors">
            Continue to Add Subjects →
          </button>
        </div>
      )}

      {/* ═══════ Step 2: Add Subjects ═══════ */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">📚 Step 2 – Add Your Subjects</h2>
            <button onClick={() => setStep(1)} className="text-sm text-slate-400 hover:text-slate-200">← Back</button>
          </div>

          <p className="text-sm text-slate-400">
            Add all the subjects in your semester. You can upload PDF syllabi or add subjects manually.
            Aim for 6-10 subjects typical for a semester.
          </p>

          {/* Current subjects */}
          {subjects.length > 0 && (
            <div className="glass p-4 space-y-2">
              <h3 className="text-sm font-semibold text-slate-300">
                Added Subjects ({subjects.length})
              </h3>
              {subjects.map((s, i) => (
                <div key={i} className="flex items-center justify-between bg-white border border-slate-200 shadow-sm rounded-lg px-4 py-2.5">
                  <div className="flex-1">
                    <span className="font-bold text-slate-800">{s.name}</span>
                    {s.credits ? <span className="text-xs font-medium text-slate-500 ml-2">({s.credits} cr)</span> : null}
                    {s.pdf_uploaded && <span className="text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded ml-2">📎 PDF</span>}
                    {s.weak && <span className="text-xs font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded ml-2">⚠️ Weak</span>}
                    {s.target_completion_date && <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded ml-2">🎯 Due: {s.target_completion_date}</span>}
                    {s.topics?.length > 0 && (
                      <span className="text-xs font-medium text-slate-500 ml-2">· {s.topics.length} topics</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => toggleWeak(i)}
                      className={`text-xs px-2.5 py-1.5 rounded font-bold transition-colors ${s.weak ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                      {s.weak ? "Weak ✓" : "Mark Weak"}
                    </button>
                    <button onClick={() => removeSubject(i)} className="text-xs px-2.5 py-1.5 rounded font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors">
                      Remove Subject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add subject form */}
          <div className="glass p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-300">Add a Subject</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <Input label="Subject Name" value={newSubject.name}
                onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                placeholder="Enter subject name" />
              <Input label="Target Date (Optional)" type="date" value={newSubject.target_completion_date}
                onChange={(e) => setNewSubject({ ...newSubject, target_completion_date: e.target.value })} />
              <Input label="Credits (opt)" type="number" min={0} max={10} value={newSubject.credits}
                onChange={(e) => setNewSubject({ ...newSubject, credits: e.target.value })}
                placeholder="Enter credits" />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Strength</label>
                <select value={newSubject.strength} onChange={(e) => setNewSubject({ ...newSubject, strength: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="Strong">Strong</option>
                  <option value="Okay">Okay</option>
                  <option value="Weak">Weak</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Interest</label>
                <select value={newSubject.interest} onChange={(e) => setNewSubject({ ...newSubject, interest: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="Highly">Highly</option>
                  <option value="Okay">Okay</option>
                  <option value="Not interested">Not interested</option>
                </select>
              </div>
            </div>

            {/* File upload area */}
            <div className="flex flex-col gap-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Syllabus File Override (Optional)</label>
              <div className="flex items-center gap-3">
                <input type="file" accept=".pdf, image/png, image/jpeg" className="text-sm font-medium text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700 file:font-bold hover:file:bg-slate-200 cursor-pointer"
                  onChange={(e) => setSubjectFile(e.target.files?.[0] ?? null)} />
                {subjectFile ? (
                  <span className="text-xs font-bold text-green-600">📎 {subjectFile.name}</span>
                ) : (
                  <span className="text-xs font-medium text-slate-500">Hint: Upload a syllabus PDF/Image to extract topics.</span>
                )}
              </div>
            </div>

            {uploadError && <p className="text-red-400 text-sm">{uploadError}</p>}

            <div className="flex gap-3">
              {subjectFile ? (
                <button onClick={handleUploadSubjectPdf} disabled={!newSubject.name.trim() || uploading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                  {uploading ? "⏳ Extracting topics…" : "Upload & Extract Topics"}
                </button>
              ) : (
                <button onClick={handleAddSubjectManual} disabled={!newSubject.name.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                  + Add Subject Manually
                </button>
              )}
            </div>
          </div>

          {subjects.length > 0 && (
            <button onClick={() => setStep(3)}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors">
              Continue to Review & Generate →
            </button>
          )}
        </div>
      )}

      {/* ═══════ Step 3: Review & Generate ═══════ */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">🚀 Step 3 – Review & Generate Campaign</h2>
            <button onClick={() => setStep(2)} className="text-sm text-slate-400 hover:text-slate-200">← Back</button>
          </div>

          {/* Semester summary */}
          <div className="glass p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">📋 Semester Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div><span className="text-slate-400">University:</span> <span className="text-slate-200">{semesterInfo.university || "—"}</span></div>
              <div><span className="text-slate-400">Branch:</span> <span className="text-slate-200">{semesterInfo.branch || "—"}</span></div>
              <div><span className="text-slate-400">Semester:</span> <span className="text-slate-200">{semesterInfo.semester_number || "—"} ({semesterInfo.semester_type})</span></div>
              <div><span className="text-slate-400">Start:</span> <span className="text-slate-200">{semesterInfo.semester_start || "—"}</span></div>
              {semesterInfo.dates_released && (
                <>
                  <div><span className="text-slate-400">Midterm:</span> <span className="text-slate-200">{semesterInfo.midterm_start || "—"} → {semesterInfo.midterm_end || "—"}</span></div>
                  <div><span className="text-slate-400">End-term:</span> <span className="text-slate-200">{semesterInfo.endterm_start || "—"} → {semesterInfo.endterm_end || "—"}</span></div>
                </>
              )}
            </div>
          </div>

          {/* All subjects & their topics */}
          <div className="glass p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-300">
              📚 Subjects ({subjects.length}) – {subjects.reduce((a, s) => a + (s.topics?.length || 0), 0)} total topics
            </h3>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
              {subjects.map((s, i) => (
                <div key={i} className="bg-white border border-slate-200 shadow-sm rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-indigo-700">{s.name}</span>
                    {s.credits ? <span className="text-xs font-medium text-slate-500">({s.credits} cr)</span> : null}
                    {s.weak && <span className="text-xs font-bold bg-amber-50 border border-amber-200 text-amber-600 px-1.5 py-0.5 rounded">Weak</span>}
                    {s.pdf_uploaded && <span className="text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">📎 PDF</span>}
                  </div>
                  {s.topics?.length > 0 ? (
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {s.topics.map((t, j) => {
                        const topicName = typeof t === "string" ? t : t.topic;
                        const isCovered = t.covered === true;
                        return (
                          <label key={j} className={`flex items-center gap-1.5 text-xs font-medium border px-2 py-1 rounded cursor-pointer transition-colors ${isCovered ? "bg-green-50 border-green-200 text-green-700" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"}`}>
                            <input type="checkbox" checked={isCovered} onChange={() => toggleTopicCovered(i, j)} className="w-3 h-3 text-green-600 rounded focus:ring-green-500 border-slate-300" />
                            <span className={isCovered ? "line-through opacity-70" : ""}>{topicName}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs font-medium text-slate-500 mt-1.5">No topics extracted (AI will use subject name)</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Class Timetable */}
          <div className="glass p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-300">🗓️ Weekly Class Timetable (Mon–Fri)</h3>
              <p className="text-xs text-slate-400 mt-1">Provide your class/lab timings so the AI avoids scheduling study sessions during classes. Upload an image/PDF of your timetable to auto-extract text.</p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="file" accept=".pdf,image/png,image/jpeg"
                className="text-sm font-medium text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700 file:font-bold hover:file:bg-slate-200 cursor-pointer"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setTimetableFile(f);
                  setTimetableParsing(true);
                  try {
                    const res = await api.scanNotes(f);
                    const text = res.text || res.extracted_text || "";
                    setTimetableRaw(text);
                  } catch { /* ignore */ }
                  finally { setTimetableParsing(false); }
                }}
              />
              {timetableFile && <span className="text-xs font-bold text-green-600">📎 {timetableFile.name}</span>}
              {timetableParsing && <span className="text-xs text-amber-500 animate-pulse">Extracting…</span>}
            </div>

            {timetableRaw || timetableFile ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Extracted Timetable Data</label>
                <textarea
                  value={timetableRaw}
                  onChange={(e) => setTimetableRaw(e.target.value)}
                  placeholder="Raw timetable data..."
                  rows={4}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-sm"
                />
              </div>
            ) : null}

            <div className="space-y-3 pt-2 border-t border-slate-200/50 mt-4">
              {WEEKDAYS.map((day) => (
                <div key={day} className="flex items-start gap-3">
                  <span className="w-24 shrink-0 text-sm font-bold text-slate-600 pt-2.5">{day}</span>
                  <input
                    value={timetable[day]}
                    onChange={(e) => setTimetable((prev) => ({ ...prev, [day]: e.target.value }))}
                    placeholder="Enter class schedule (e.g. 9:00-11:00 Math)"
                    className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Academic Calendar Upload */}
          <div className="glass p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-300">📆 Academic Calendar (Optional)</h3>
              <p className="text-xs text-slate-400 mt-1">Upload your university academic calendar (PDF/image) to auto-detect holidays, exam dates, and events. Or type them manually.</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="file" accept=".pdf,image/png,image/jpeg"
                className="text-sm font-medium text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700 file:font-bold hover:file:bg-slate-200 cursor-pointer"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setCalendarFile(f);
                  setCalendarParsing(true);
                  try {
                    const res = await api.scanNotes(f);
                    const text = res.text || res.extracted_text || "";
                    setCalendarHolidays(text);
                  } catch { /* ignore */ }
                  finally { setCalendarParsing(false); }
                }}
              />
              {calendarFile && <span className="text-xs font-bold text-green-600">📎 {calendarFile.name}</span>}
              {calendarParsing && <span className="text-xs text-amber-500 animate-pulse">Extracting…</span>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Holidays & Key Dates</label>
              <textarea
                value={calendarHolidays}
                onChange={(e) => setCalendarHolidays(e.target.value)}
                placeholder="Enter holidays and key dates"
                rows={3}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
          </div>

          {/* Study Preferences */}
          <div className="glass p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-300">⚙️ Study Preferences</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Hours / Day" type="number" min={0.5} max={16} step={0.5}
                value={constraints.available_hours_per_day} onChange={updateField("available_hours_per_day")} />
              <Input label="Language" value={constraints.language_preference} onChange={updateField("language_preference")} />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Study Style
                  <span className="ml-1.5 text-xs text-slate-500 font-normal tracking-tight hidden lg:inline">(Instructs AI pacing)</span>
                </label>
                <select value={constraints.study_style} onChange={updateField("study_style")}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="intensive">Intensive (long sessions)</option>
                  <option value="balanced">Balanced</option>
                  <option value="pomodoro">Pomodoro (short bursts)</option>
                  <option value="spaced">Spaced Repetition</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Target Career Track
                </label>
                <select value={constraints.target_career_track} onChange={updateField("target_career_track")}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="Core Engineering">Core Engineering</option>
                  <option value="IT & Software">IT & Software / SDE</option>
                  <option value="Management">Management / Consulting</option>
                  <option value="Research">Research & Academia</option>
                  <option value="Design">UI/UX & Design</option>
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300 group cursor-pointer w-fit">
              <input type="checkbox" checked={constraints.fragmented_schedule} onChange={updateField("fragmented_schedule")}
                className="rounded bg-slate-700 border-slate-600" />
              Fragmented Schedule
              <span className="text-xs text-slate-500 font-normal italic group-hover:text-indigo-300 transition-colors">(Splits study time into smaller 30-45m chunks)</span>
            </label>
            <Input label="Additional Notes" value={constraints.additional_notes || ""} onChange={updateField("additional_notes")}
              placeholder="Enter additional notes or constraints" />
          </div>

          {/* Extra Events (Unified Smart Scheduler) */}
          <div className="glass p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-300">📅 Additional Events (Unified Smart Scheduler)</h3>
                <p className="text-xs text-slate-400 mt-1">Add recurring commitments or specific deadline-driven events. The AI will schedule them natively into your campaign.</p>
              </div>
              <button onClick={() => setConstraints(c => ({ ...c, additional_events: [...(c.additional_events || []), { event_name: "", type: "deadline", deadline: "", fixed_date: "", fixed_start_time: "", difficulty: "medium", time_required_hours: 1 }] }))}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors">
                + Add Event
              </button>
            </div>

            {(constraints.additional_events || []).map((ev, i) => (
              <div key={i} className="bg-white rounded-xl p-4 space-y-3 border border-slate-200 shadow-sm relative pt-10">
                <div className="absolute top-0 left-0 w-full flex justify-between items-center bg-slate-50 border-b border-slate-200 px-4 py-2 rounded-t-xl">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Event {i + 1}</span>
                  <button onClick={() => setConstraints(c => ({ ...c, additional_events: c.additional_events.filter((_, idx) => idx !== i) }))} className="text-red-500 font-bold text-xs hover:text-red-700 transition-colors">Remove</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <Input label="Event Name" value={ev.event_name} onChange={(e) => {
                    const next = [...constraints.additional_events];
                    next[i].event_name = e.target.value;
                    setConstraints({ ...constraints, additional_events: next });
                  }} placeholder="Enter event name" />

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                    <select value={ev.type} onChange={(e) => {
                      const next = [...constraints.additional_events];
                      next[i].type = e.target.value;
                      setConstraints({ ...constraints, additional_events: next });
                    }} className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm">
                      <option value="deadline">Deadline-driven (AI picks day)</option>
                      <option value="fixed">Fixed Date/Time (Recurring/Locked)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Difficulty</label>
                    <select value={ev.difficulty} onChange={(e) => {
                      const next = [...constraints.additional_events];
                      next[i].difficulty = e.target.value;
                      setConstraints({ ...constraints, additional_events: next });
                    }} className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm">
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>

                  {ev.type === "deadline" ? (
                    <Input label="Deadline" type="date" value={ev.deadline} onChange={(e) => {
                      const next = [...constraints.additional_events];
                      next[i].deadline = e.target.value;
                      setConstraints({ ...constraints, additional_events: next });
                    }} />
                  ) : (
                    <>
                      <Input label="Date (or Day of week)" value={ev.fixed_date} placeholder="Enter date or frequency" onChange={(e) => {
                        const next = [...constraints.additional_events];
                        next[i].fixed_date = e.target.value;
                        setConstraints({ ...constraints, additional_events: next });
                      }} />
                      <Input label="Time" type="time" value={ev.fixed_start_time} onChange={(e) => {
                        const next = [...constraints.additional_events];
                        next[i].fixed_start_time = e.target.value;
                        setConstraints({ ...constraints, additional_events: next });
                      }} />
                    </>
                  )}

                  <Input label="Duration (hours)" type="number" min={0.25} step={0.25} value={ev.time_required_hours} onChange={(e) => {
                    const next = [...constraints.additional_events];
                    next[i].time_required_hours = parseFloat(e.target.value) || 1;
                    setConstraints({ ...constraints, additional_events: next });
                  }} />
                </div>
              </div>
            ))}
            {(!constraints.additional_events || constraints.additional_events.length === 0) && (
              <div className="text-center py-4 border border-dashed border-slate-300 bg-slate-50 rounded-lg text-slate-500 text-sm font-medium">
                No extra events added. The AI will only schedule syllabus topics.
              </div>
            )}
          </div>

          {genError && <p className="text-red-400 text-sm">{genError}</p>}

          <button onClick={handleGenerateSemesterCampaign} disabled={generating}
            className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors text-lg">
            {generating ? "⏳ Generating Unified Campaign…" : `🚀 Generate Semester Campaign (${subjects.length} subjects)`}
          </button>
        </div>
      )}

      {/* ═══════ Legacy Single Upload ═══════ */}
      {step === -1 && showLegacy && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">📎 Quick Single-Subject Upload</h2>
            <button onClick={() => { setShowLegacy(false); fetchPastPlans(); setStep(0); }} className="text-sm text-slate-400 hover:text-slate-200">← Back</button>
          </div>

          {!legacyResult && (
            <div className="glass p-6 space-y-4">
              <div
                onDragOver={(e) => { e.preventDefault(); setLegacyDragOver(true); }}
                onDragLeave={() => setLegacyDragOver(false)}
                onDrop={onLegacyDrop}
                className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${legacyDragOver ? "border-indigo-400 bg-indigo-900/20" : "border-slate-600 hover:border-slate-500"
                  }`}
                onClick={() => document.getElementById("legacy-pdf-input").click()}
              >
                <input id="legacy-pdf-input" type="file" accept=".pdf, image/png, image/jpeg" className="hidden"
                  onChange={(e) => setLegacyFile(e.target.files?.[0] ?? null)} />
                {legacyFile ? (
                  <p className="text-indigo-300 font-medium">📎 {legacyFile.name}</p>
                ) : (
                  <p className="text-slate-400">Drag & drop a PDF/Image here, or <span className="text-indigo-400 underline">click to choose</span></p>
                )}
              </div>
              {legacyError && <p className="text-red-400 text-sm">{legacyError}</p>}
              <button onClick={handleLegacyUpload} disabled={!legacyFile || legacyUploading}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors">
                {legacyUploading ? "⏳ Extracting topics…" : "Upload & Extract Topics"}
              </button>
            </div>
          )}

          {legacyResult && (
            <>
              <div className="glass p-6 space-y-3">
                <h2 className="text-lg font-semibold">📚 Extracted Topics ({legacyResult.topics?.length ?? 0})</h2>
                <p className="text-xs text-slate-400">
                  From <span className="text-indigo-300">{legacyResult.filename}</span> · {legacyResult.total_pages} pages
                </p>
                <div className="grid gap-2 max-h-64 overflow-y-auto pr-2">
                  {(legacyResult.topics ?? []).map((t, i) => (
                    <div key={i} className="bg-white border border-slate-200 shadow-sm rounded-lg px-4 py-3">
                      <p className="font-bold text-indigo-700">{i + 1}. {typeof t === "string" ? t : t.topic}</p>
                      {t.subtopics?.length > 0 && <p className="text-xs font-medium text-slate-500 mt-1">{t.subtopics.join(" · ")}</p>}
                      {t.estimated_hours && <p className="text-xs font-bold text-slate-400 mt-0.5">~{t.estimated_hours}h</p>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass p-6 space-y-4">
                <h2 className="text-lg font-semibold">🗓️ Weekly Class Timetable (Mon–Fri)</h2>

                <div className="flex items-center gap-3">
                  <input
                    type="file" accept=".pdf,image/png,image/jpeg"
                    className="text-sm font-medium text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700 file:font-bold hover:file:bg-slate-200 cursor-pointer"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setTimetableFile(f);
                      setTimetableParsing(true);
                      try {
                        const res = await api.scanNotes(f);
                        const text = res.text || res.extracted_text || "";
                        setTimetableRaw(text);
                      } catch { /* ignore */ }
                      finally { setTimetableParsing(false); }
                    }}
                  />
                  {timetableFile && <span className="text-xs font-bold text-green-600">📎 {timetableFile.name}</span>}
                  {timetableParsing && <span className="text-xs text-amber-500 animate-pulse">Extracting…</span>}
                </div>

                {timetableRaw || timetableFile ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Extracted Timetable Data</label>
                    <textarea
                      value={timetableRaw}
                      onChange={(e) => setTimetableRaw(e.target.value)}
                      placeholder="Raw timetable data..."
                      rows={4}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-sm"
                    />
                  </div>
                ) : null}

                <div className="space-y-3 pt-2 border-t border-slate-200/50 mt-4">
                  {WEEKDAYS.map((day) => (
                    <div key={day} className="flex items-start gap-3">
                      <span className="w-24 shrink-0 text-sm font-bold text-slate-600 pt-2.5">{day}</span>
                      <input
                        value={timetable[day]}
                        onChange={(e) => setTimetable((prev) => ({ ...prev, [day]: e.target.value }))}
                        placeholder="Enter class schedule"
                        className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass p-6 space-y-4">
                <h2 className="text-lg font-semibold">📆 Academic Calendar</h2>
                <div className="flex items-center gap-3">
                  <input
                    type="file" accept=".pdf,image/png,image/jpeg"
                    className="text-sm font-medium text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700 file:font-bold hover:file:bg-slate-200 cursor-pointer"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setCalendarFile(f);
                      setCalendarParsing(true);
                      try {
                        const res = await api.scanNotes(f);
                        const text = res.text || res.extracted_text || "";
                        setCalendarHolidays(text);
                      } catch { /* ignore */ }
                      finally { setCalendarParsing(false); }
                    }}
                  />
                  {calendarFile && <span className="text-xs font-bold text-green-600">📎 {calendarFile.name}</span>}
                  {calendarParsing && <span className="text-xs text-amber-500 animate-pulse">Extracting…</span>}
                </div>
                <textarea
                  value={calendarHolidays}
                  onChange={(e) => setCalendarHolidays(e.target.value)}
                  placeholder="Holidays & Key Dates (Extracts automatically from upload)"
                  rows={3}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="glass p-6 space-y-4">
                <h2 className="text-lg font-semibold">⚙️ Constraints</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Hours / Day" type="number" min={0.5} max={16} step={0.5}
                    value={legacyConstraints.available_hours_per_day} onChange={updateLegacy("available_hours_per_day")} />
                  <Input label="Weak Subjects" value={legacyConstraints.weak_subjects} onChange={updateLegacy("weak_subjects")} placeholder="Enter weak subjects" />
                  <Input label="Language" value={legacyConstraints.language_preference} onChange={updateLegacy("language_preference")} />
                  <Input label="Exam Date" type="date" value={legacyConstraints.exam_date} onChange={updateLegacy("exam_date")} />
                  <label className="flex items-center gap-2 text-sm text-slate-300 self-end pb-1">
                    <input type="checkbox" checked={legacyConstraints.fragmented_schedule} onChange={updateLegacy("fragmented_schedule")}
                      className="rounded bg-slate-700 border-slate-600" />
                    Fragmented Schedule
                  </label>
                </div>
                <Input label="Additional Notes" value={legacyConstraints.additional_notes} onChange={updateLegacy("additional_notes")}
                  placeholder="Enter additional constraints" />
                {legacyGenError && <p className="text-red-400 text-sm">{legacyGenError}</p>}
                <button onClick={handleLegacyGenerate} disabled={legacyGenerating}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors">
                  {legacyGenerating ? "⏳ Generating Campaign…" : "🚀 Generate Study Campaign"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Input component ── */
function Input({ label, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <input {...props}
        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-shadow" />
    </div>
  );
}
