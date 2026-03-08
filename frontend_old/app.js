/**
 * CampusCoPilot – Frontend Application Logic (Redesigned)
 * Handles navigation, PDF upload, campaign generation, scheduling, API activity.
 */

const API = ""; // same origin

// ══════════════════════════════════════════════════════════════════
//  DOM REFERENCES
// ══════════════════════════════════════════════════════════════════
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// Navigation
const sidebar     = $("#sidebar");
const sidebarOverlay = $("#sidebarOverlay");
const hamburger   = $("#hamburger");
const navLinks    = $$(".nav-link");

// Upload
const fileInput   = $("#fileInput");
const dropZone    = $("#dropZone");
const fileName    = $("#fileName");
const uploadBtn   = $("#uploadBtn");
const uploadLoader = $("#uploadLoader");
const uploadError  = $("#uploadError");
const uploadResponse = $("#uploadResponse");

// Topics
const topicsCard  = $("#topicsCard");
const topicsList  = $("#topicsList");
const topicCountBadge = $("#topicCountBadge");
const generateBtn = $("#generateBtn");
const campaignLoader = $("#campaignLoader");
const campaignError  = $("#campaignError");
const campaignResponse = $("#campaignResponse");

// Campaign
const campaignEmptyCard = $("#campaignEmptyCard");
const campaignContent   = $("#campaignContent");
const campaignView      = $("#campaignView");
const disruptBtn  = $("#disruptBtn");
const disruptModal = $("#disruptModal");
const cancelDisrupt = $("#cancelDisrupt");
const submitDisrupt = $("#submitDisrupt");
const disruptLoader = $("#disruptLoader");
const disruptError  = $("#disruptError");

// Scheduler
const eventList        = $("#eventList");
const addEventBtn      = $("#addEventBtn");
const loadSampleBtn    = $("#loadSampleBtn");
const generateScheduleBtn = $("#generateScheduleBtn");
const scheduleLoader   = $("#scheduleLoader");
const scheduleError    = $("#scheduleError");
const scheduleResponse = $("#scheduleResponse");
const scheduleOutputCard = $("#scheduleOutputCard");
const scheduleStats    = $("#scheduleStats");
const scheduleWarnings = $("#scheduleWarnings");
const scheduleView     = $("#scheduleView");

// Activity
const activityLog     = $("#activityLog");
const dashActivityFeed = $("#dashActivityFeed");
const clearActivityBtn = $("#clearActivityBtn");

// Stats
const statTopics  = $("#statTopics");
const statWeeks   = $("#statWeeks");
const statEvents  = $("#statEvents");
const statTokens  = $("#statTokens");

// Token displays
const tokenCount   = $("#tokenCount");
const tokenCountSm = $("#tokenCountSm");

// Server status
const serverDot    = $("#serverDot");
const serverStatus = $("#serverStatus");

// Toast
const toastContainer = $("#toastContainer");

// State
let currentCampaign = null;
let currentTopics   = null;
let eventCounter    = 0;
const activityItems = [];

// ══════════════════════════════════════════════════════════════════
//  UTILITIES
// ══════════════════════════════════════════════════════════════════
function show(el)   { el.classList.remove("hidden"); }
function hide(el)   { el.classList.add("hidden"); }
function showLoader(el) { el.classList.add("active"); }
function hideLoader(el) { el.classList.remove("active"); }

function esc(str) {
  if (typeof str !== "string") return String(str ?? "");
  const el = document.createElement("span");
  el.textContent = str;
  return el.innerHTML;
}

