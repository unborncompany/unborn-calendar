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
  // Migration: if completedAt is missing but all todos are done, stamp it now
  if (!entry.completedAt && entry.todos && entry.todos.length > 0 && entry.todos.every(t => t.done)) {
    entry.completedAt = new Date().toISOString();
    saveEntries();
  }
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
