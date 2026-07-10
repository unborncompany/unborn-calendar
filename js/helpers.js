/* ============ helpers.js — Theme, View, Utils ============ */

function applyTheme() {
  document.documentElement.setAttribute("data-theme", theme);
}

function applyCalView() {
  const grid = document.getElementById("calGrid");
  const list = document.getElementById("calList");
  const weekdays = document.querySelector(".cal-weekdays");
  if (calView === "list") {
    grid.style.display = "none";
    list.style.display = "flex";
    if (weekdays) weekdays.style.display = "none";
    renderCalList();
  } else {
    grid.style.display = "";
    list.style.display = "none";
    if (weekdays) weekdays.style.display = "";
    renderCalendar();
  }
}

/* ---------- Helpers ---------- */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function todoId() {
  return "t_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function pad(n) { return n.toString().padStart(2, "0"); }

function deadlineOf(entry) {
  if (entry.time) {
    return new Date(`${entry.date}T${entry.time}:00`);
  }
  return new Date(`${entry.date}T23:59:59`);
}

function getStatus(entry) {
  if (entry.completedAt) return "completed";
  const now = new Date();
  return now > deadlineOf(entry) ? "pending" : "active";
}

function formatDatePretty(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function formatTimePretty(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${ampm}`;
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => t.classList.remove("show"), 2200);
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ---------- Caps & Cooldown Helpers ---------- */
function countEntriesForDate(dateStr) {
  return entries.filter(e => e.date === dateStr).length;
}

function canAddEntryForDate(dateStr) {
  return countEntriesForDate(dateStr) < MAX_ENTRIES_PER_DAY;
}

function canAddSecTask() {
  return secTasks.length < MAX_SEC_TASKS;
}

function isCooldownActive(createdAt) {
  if (!createdAt) return false;
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now - created;
  return diffMs < COOLDOWN_MINUTES * 60 * 1000;
}

function getRemainingCooldown(createdAt) {
  if (!createdAt) return 0;
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now - created;
  const remaining = COOLDOWN_MINUTES * 60 * 1000 - diffMs;
  return remaining > 0 ? Math.ceil(remaining / 60000) : 0;
}

function isAntiCheatActive(createdAt, pointsAwardedAt) {
  if (!createdAt || !pointsAwardedAt) return false;
  const antiCheatWindow = (COOLDOWN_MINUTES + COOLDOWN_MINUTES) * 60 * 1000;
  const created = new Date(createdAt);
  const awarded = new Date(pointsAwardedAt);
  return (awarded - created) < antiCheatWindow;
}

function calcDayPoints(dateStr) {
  const dayEntries = entries.filter(e => e.date === dateStr);
  let pts = 0;
  for (const e of dayEntries) {
    pts += calcEntryPoints(e);
  }
  const daySecTasks = secTasks.filter(t => {
    if (t.done && t.doneAt) {
      const doneDate = t.doneAt.slice(0, 10);
      return doneDate === dateStr;
    }
    return t.targetDate === dateStr;
  });
  for (const task of daySecTasks) {
    pts += getSecTaskPoints(task);
  }
  const daySecDeleted = deletedSecTasks.filter(d => d.deletedAt && d.deletedAt.slice(0, 10) === dateStr);
  pts += daySecDeleted.length * -1;
  const dayEdits = editPenalties.filter(p => p.editedAt && p.editedAt.slice(0, 10) === dateStr);
  pts += dayEdits.length * -1;
  const dayDeletes = deletePenalties.filter(p => p.deletedAt && p.deletedAt.slice(0, 10) === dateStr);
  pts += dayDeletes.length * -2;
  return pts;
}

function calcTotalPointsCapped() {
  const allDates = new Set();
  entries.forEach(e => allDates.add(e.date));
  secTasks.forEach(t => { if (t.done && t.doneAt) allDates.add(t.doneAt.slice(0, 10)); else allDates.add(t.targetDate); });
  deletedSecTasks.forEach(d => { if (d.deletedAt) allDates.add(d.deletedAt.slice(0, 10)); });
  editPenalties.forEach(p => { if (p.editedAt) allDates.add(p.editedAt.slice(0, 10)); });
  deletePenalties.forEach(p => { if (p.deletedAt) allDates.add(p.deletedAt.slice(0, 10)); });
  let total = 0;
  for (const date of allDates) {
    const dayPts = calcDayPoints(date);
    total += Math.min(dayPts, MAX_DAILY_POINTS);
  }
  return total;
}