function toast(message, type = "info") {
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = message;
  toastContainer.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

function updateTokens(usage) {
  if (usage && typeof usage.total === "number") {
    const val = usage.total.toLocaleString();
    tokenCount.textContent = val;
    tokenCountSm.textContent = val;
    statTokens.textContent = val;
  }
}

function timestamp() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ══════════════════════════════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════════════════════════════
function navigateTo(pageName) {
  // Update nav links
  navLinks.forEach((link) => {
    link.classList.toggle("active", link.dataset.page === pageName);
  });
  // Update pages
  $$(".page").forEach((page) => {
    page.classList.toggle("active", page.id === `page-${pageName}`);
  });
  // Close mobile sidebar
  sidebar.classList.remove("open");
  sidebarOverlay.classList.remove("visible");
  // Scroll to top
  window.scrollTo({ top: 0, behavior: "smooth" });
}

navLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    navigateTo(link.dataset.page);
  });
});

// data-goto buttons (quick actions, empty states)
document.addEventListener("click", (e) => {
  const gotoBtn = e.target.closest("[data-goto]");
  if (gotoBtn) {
    e.preventDefault();
    navigateTo(gotoBtn.dataset.goto);
  }
});

// Mobile hamburger
hamburger.addEventListener("click", () => {
  sidebar.classList.toggle("open");
  sidebarOverlay.classList.toggle("visible");
});
sidebarOverlay.addEventListener("click", () => {
  sidebar.classList.remove("open");
  sidebarOverlay.classList.remove("visible");
});

// ══════════════════════════════════════════════════════════════════
//  ACTIVITY LOG
// ══════════════════════════════════════════════════════════════════
function addActivity(title, status, detail) {
  const item = { title, status, detail, time: timestamp() };
  activityItems.unshift(item);
  renderActivityLog();
  renderDashActivity();
}

function renderActivityLog() {
  if (activityItems.length === 0) {
    activityLog.innerHTML = `<div class="activity-empty">No API calls yet.</div>`;
    return;
  }
  activityLog.innerHTML = activityItems
    .map(
      (a) => `
    <div class="activity-item">
      <span class="activity-dot ${a.status}"></span>
      <div class="activity-body">
        <div class="activity-title">${esc(a.title)}</div>
        <div class="activity-meta">${esc(a.time)}</div>
        ${a.detail ? `<div class="activity-response">${esc(a.detail)}</div>` : ""}
      </div>
    </div>`
    )
    .join("");
}

function renderDashActivity() {
  const recent = activityItems.slice(0, 5);
  if (recent.length === 0) {
    dashActivityFeed.innerHTML = `<div class="activity-empty">No activity yet. Upload a syllabus to get started!</div>`;
    return;
  }
  dashActivityFeed.innerHTML = recent
    .map(
      (a) => `
    <div class="activity-item">
      <span class="activity-dot ${a.status}"></span>
      <div class="activity-body">
        <div class="activity-title">${esc(a.title)}</div>
        <div class="activity-meta">${esc(a.time)}</div>
      </div>
    </div>`
    )
    .join("");
}

clearActivityBtn.addEventListener("click", () => {
  activityItems.length = 0;
  renderActivityLog();
  renderDashActivity();
  toast("Activity log cleared", "info");
});

// ══════════════════════════════════════════════════════════════════
//  SERVER HEALTH CHECK
// ══════════════════════════════════════════════════════════════════
async function checkHealth() {
  try {
    const res = await fetch(`${API}/health`);
    if (res.ok) {
      const data = await res.json();
      serverDot.className = "status-dot online";
      serverStatus.textContent = "Server Online";
      updateTokens(data.token_usage);
      return true;
    }
  } catch (e) { /* offline */ }
  serverDot.className = "status-dot offline";
  serverStatus.textContent = "Server Offline";
  return false;
}

// Check health on load & poll every 30s
checkHealth();
setInterval(checkHealth, 30000);

