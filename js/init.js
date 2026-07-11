/* ============ init.js — Bootstrap ============ */

function playNotifSound() {
  if (!notifSoundData) return;
  try {
    const audio = new Audio(notifSoundData);
    audio.play();
  } catch (e) {}
}

function updateSoundUI() {
  const nameEl = document.getElementById("notifSoundName");
  const removeBtn = document.getElementById("notifSoundRemove");
  if (notifSoundData) {
    nameEl.textContent = t("settings_notifSound");
    removeBtn.style.display = "inline-block";
  } else {
    nameEl.textContent = t("settings_noFile");
    removeBtn.style.display = "none";
  }
}

/* Decay rates per day */
const DECAY_RATES = { energy: 5, hunger: 8, thirst: 10 };
const HEALTH_DECAY_RATE = 5;
const HEALTH_THRESHOLD = 20;
const HEALTH_DECAY_DAYS = 3;
const POINTS_PER_LEVEL = 50;

function calcLevel() {
  const totalPts = calcTotalPoints();
  return Math.max(1, Math.floor(totalPts / POINTS_PER_LEVEL) + 1);
}

function processDecay() {
  const now = new Date();
  const lastDecay = new Date(lifeStats.lastDecayAt);
  const msDiff = now - lastDecay;
  const daysDiff = msDiff / (1000 * 60 * 60 * 24);

  if (daysDiff < 0.01) return; // less than ~15 minutes, skip

  // Decay Energy, Hunger, Thirst
  for (const stat of ["energy", "hunger", "thirst"]) {
    const decay = DECAY_RATES[stat] * daysDiff;
    lifeStats[stat] = Math.max(0, lifeStats[stat] - decay);
  }

  // Health decay: track cumulative time both hunger & thirst are below threshold
  if (lifeStats.hunger < HEALTH_THRESHOLD && lifeStats.thirst < HEALTH_THRESHOLD) {
    // Start the clock if not already running
    if (!lifeStats.lowSince) {
      lifeStats.lowSince = now.toISOString();
    }
    // Calculate cumulative days below threshold
    const lowSinceMs = new Date(lifeStats.lowSince).getTime();
    const totalLowDays = (now.getTime() - lowSinceMs) / (1000 * 60 * 60 * 24);
    const periods = Math.floor(totalLowDays / HEALTH_DECAY_DAYS);
    // Decay by one unit per period (each period = HEALTH_DECAY_RATE)
    lifeStats.health = Math.max(0, lifeStats.health - HEALTH_DECAY_RATE * periods);
  } else {
    // Reset the clock when either stat recovers
    lifeStats.lowSince = null;
  }

  // Update level
  lifeStats.level = calcLevel();

  lifeStats.lastDecayAt = now.toISOString();
  saveLifeStats();
}

function initNotifications() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function checkAlarms() {
  const now = new Date();
  entries.forEach(entry => {
    if (!entry.alarms || entry.alarms.length === 0) return;
    if (getStatus(entry) === "completed") return;

    const deadline = deadlineOf(entry);
    entry.alarms.forEach((alarm, idx) => {
      let alarmTime;
      if (alarm.minutes >= 0) {
        alarmTime = new Date(deadline.getTime() - alarm.minutes * 60000);
      } else {
        alarmTime = new Date(`${alarm.date}T${alarm.time}:00`);
      }

      const key = `${entry.id}_${idx}`;

      if (now >= alarmTime && !firedAlarms[key]) {
        firedAlarms[key] = true;

        // Browser notification
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(t("notif_title"), {
            body: `${entry.name} — ${alarmLabel(alarm)}`,
          });
        }

        // Play custom or default sound
        playNotifSound();

        // In-app toast
        showToast(`${t("toast_reminder")} ${entry.name} (${alarmLabel(alarm)})`);
      }
    });
  });
}

applyTheme();
initNotifications();
processDecay();
refreshAll();
setInterval(refreshAll, 60000);
setInterval(checkAlarms, 15000);
setInterval(saveFiredAlarms, 30000);

// Clock
function updateClock() {
  const now = new Date();
  const timeEl = document.getElementById("clockTime");
  const dateEl = document.getElementById("clockDate");
  if (timeEl) timeEl.textContent = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  if (dateEl) dateEl.textContent = now.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}
updateClock();
setInterval(updateClock, 1000);

// Load default inventory if none exists
if (inventory.length === 0) {
  fetch("default-inventory.json")
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data) && data.length > 0) {
        inventory = data;
        saveInventory();
      }
      refreshAll();
    })
    .catch(() => { refreshAll(); });
}

/* ============ Service Worker update detection ============ */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistration().then((reg) => {
    if (!reg) return;
    reg.addEventListener("updatefound", () => {
      const newWorker = reg.installing;
      if (!newWorker) return;
      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          showToast(t("toast_swUpdate"));
        }
      });
    });
  });
}
