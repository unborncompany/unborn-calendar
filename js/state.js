/* ============ state.js — Constants & Persistence ============ */

/* ============ Game of Life — Daily Planner ============
   Simple local task/calendar organizer.
   Data is stored in localStorage — everything stays on this machine.
   Cloud sync via Firebase (optional) — sign in to sync across devices.
   =================================================== */

const STORAGE_KEY = "ledger.entries.v1";
const USER_PROFILE_KEY = "ledger.userProfile.v1";
const LANG_KEY = "ledger.lang.v1";
const THEME_KEY = "ledger.theme.v1";
const CAL_VIEW_KEY = "ledger.calView.v1";
const ADMIN_USER_KEY = "ledger.adminUser.v1";
const ADMIN_PASS_KEY = "ledger.adminPass.v1";
const STORE_SPENT_KEY = "ledger.storeSpent.v1";
const REDEEMED_KEY = "ledger.redeemed.v1";
const EDIT_PENALTY_KEY = "ledger.editPenalties.v1";
const DELETE_PENALTY_KEY = "ledger.deletePenalties.v1";
const LIFE_STATS_KEY = "ledger.lifeStats.v1";

/* ---------- Caps ---------- */
const MAX_ENTRIES_PER_DAY = 15;
const MAX_SEC_TASKS = 15;
const MAX_DAILY_POINTS = 120;
const COOLDOWN_MINUTES = 10;

/* ---------- State ---------- */
let entries = loadEntries();
let currentCalDate = new Date();
currentCalDate.setDate(1);
let editingTodoRows = [];
let firedAlarms = {};  // { entryId_alarmIdx: true }
let userProfile = loadUserProfile();
let lang = localStorage.getItem(LANG_KEY) || "en";
let theme = localStorage.getItem(THEME_KEY) || "dark";
let calView = localStorage.getItem(CAL_VIEW_KEY) || "grid";
let storeSpent = parseInt(localStorage.getItem(STORE_SPENT_KEY) || "0", 10);
let adminUser = localStorage.getItem(ADMIN_USER_KEY) || "admin";
let adminPass = localStorage.getItem(ADMIN_PASS_KEY) || "admin123";
let currentRedeemItem = null;
let activeStoreFilter = "all";
let activeLifeFilter = "all";

/* ---------- Life Stats ---------- */
function loadLifeStats() {
  try {
    const raw = localStorage.getItem(LIFE_STATS_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      return {
        health: data.health ?? 95,
        energy: data.energy ?? 80,
        hunger: data.hunger ?? 50,
        thirst: data.thirst ?? 70,
        level: data.level ?? 1,
        lastDecayAt: data.lastDecayAt || new Date().toISOString(),
        lowSince: data.lowSince || null,
      };
    }
  } catch (e) {}
  return { health: 95, energy: 80, hunger: 50, thirst: 70, level: 1, lastDecayAt: new Date().toISOString(), lowSince: null };
}

function saveLifeStats() {
  try { localStorage.setItem(LIFE_STATS_KEY, JSON.stringify(lifeStats)); } catch (e) {}
  scheduleCloudSave();
}

let lifeStats = loadLifeStats();

function loadEditPenalties() {
  try {
    const raw = localStorage.getItem(EDIT_PENALTY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}
function saveEditPenalties() {
  try { localStorage.setItem(EDIT_PENALTY_KEY, JSON.stringify(editPenalties)); } catch (e) {}
  scheduleCloudSave();
}
let editPenalties = loadEditPenalties();

function loadDeletePenalties() {
  try {
    const raw = localStorage.getItem(DELETE_PENALTY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}
function saveDeletePenalties() {
  try { localStorage.setItem(DELETE_PENALTY_KEY, JSON.stringify(deletePenalties)); } catch (e) {}
  scheduleCloudSave();
}
let deletePenalties = loadDeletePenalties();

function loadRedeemed() {
  try {
    const raw = localStorage.getItem(REDEEMED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}
function saveRedeemed() {
  try { localStorage.setItem(REDEEMED_KEY, JSON.stringify(redeemed)); } catch (e) {}
  scheduleCloudSave();
}
let redeemed = loadRedeemed();

/* ---------- Persistence ---------- */
function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Could not read saved entries:", e);
    return [];
  }
}

/* ---------- Cloud sync helper (debounced) ---------- */
let _cloudSaveTimer = null;
function scheduleCloudSave() {
  if (!firebaseReady || !currentUser) return;
  clearTimeout(_cloudSaveTimer);
  _cloudSaveTimer = setTimeout(() => saveToCloud(), 600);
}

function saveEntries() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error("Could not save entries:", e);
    showToast(t("toast_cantSave"));
  }
  scheduleCloudSave();
}

function loadUserProfile() {
  try {
    const raw = localStorage.getItem(USER_PROFILE_KEY);
    return raw ? JSON.parse(raw) : { name: "", nickname: "", phone: "" };
  } catch (e) { return { name: "", nickname: "", phone: "" }; }
}

function saveUserProfile() {
  try { localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userProfile)); } catch (e) {}
  scheduleCloudSave();
}

/* ============ Dashboard — Secondary Tasks ============ */
const SEC_STORAGE_KEY = "ledger.secTasks.v1";
const SEC_DELETED_KEY = "ledger.secDeleted.v1";
let secTasks = loadSecTasks();
let deletedSecTasks = loadDeletedSecTasks();

function loadSecTasks() {
  try {
    const raw = localStorage.getItem(SEC_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

function saveSecTasks() {
  try { localStorage.setItem(SEC_STORAGE_KEY, JSON.stringify(secTasks)); } catch (e) {}
  scheduleCloudSave();
}

function loadDeletedSecTasks() {
  try {
    const raw = localStorage.getItem(SEC_DELETED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

function saveDeletedSecTasks() {
  try { localStorage.setItem(SEC_DELETED_KEY, JSON.stringify(deletedSecTasks)); } catch (e) {}
  scheduleCloudSave();
}

// Load fired alarms from localStorage so they don't re-fire
try {
  const saved = localStorage.getItem("ledger.firedAlarms.v1");
  if (saved) firedAlarms = JSON.parse(saved);
} catch (e) {}

function saveFiredAlarms() {
  try { localStorage.setItem("ledger.firedAlarms.v1", JSON.stringify(firedAlarms)); } catch (e) {}
  scheduleCloudSave();
}

/* ============ Settings — Notification Sound ============ */
const NOTIF_SOUND_KEY = "ledger.notifSound.v1";
let notifSoundData = null; // base64 data URI

function loadNotifSound() {
  try {
    notifSoundData = localStorage.getItem(NOTIF_SOUND_KEY) || null;
  } catch (e) {}
}

function saveNotifSound(dataUri) {
  try {
    notifSoundData = dataUri;
    localStorage.setItem(NOTIF_SOUND_KEY, dataUri);
  } catch (e) {
    showToast(t("toast_cantSaveSound"));
  }
  scheduleCloudSave();
}

function removeNotifSound() {
  notifSoundData = null;
  try { localStorage.removeItem(NOTIF_SOUND_KEY); } catch (e) {}
  updateSoundUI();
  scheduleCloudSave();
}
