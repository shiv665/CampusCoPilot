import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    university: "", major: "", semester: "", semester_start: "", semester_end: "", cgpa_target: "",
    target_companies: "", study_style: "balanced", daily_goal_hours: 4, language: "en"
  });
  const [setupMessage, setSetupMessage] = useState("");

  const steps = [
    { title: "Tell us about yourself", subtitle: "We'll personalize your study plans and recommendations" },
    { title: "Set your goals", subtitle: "This helps us tailor quizzes, flashcards, and focus sessions" },
    { title: "Study preferences", subtitle: "Fine-tune how CampusCoPilot works for you" },
  ];

  const handleFinish = async () => {
    setSaving(true);
    setSetupMessage("Saving profile...");
    try {
      const payload = {
        ...profile,
        cgpa_target: profile.cgpa_target ? parseFloat(profile.cgpa_target) : undefined,
        daily_goal_hours: parseInt(profile.daily_goal_hours) || 4,
        target_companies: profile.target_companies.split(",").map(s => s.trim()).filter(Boolean),
      };
      await api.updateProfile(payload);

      // Auto-fetch syllabus and generate initial campaign
      setSetupMessage("AI is fetching and analyzing your college syllabus...");
      try {
        await api.autoSetup({
          university: profile.university,
          branch: profile.major,
          semester: profile.semester,
          semester_start: profile.semester_start,
          semester_end: profile.semester_end,
          language_preference: profile.language,
          study_style: profile.study_style,
          available_hours_per_day: profile.daily_goal_hours
        });
      } catch (e) {
        console.warn("Auto-setup failed, continuing anyway", e);
      }

      navigate("/");
    } catch {
      navigate("/");
    } finally {
      setSaving(false);
      setSetupMessage("");
    }
  };

  const canNext = () => {
    if (step === 0) return profile.university.trim() || profile.major.trim();
    return true;
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="glass p-8 w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="text-4xl mb-2">🎓</div>
          <h1 className="text-2xl font-bold text-slate-800">Welcome to Campus<span className="text-indigo-600">CoPilot</span></h1>
          <p className="text-slate-500 text-sm mt-1">{steps[step].subtitle}</p>
        </div>

        {/* Progress */}
        <div className="flex gap-2">
          {steps.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-indigo-600" : "bg-slate-200"}`} />
          ))}
        </div>

        <h2 className="text-lg font-semibold text-slate-800">{steps[step].title}</h2>

        {/* Step 1: About You */}
        {step === 0 && (
          <div className="space-y-4">
            <Input label="University" value={profile.university}
              onChange={e => setProfile({ ...profile, university: e.target.value })} placeholder="Enter university name" />
            <Input label="Major / Field of Study" value={profile.major}
              onChange={e => setProfile({ ...profile, major: e.target.value })} placeholder="Enter major/branch" />
            <Input label="Semester / Year" value={profile.semester}
              onChange={e => setProfile({ ...profile, semester: e.target.value })} placeholder="Enter semester number" />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Semester Start (Approx)" type="date" value={profile.semester_start}
                onChange={e => setProfile({ ...profile, semester_start: e.target.value })} />
              <Input label="Semester End (Approx)" type="date" value={profile.semester_end}
                onChange={e => setProfile({ ...profile, semester_end: e.target.value })} />
            </div>
          </div>
        )}

        {/* Step 2: Goals */}
        {step === 1 && (
          <div className="space-y-4">
            <Input label="CGPA Target" type="number" step="0.1" min="0" max="10" value={profile.cgpa_target}
              onChange={e => setProfile({ ...profile, cgpa_target: e.target.value })} placeholder="Enter target CGPA" />
            <Input label="Target Companies (comma-separated)" value={profile.target_companies}
              onChange={e => setProfile({ ...profile, target_companies: e.target.value })} placeholder="Enter target companies" />
            <Input label="Daily Study Goal (hours)" type="number" min={1} max={16} value={profile.daily_goal_hours}
              onChange={e => setProfile({ ...profile, daily_goal_hours: e.target.value })} />
          </div>
        )}

        {/* Step 3: Preferences */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Study Style</label>
              <select value={profile.study_style} onChange={e => setProfile({ ...profile, study_style: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="intensive">Intensive (long sessions)</option>
                <option value="balanced">Balanced (mixed)</option>
                <option value="pomodoro">Pomodoro (short bursts)</option>
                <option value="spaced">Spaced Repetition</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Preferred Language</label>
              <select value={profile.language} onChange={e => setProfile({ ...profile, language: e.target.value })}
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
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 justify-between pt-2">
          {step > 0 ? (
            <button onClick={() => setStep(step - 1)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium shadow-sm transition-colors">
              ← Back
            </button>
          ) : (
            <button onClick={() => navigate("/")}
              className="px-5 py-2.5 text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors">
              Skip for now
            </button>
          )}

          {step < steps.length - 1 ? (
            <button onClick={() => setStep(step + 1)} disabled={!canNext()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
              Next →
            </button>
          ) : (
            <button onClick={handleFinish} disabled={saving}
              className="px-5 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center gap-2">
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  {setupMessage}
                </>
              ) : "🚀 Get Started"}
            </button>
          )}
        </div>
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