// Normalize campaign: deeply unwrap stringified JSON and find the actual campaign object
function normalizeCampaign(c) {
  // Unwrap up to 5 levels of string-encoded JSON
  for (let i = 0; i < 5 && typeof c === "string"; i++) {
    try { c = JSON.parse(c); } catch(e) { break; }
  }
  if (typeof c !== "object" || c === null) return c;
  // If the campaign is wrapped in an outer key, dig it out
  if (!c.weekly_plans) {
    for (const key of ["campaign", "study_campaign", "plan", "data"]) {
      if (c[key] && typeof c[key] === "object" && c[key].weekly_plans) {
        c = c[key];
        break;
      }
    }
  }
  // Still wrapped? Try any value that has weekly_plans
  if (!c.weekly_plans) {
    for (const v of Object.values(c)) {
      if (v && typeof v === "object" && v.weekly_plans) {
        c = v;
        break;
      }
    }
  }
  return c;
}

// Also try to restore state
async function restoreState() {
  try {
    const res = await fetch(`${API}/api/state`);
    if (!res.ok) return;
    const data = await res.json();
    updateTokens(data.token_usage);

    if (data.topics && data.topics.length) {
      currentTopics = data.topics;
      statTopics.textContent = data.topics.length;
      renderTopics(data.topics);
      show(topicsCard);
    }
    if (data.campaign) {
      const camp = normalizeCampaign(data.campaign);
      currentCampaign = camp;
      renderCampaign(camp);
      hide(campaignEmptyCard);
      show(campaignContent);
      disruptBtn.style.display = "";
      if (camp.total_weeks) statWeeks.textContent = camp.total_weeks;
    }
    if (data.has_schedule && data.schedule) {
      renderScheduleOutput(data.schedule);
      show(scheduleOutputCard);
      if (data.schedule.total_events) statEvents.textContent = data.schedule.total_events;
    }
  } catch (e) { /* ignore */ }
}
restoreState();

// ══════════════════════════════════════════════════════════════════
//  DRAG & DROP
// ══════════════════════════════════════════════════════════════════
dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("dragover", (e) => { e.preventDefault(); dropZone.classList.add("dragover"); });
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  if (e.dataTransfer.files.length) {
    fileInput.files = e.dataTransfer.files;
    onFileSelected();
  }
});
fileInput.addEventListener("change", onFileSelected);

function onFileSelected() {
  const file = fileInput.files[0];
  if (file) {
    fileName.textContent = file.name;
    uploadBtn.disabled = false;
  }
}

