/**
 * API client – handles auth token and base URL.
 */
export const API_BASE = "https://campuscopilot-chhagnbhf9gpaqfm.southeastasia-01.azurewebsites.net";
function getToken() {
  return localStorage.getItem("token");
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    ...(options.headers || {}) 
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
    throw new Error("Session expired.");
  }

  let data;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    data = await res.json();
  } else {
    const text = await res.text();
    if (!res.ok) throw new Error(text || `Server error (${res.status})`);
    try { data = JSON.parse(text); } catch { throw new Error(text || `Unexpected response (${res.status})`); }
  }
  if (!res.ok) {
    let msg = data.detail || "Request failed";
    if (typeof msg !== "string") {
      try {
        msg = msg.map(m => m.msg || JSON.stringify(m)).join(", ");
      } catch {
        msg = JSON.stringify(msg);
      }
    }
    throw new Error(msg);
  }
  return data;
}

export const api = {
  // Auth
  register: (body) => request("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body) => request("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  me: () => request("/api/auth/me"),
  uploadAvatar: (file) => {
    const form = new FormData();
    form.append("file", file);
    return request("/api/auth/avatar", { method: "POST", body: form });
  },

  // Health
  health: () => request("/health"),

  // Sessions
  listSessions: () => request("/api/sessions"),
  getSession: (id) => request(`/api/sessions/${id}`),
  deleteSession: (id) => request(`/api/sessions/${id}`, { method: "DELETE" }),

  // Upload syllabus (returns session)
  uploadSyllabus: (file) => {
    const form = new FormData();
    form.append("file", file);
    return request("/api/upload-syllabus", { method: "POST", body: form });
  },

  // Generate campaign
  generateCampaign: (sessionId, constraints) =>
    request("/api/generate-campaign", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId, constraints }),
    }),

  // Mock disruption
  mockDisruption: (sessionId, disruption) =>
    request("/api/mock-disruption", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId, disruption }),
    }),

  // Schedule
  schedule: (sessionId, payload) =>
    request("/api/schedule", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId, payload }),
    }),

  // ── Retriever ──
  getResources: (topic, subtopics = [], language = "English") =>
    request("/api/resources", {
      method: "POST",
      body: JSON.stringify({ topic, subtopics, language }),
    }),
  getCampaignResources: (sessionId, language = "English", maxTopics = 10) =>
    request("/api/resources/campaign", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId, language, max_topics: maxTopics }),
    }),

  // ── Micro-Tutor & Study Tools ──
  scanNotes: (file) => {
    const form = new FormData();
    form.append("file", file);
    return request("/api/scan-notes", { method: "POST", body: form });
  },
  formatNotes: (text) =>
    request("/api/format-notes", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
  generateQuiz: (topic, difficulty = "medium", numQuestions = 5, language = "English") =>
    request("/api/quiz/generate", {
      method: "POST",
      body: JSON.stringify({ topic, difficulty, num_questions: numQuestions, language }),
    }),
  generateFlashcards: (topic, count = 10, language = "English") =>
    request("/api/flashcards/generate", {
      method: "POST",
      body: JSON.stringify({ topic, count, language }),
    }),
  saveQuizResult: (topic, score, total, answers = []) =>
    request("/api/quiz/result", {
      method: "POST",
      body: JSON.stringify({ topic, score, total, answers }),
    }),
  quizHistory: () => request("/api/quiz/history"),

  // ── Focus / Pomodoro ──
  generateFocusSession: (task, durationMinutes = 25, difficulty = "medium", language = "English") =>
    request("/api/focus-session", {
      method: "POST",
      body: JSON.stringify({ task, duration_minutes: durationMinutes, difficulty, language }),
    }),
  logPomodoro: (task, durationMinutes = 25, completed = true, startedAt = null) =>
    request("/api/pomodoro/log", {
      method: "POST",
      body: JSON.stringify({ task, duration_minutes: durationMinutes, completed, started_at: startedAt }),
    }),
  pomodoroCount: () => request("/api/pomodoro/count"),

  // ── Task Tracking ──
  completeTask: (task, topic = "", sessionId = "", durationMinutes = 0) =>
    request("/api/tasks/complete", {
      method: "POST",
      body: JSON.stringify({ task, topic, session_id: sessionId, duration_minutes: durationMinutes }),
    }),
  taskHistory: () => request("/api/tasks/history"),

  // ── Well-being ──
  wellbeingNudge: () => request("/api/wellbeing/nudge"),

  // ── Gamification ──
  gamification: () => request("/api/gamification"),

  // ── Profile ──
  getProfile: () => request("/api/profile"),
  updateProfile: (data) => request("/api/profile", { method: "PUT", body: JSON.stringify(data) }),
  autoSetup: (data) => request("/api/onboarding/auto-setup", { method: "POST", body: JSON.stringify(data) }),

  // ── Portfolio / Career ──
  getPortfolio: () => request("/api/portfolio"),
  addPortfolio: (entry) => request("/api/portfolio", { method: "POST", body: JSON.stringify(entry) }),
  deletePortfolio: (id) => request(`/api/portfolio/${id}`, { method: "DELETE" }),
  resumeBullets: () => request("/api/portfolio/resume-bullets", { method: "POST" }),

  // ── Study Squads ──
  createSquad: (name, topic = "", maxMembers = 5) =>
    request("/api/squads", {
      method: "POST",
      body: JSON.stringify({ name, topic, max_members: maxMembers }),
    }),
  listSquads: () => request("/api/squads"),
  joinSquad: (inviteCode) =>
    request("/api/squads/join", {
      method: "POST",
      body: JSON.stringify({ invite_code: inviteCode }),
    }),
  leaveSquad: (squadId) =>
    request(`/api/squads/${squadId}/leave`, { method: "POST" }),
  joinSquadById: (squadId) =>
    request(`/api/squads/${squadId}/join`, { method: "POST" }),
  getSquad: (squadId) =>
    request(`/api/squads/${squadId}`),
  getSquadMessages: (squadId) =>
    request(`/api/squads/${squadId}/messages`),
  sendSquadMessage: (squadId, text) =>
    request(`/api/squads/${squadId}/messages`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
  sendDm: (toUserId, text) =>
    request("/api/dm/send", {
      method: "POST",
      body: JSON.stringify({ to_user_id: toUserId, text }),
    }),
  getDmConversation: (otherUserId) =>
    request(`/api/dm/${otherUserId}`),
  getDmContacts: () => request("/api/dm/contacts"),

  // ── Semester Planner ──
  createSemesterPlan: (semesterInfo) =>
    request("/api/semester-plan", {
      method: "POST",
      body: JSON.stringify({ semester_info: semesterInfo }),
    }),
  listSemesterPlans: () => request("/api/semester-plans"),
  getSemesterPlan: (planId) => request(`/api/semester-plan/${planId}`),
  deleteSemesterPlan: (planId) =>
    request(`/api/semester-plan/${planId}`, { method: "DELETE" }),
  addSubject: (planId, subject) =>
    request(`/api/semester-plan/${planId}/add-subject`, {
      method: "POST",
      body: JSON.stringify(subject),
    }),
  uploadSubjectPdf: (planId, file, subjectName = "", credits = 0, weak = false, strength = "Okay", interest = "Okay") => {
    const form = new FormData();
    form.append("file", file);
    return request(
      `/api/semester-plan/${planId}/upload-subject?subject_name=${encodeURIComponent(subjectName)}&credits=${credits}&weak=${weak}&strength=${encodeURIComponent(strength)}&interest=${encodeURIComponent(interest)}`,
      { method: "POST", body: form }
    );
  },
  updateSubjects: (planId, subjects) =>
    request(`/api/semester-plan/${planId}/subjects`, {
      method: "PUT",
      body: JSON.stringify({ subjects }),
    }),
  generateSemesterCampaign: (planId, constraints = {}) =>
    request(`/api/semester-plan/${planId}/generate-campaign`, {
      method: "POST",
      body: JSON.stringify({ constraints }),
    }),
  searchStudyGroups: (university = "", branch = "") =>
    request("/api/study-groups/search", {
      method: "POST",
      body: JSON.stringify({ university, branch }),
    }),
  joinGlobalSquad: (university, branch) =>
    request("/api/squads/join-global", {
      method: "POST",
      body: JSON.stringify({ university, branch }),
    }),

  // ── Analytics ──
  analytics: () => request("/api/analytics"),
};