// ══════════════════════════════════════════════════════════════════
//  STEP 1: UPLOAD SYLLABUS
// ══════════════════════════════════════════════════════════════════
uploadBtn.addEventListener("click", async () => {
  const file = fileInput.files[0];
  if (!file) return;
  uploadError.textContent = "";
  hide(uploadResponse);
  showLoader(uploadLoader);
  uploadBtn.disabled = true;

  addActivity(`Uploading: ${file.name}`, "pending", null);
  toast("Uploading syllabus...", "info");

  const form = new FormData();
  form.append("file", file);

  try {
    const res = await fetch(`${API}/api/upload-syllabus`, { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Upload failed");

    currentTopics = data.topics;
    renderTopics(data.topics);
    show(topicsCard);
    updateTokens(data.token_usage);
    statTopics.textContent = data.topics.length;

    // Show response summary
    const summary = `${data.topics.length} topics extracted from ${data.total_pages} pages`;
    uploadResponse.textContent = summary;
    uploadResponse.className = "response-box success";
    show(uploadResponse);

    addActivity(`Upload Success: ${file.name}`, "success", summary);
    toast(`${data.topics.length} topics extracted!`, "success");

    // Scroll to topics
    topicsCard.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    uploadError.textContent = err.message;
    uploadResponse.textContent = `Error: ${err.message}`;
    uploadResponse.className = "response-box error";
    show(uploadResponse);
    addActivity(`Upload Failed: ${file.name}`, "error", err.message);
    toast(`Upload failed: ${err.message}`, "error");
  } finally {
    hideLoader(uploadLoader);
    uploadBtn.disabled = false;
  }
});

function renderTopics(topics) {
  topicCountBadge.textContent = `${topics.length} topics`;
  topicsList.innerHTML = topics
    .map(
      (t) => `
    <div class="topic-chip">
      <strong>${esc(t.topic)}</strong>
      ${t.subtopics?.length ? `<div class="subs">${t.subtopics.map(esc).join(", ")}</div>` : ""}
      ${t.estimated_hours ? `<span class="hours-tag">~${t.estimated_hours} hrs</span>` : ""}
    </div>`
    )
    .join("");
}

// ══════════════════════════════════════════════════════════════════
//  STEP 2: GENERATE CAMPAIGN
// ══════════════════════════════════════════════════════════════════
generateBtn.addEventListener("click", async () => {
  campaignError.textContent = "";
  hide(campaignResponse);
  showLoader(campaignLoader);
  generateBtn.disabled = true;

  addActivity("Generating study campaign...", "pending", null);
  toast("Generating campaign — this may take a moment...", "info");

  const constraints = {
    name: $("#studentName").value || "Student",
    available_hours_per_day: parseFloat($("#hoursPerDay").value) || 4,
    weak_subjects: $("#weakSubjects").value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    language_preference: $("#language").value || "English",
    fragmented_schedule: $("#fragmented").checked,
    exam_date: $("#examDate").value || null,
    additional_notes: $("#additionalNotes").value || null,
  };

  try {
    const res = await fetch(`${API}/api/generate-campaign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(constraints),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Campaign generation failed");

    const camp = normalizeCampaign(data.campaign);
    currentCampaign = camp;
    renderCampaign(camp);
    hide(campaignEmptyCard);
    show(campaignContent);
    disruptBtn.style.display = "";
    updateTokens(data.token_usage);

    if (camp?.total_weeks) statWeeks.textContent = camp.total_weeks;

    const summary = `Campaign: ${camp?.total_weeks || "?"} weeks, ${camp?.hours_per_day || "?"} hrs/day`;
    campaignResponse.textContent = summary;
    campaignResponse.className = "response-box success";
    show(campaignResponse);

    addActivity("Campaign Generated", "success", summary);
    toast("Study campaign generated!", "success");

    // Navigate to campaign page
    navigateTo("campaign");
  } catch (err) {
    campaignError.textContent = err.message;
    campaignResponse.textContent = `Error: ${err.message}`;
    campaignResponse.className = "response-box error";
    show(campaignResponse);
    addActivity("Campaign Failed", "error", err.message);
    toast(`Campaign failed: ${err.message}`, "error");
  } finally {
    hideLoader(campaignLoader);
    generateBtn.disabled = false;
  }
});

function renderCampaign(campaign) {
  // Deeply unwrap stringified JSON and nested wrappers
  campaign = normalizeCampaign(campaign);
  if (!campaign || !campaign.weekly_plans || !Array.isArray(campaign.weekly_plans)) {
    campaignView.innerHTML = `<div class="card glass" style="padding:2rem;">
      <p style="color:var(--text-muted);margin:0;">Campaign data could not be rendered. The AI response may not match the expected format.</p>
      <details style="margin-top:1rem;"><summary style="cursor:pointer;color:var(--accent);">Show raw data</summary>
        <pre style="white-space:pre-wrap;color:var(--text-muted);margin-top:0.5rem;font-size:0.85rem;">${esc(typeof campaign === "string" ? campaign : JSON.stringify(campaign, null, 2))}</pre>
      </details></div>`;
    return;
  }

  let html = `<div class="campaign-summary">
    <span><strong>${esc(campaign.student_name || "Student")}</strong></span>
    <span>${campaign.total_weeks} weeks</span>
    <span>${campaign.hours_per_day} hrs/day</span>
  </div>`;

  for (const week of campaign.weekly_plans) {
    html += `<div class="week-block">`;
    html += `<div class="week-title">Week ${week.week_number} — ${esc(week.theme)}</div>`;
    for (const day of week.days) {
      html += `<div class="day-block">`;
      html += `<div class="day-label">${esc(day.day)}${day.focus_topic ? ` · ${esc(day.focus_topic)}` : ""}</div>`;
      for (const task of day.tasks) {
        const reschedClass = task.rescheduled ? " rescheduled" : "";
        html += `<div class="task-row ${esc(task.priority || "medium")}${reschedClass}">
          <span class="time">${esc(task.time_slot)}</span>
          <span class="desc">${esc(task.task)}${task.resource_hint ? ` <span class="hint-tag">[${esc(task.resource_hint)}]</span>` : ""}</span>
        </div>`;
      }
      html += `</div>`;
    }
    html += `</div>`;
  }

  campaignView.innerHTML = html;
}

// ══════════════════════════════════════════════════════════════════
//  DISRUPTION MODAL
// ══════════════════════════════════════════════════════════════════
disruptBtn.addEventListener("click", () => show(disruptModal));
cancelDisrupt.addEventListener("click", () => hide(disruptModal));

submitDisrupt.addEventListener("click", async () => {
  disruptError.textContent = "";
  showLoader(disruptLoader);
  submitDisrupt.disabled = true;

  addActivity("Replanning after disruption...", "pending", null);
  toast("Replanning campaign...", "info");

  const disruption = {
    event_type: $("#disruptType").value,
    affected_day: $("#disruptDay").value,
    description: $("#disruptDesc").value || null,
  };

  try {
    const res = await fetch(`${API}/api/mock-disruption`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(disruption),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Replan failed");

    const camp = normalizeCampaign(data.campaign);
    currentCampaign = camp;
    renderCampaign(camp);
    updateTokens(data.token_usage);
    hide(disruptModal);

    addActivity("Replan Complete", "success", `Disruption: ${disruption.event_type}`);
    toast("Campaign replanned!", "success");
  } catch (err) {
    disruptError.textContent = err.message;
    addActivity("Replan Failed", "error", err.message);
    toast(`Replan failed: ${err.message}`, "error");
  } finally {
    hideLoader(disruptLoader);
    submitDisrupt.disabled = false;
  }
});

// ══════════════════════════════════════════════════════════════════
//  PERSONA PRESETS
// ══════════════════════════════════════════════════════════════════
const PERSONAS = {
  abishek: {
    name: "Abishek",
    available_hours_per_day: 3,
    weak_subjects: ["English", "Statistics"],
    language_preference: "Hindi",
    fragmented_schedule: true,
    additional_notes:
      "Struggling with English comprehension. Schedule is fragmented due to part-time work. Needs simplified language and extra time on fundamentals.",
  },
  priya: {
    name: "Priya",
    available_hours_per_day: 6,
    weak_subjects: [],
    language_preference: "English",
    fragmented_schedule: false,
    additional_notes: "Top student preparing for finals. Looking for advanced problem sets.",
  },
};

$$(".persona-card").forEach((card) => {
  card.addEventListener("click", () => {
    const key = card.dataset.persona;
    const p = PERSONAS[key];
    if (!p) return;
    $("#studentName").value = p.name;
    $("#hoursPerDay").value = p.available_hours_per_day;
    $("#weakSubjects").value = (p.weak_subjects || []).join(", ");
    $("#language").value = p.language_preference;
    $("#fragmented").checked = p.fragmented_schedule;
    $("#additionalNotes").value = p.additional_notes || "";
    toast(`Loaded preset: ${p.name}`, "info");
  });
});

// ══════════════════════════════════════════════════════════════════
//  EVENT SCHEDULER
// ══════════════════════════════════════════════════════════════════
function addEventRow(data = {}) {
  eventCounter++;
  const id = eventCounter;
  const type = data.event_type || "dynamic";
  const hideFixed = type === "dynamic" ? "hide-fixed" : "";

  const row = document.createElement("div");
  row.className = "event-row";
  row.dataset.id = id;
  row.innerHTML = `
    <label>Event Name
      <input type="text" class="ev-name" value="${esc(data.event_name || "")}" placeholder="e.g. Math HW" />
    </label>
    <label>Difficulty
      <select class="ev-diff">
        <option value="easy"${data.difficulty === "easy" ? " selected" : ""}>Easy</option>
        <option value="medium"${data.difficulty === "medium" || !data.difficulty ? " selected" : ""}>Medium</option>
        <option value="hard"${data.difficulty === "hard" ? " selected" : ""}>Hard</option>
      </select>
    </label>
    <label>Hours needed
      <input type="number" class="ev-hours" value="${data.time_required_hours ?? 1}" min="0.25" step="0.25" />
    </label>
    <label>Deadline
      <input type="date" class="ev-deadline" value="${data.deadline || ""}" />
    </label>
    <label>Type
      <select class="ev-type">
        <option value="fixed"${type === "fixed" ? " selected" : ""}>Fixed</option>
        <option value="dynamic"${type === "dynamic" ? " selected" : ""}>Dynamic</option>
      </select>
    </label>
    <div class="fixed-fields ${hideFixed}">
      <label>Date
        <input type="date" class="ev-fixed-date" value="${data.fixed_date || ""}" />
      </label>
    </div>
    <button class="remove-event-btn" title="Remove event">&#10005;</button>
  `;

  const typeSelect = row.querySelector(".ev-type");
  const fixedFields = row.querySelector(".fixed-fields");
  typeSelect.addEventListener("change", () => {
    fixedFields.classList.toggle("hide-fixed", typeSelect.value !== "fixed");
  });

  row.querySelector(".remove-event-btn").addEventListener("click", () => row.remove());
  eventList.appendChild(row);
}

addEventBtn.addEventListener("click", () => addEventRow());

// ── Sample events ───────────────────────────────────────────────
const SAMPLE_EVENTS = [
  { event_name: "Physics Lab", difficulty: "hard", time_required_hours: 3, deadline: "2026-03-12", event_type: "fixed", fixed_date: "2026-03-10" },
  { event_name: "Calculus Assignment", difficulty: "hard", time_required_hours: 4, deadline: "2026-03-14", event_type: "dynamic" },
  { event_name: "English Essay Draft", difficulty: "medium", time_required_hours: 2.5, deadline: "2026-03-11", event_type: "dynamic" },
  { event_name: "Weekly Team Meeting", difficulty: "easy", time_required_hours: 1, deadline: "2026-03-09", event_type: "fixed", fixed_date: "2026-03-09" },
  { event_name: "History Reading Ch.5-7", difficulty: "medium", time_required_hours: 2, deadline: "2026-03-13", event_type: "dynamic" },
  { event_name: "CS Programming Project", difficulty: "hard", time_required_hours: 6, deadline: "2026-03-15", event_type: "dynamic" },
];

loadSampleBtn.addEventListener("click", () => {
  eventList.innerHTML = "";
  SAMPLE_EVENTS.forEach((ev) => addEventRow(ev));
  toast("Sample events loaded", "info");
});

function collectEvents() {
  const rows = eventList.querySelectorAll(".event-row");
  const events = [];
  rows.forEach((row) => {
    const type = row.querySelector(".ev-type").value;
    const ev = {
      event_name: row.querySelector(".ev-name").value.trim(),
      difficulty: row.querySelector(".ev-diff").value,
      time_required_hours: parseFloat(row.querySelector(".ev-hours").value) || 1,
      deadline: row.querySelector(".ev-deadline").value,
      event_type: type,
    };
    if (type === "fixed") {
      ev.fixed_date = row.querySelector(".ev-fixed-date").value || null;
      ev.fixed_start_time = null;
    }
    if (ev.event_name && ev.deadline) events.push(ev);
  });
  return events;
}

// ── Generate Schedule ───────────────────────────────────────────
generateScheduleBtn.addEventListener("click", async () => {
  const events = collectEvents();
  if (events.length === 0) {
    scheduleError.textContent = "Add at least one event with a name and deadline.";
    return;
  }
  scheduleError.textContent = "";
  hide(scheduleResponse);
  showLoader(scheduleLoader);
  generateScheduleBtn.disabled = true;

  addActivity("Generating schedule...", "pending", null);
  toast("Generating optimised schedule...", "info");

  const payload = {
    events,
    available_hours_per_day: parseFloat($("#schedHoursPerDay").value) || 8,
    day_start_time: $("#schedDayStart").value || "08:00",
    day_end_time: $("#schedDayEnd").value || "22:00",
    preferred_break_minutes: parseInt($("#schedBreak").value) || 15,
  };

  try {
    const res = await fetch(`${API}/api/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Schedule generation failed");

    renderScheduleOutput(data.schedule);
    show(scheduleOutputCard);
    updateTokens(data.token_usage);

    if (data.schedule?.total_events) statEvents.textContent = data.schedule.total_events;

    const summary = `Schedule: ${data.schedule?.total_events || events.length} events optimised`;
    scheduleResponse.textContent = summary;
    scheduleResponse.className = "response-box success";
    show(scheduleResponse);

    addActivity("Schedule Generated", "success", summary);
    toast("Schedule ready!", "success");

    scheduleOutputCard.scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    scheduleError.textContent = err.message;
    scheduleResponse.textContent = `Error: ${err.message}`;
    scheduleResponse.className = "response-box error";
    show(scheduleResponse);
    addActivity("Schedule Failed", "error", err.message);
    toast(`Schedule failed: ${err.message}`, "error");
  } finally {
    hideLoader(scheduleLoader);
    generateScheduleBtn.disabled = false;
  }
});

function renderScheduleOutput(sched) {
  if (!sched || !sched.schedule) {
    scheduleView.innerHTML = `<pre style="white-space:pre-wrap;color:var(--text-muted)">${JSON.stringify(sched, null, 2)}</pre>`;
    return;
  }

  scheduleStats.innerHTML = `
    <span>Total events: <span class="stat-val">${sched.total_events ?? "?"}</span></span>
    <span>Fixed: <span class="stat-val">${sched.fixed_events ?? "?"}</span></span>
    <span>Dynamic: <span class="stat-val">${sched.dynamic_events ?? "?"}</span></span>
  `;

  const warns = sched.warnings || [];
  scheduleWarnings.innerHTML = warns.length
    ? `<div class="schedule-warnings">${warns.map((w) => `<div class="warn">&#9888; ${esc(w)}</div>`).join("")}</div>`
    : "";

  let html = "";
  for (const day of sched.schedule) {
    html += `<div class="sched-day">`;
    html += `<div class="sched-day-header">${esc(day.day_name)} — ${esc(day.date)}`;
    if (day.free_hours != null) html += `<span class="free-tag">${day.free_hours}h free</span>`;
    html += `</div>`;

    if (!day.slots || day.slots.length === 0) {
      html += `<div style="font-size:.82rem;color:var(--text-muted);padding:.3rem .7rem">No events</div>`;
    } else {
      for (const slot of day.slots) {
        const diff = esc(slot.difficulty || "medium");
        const fixed = slot.is_fixed ? " is-fixed" : "";
        html += `<div class="sched-slot ${diff}${fixed}">
          <span class="stime">${esc(slot.start_time)} – ${esc(slot.end_time)}</span>
          <span class="sname">${esc(slot.event_name)}${slot.is_fixed ? ' <span class="stag">[FIXED]</span>' : ""}${slot.notes ? ` <span class="stag">${esc(slot.notes)}</span>` : ""}</span>
        </div>`;
      }
    }
    html += `</div>`;
  }

  scheduleView.innerHTML = html;
}

// Start with one blank event row
addEventRow();
