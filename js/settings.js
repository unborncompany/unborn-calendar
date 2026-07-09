/* ============ settings.js — Settings, Translations, Points ============ */

/* --- Profile save --- */
document.getElementById("saveProfileBtn").addEventListener("click", () => {
  userProfile.name = document.getElementById("userName").value.trim();
  userProfile.nickname = document.getElementById("userNickname").value.trim();
  userProfile.phone = document.getElementById("userPhone").value.trim();
  saveUserProfile();
  showToast(t("settings_profileSaved"));
  renderDashboard();
});

function loadProfileUI() {
  document.getElementById("userName").value = userProfile.name || "";
  document.getElementById("userNickname").value = userProfile.nickname || "";
  document.getElementById("userPhone").value = userProfile.phone || "";
  document.getElementById("langSelect").value = lang;
  document.getElementById("themeSelect").value = theme;
  document.getElementById("calViewSelect").value = calView;
}

document.getElementById("notifSoundInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    saveNotifSound(reader.result);
    updateSoundUI();
    showToast(t("toast_soundSaved"));
  };
  reader.readAsDataURL(file);
});

document.getElementById("notifSoundTest").addEventListener("click", () => {
  playNotifSound();
  if (!notifSoundData) showToast(t("toast_noSound"));
});

document.getElementById("notifSoundRemove").addEventListener("click", () => {
  removeNotifSound();
  showToast(t("toast_soundRemoved"));
});

loadNotifSound();

/* ============ Settings — Save Data ============ */
const SAVE_FILE_NAME = "ledger-save.json";
let saveDirHandle = null; // File System Access API handle

function gatherSaveData() {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    entries: entries,
    inventory: inventory,
    secTasks: secTasks,
    deletedSecTasks: deletedSecTasks,
    userProfile: userProfile,
    lang: lang,
    theme: theme,
    calView: calView,
    storeSpent: storeSpent,
    redeemed: redeemed,
    editPenalties: editPenalties,
    deletePenalties: deletePenalties,
    notifSound: notifSoundData,
    firedAlarms: firedAlarms,
    lifeStats: lifeStats,
  };
}

function applySaveData(data) {
  // Validate critical arrays before assigning
  if (data.entries && Array.isArray(data.entries)) {
    entries = data.entries.map(e => ({
      ...e,
      todos: Array.isArray(e.todos) ? e.todos.map(t => ({
        id: t.id || "t_" + Math.random().toString(36).slice(2, 7),
        text: typeof t.text === "string" ? t.text : "",
        done: !!t.done,
      })) : [],
      completedAt: e.completedAt || null,
    }));
  }
  if (data.inventory && Array.isArray(data.inventory)) inventory = data.inventory;
  if (data.secTasks && Array.isArray(data.secTasks)) secTasks = data.secTasks;
  if (data.deletedSecTasks && Array.isArray(data.deletedSecTasks)) deletedSecTasks = data.deletedSecTasks;
  if (data.userProfile) userProfile = data.userProfile;
  if (data.lang) { lang = data.lang; localStorage.setItem(LANG_KEY, lang); document.getElementById("langSelect").value = lang; }
  if (data.theme) { theme = data.theme; localStorage.setItem(THEME_KEY, theme); document.getElementById("themeSelect").value = theme; applyTheme(); }
  if (data.calView) { calView = data.calView; localStorage.setItem(CAL_VIEW_KEY, calView); document.getElementById("calViewSelect").value = calView; }
  if (data.storeSpent !== undefined) { storeSpent = data.storeSpent; localStorage.setItem(STORE_SPENT_KEY, storeSpent.toString()); }
  if (data.redeemed) { redeemed = data.redeemed; saveRedeemed(); }
  if (data.editPenalties) { editPenalties = data.editPenalties; saveEditPenalties(); }
  if (data.deletePenalties) { deletePenalties = data.deletePenalties; saveDeletePenalties(); }
  if (data.notifSound) notifSoundData = data.notifSound;
  if (data.firedAlarms) firedAlarms = data.firedAlarms;
  if (data.lifeStats) lifeStats = { ...lifeStats, ...data.lifeStats };
  saveEntries();
  saveInventory();
  saveSecTasks();
  saveDeletedSecTasks();
  saveUserProfile();
  if (notifSoundData) {
    try { localStorage.setItem(NOTIF_SOUND_KEY, notifSoundData); } catch (e) {}
  }
  try { localStorage.setItem("ledger.firedAlarms.v1", JSON.stringify(firedAlarms)); } catch (e) {}
  loadNotifSound();
  refreshAll();
}

// Export — download JSON
document.getElementById("exportBtn").addEventListener("click", () => {
  const data = gatherSaveData();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = SAVE_FILE_NAME;
  a.click();
  URL.revokeObjectURL(url);
  showToast(t("toast_exported"));
});

// Import — file picker
document.getElementById("importInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!confirm(t("import_confirm"))) {
        showToast(t("toast_importCancelled"));
        return;
      }
      applySaveData(data);
      showToast(t("toast_imported"));
    } catch (err) {
      showToast(t("toast_invalidFile"));
    }
  };
  reader.readAsText(file);
  e.target.value = "";
});

// Folder picker — File System Access API
document.getElementById("chooseFolderBtn").addEventListener("click", async () => {
  if (!("showDirectoryPicker" in window)) {
    showToast(t("toast_folderNotSupported"));
    return;
  }
  try {
    saveDirHandle = await window.showDirectoryPicker();
    document.getElementById("saveFolderPath").textContent = saveDirHandle.name;
    showToast(t("toast_folderChosen"));
  } catch (e) {
    // user cancelled
  }
});

// Quick save — write to chosen folder
async function quickSave() {
  if (!saveDirHandle) {
    showToast(t("toast_noFolder"));
    return;
  }
  try {
    const fileHandle = await saveDirHandle.getFileHandle(SAVE_FILE_NAME, { create: true });
    const writable = await fileHandle.createWritable();
    const data = gatherSaveData();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
    showToast(t("toast_quickSaved"));
  } catch (e) {
    showToast(t("toast_quickSaveFail"));
  }
}

document.getElementById("quickSaveBtn").addEventListener("click", quickSave);

/* ============ Scoreboard ============ */
function calcMaxPoints(entry) {
  if (getStatus(entry) === "completed") return 0;
  return 5; // max possible if completed before deadline
}

function calcEntryPoints(entry) {
  const status = getStatus(entry);
  if (status !== "completed") return 0;

  const deadline = deadlineOf(entry);
  // Use the locked-in completion timestamp; fall back to "now" for legacy entries
  const completedAt = entry.completedAt ? new Date(entry.completedAt) : new Date();

  if (completedAt <= deadline) {
    return 5; // completed before deadline
  }

  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  if (completedAt - deadline > oneWeek) {
    return -4; // deadline passed by 1+ week
  }

  return 2; // completed after deadline
}

function calcTotalPoints() {
  const entryPts = entries.reduce((sum, e) => sum + calcEntryPoints(e), 0);
  const secPts = secTasks.reduce((sum, t) => sum + getSecTaskPoints(t), 0);
  const deletedPts = deletedSecTasks.length * -1;
  const editPts = editPenalties.length * -1;
  const deletePts = deletePenalties.length * -2;
  return entryPts + secPts + deletedPts + editPts + deletePts;
}

// Listen to tab changes
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`panel-${btn.dataset.tab}`).classList.add("active");
    if (btn.dataset.tab === "calendar") applyCalView();
    if (btn.dataset.tab === "inventory") renderInventory();
    if (btn.dataset.tab === "store") renderStore();
    if (btn.dataset.tab === "life") { renderLife(); renderDashboard(); }
    if (btn.dataset.tab === "settings") updateSoundUI();
  });
});

/* ============ Language / Translations ============ */
function applyTranslations() {
  // Page title
  document.title = lang === "es" ? "Game of Life \u2014 Planificador Diario" : "Game of Life \u2014 Daily Planner";
  // Tabs
  document.querySelector('[data-tab="calendar"]').textContent = t("tab_calendar");
  document.querySelector('[data-tab="store"]').textContent = t("store_title");
  document.querySelector('[data-tab="life"]').textContent = t("life_title");
  document.querySelector('[data-tab="settings"]').textContent = t("tab_settings");
  // Header
  document.getElementById("quickAddBtn").textContent = t("btn_newEntry");
  document.getElementById("quickSaveBtn").textContent = t("btn_quickSave");
  document.getElementById("quickSaveBtn").title = t("settings_quickSaveTitle");
  // Calendar
  document.getElementById("todayBtn").textContent = t("cal_today");
  const weekdays = document.querySelectorAll(".cal-weekdays span");
  t("cal_weekdays").forEach((w, i) => { if (weekdays[i]) weekdays[i].textContent = w; });
  // Dashboard
  document.querySelector("#panel-life .dash-secondary-head h2").textContent = t("dash_secondary");
  // Inventory
  document.querySelector("#panel-inventory .panel-head h2").textContent = t("inv_title");
  document.getElementById("invAddBtn").textContent = t("inv_addItem");
  document.getElementById("invExportBtn").textContent = t("settings_export");
  document.getElementById("invImportLabel").textContent = t("settings_import");
  document.querySelector(".inv-table-head .inv-col-name").textContent = t("inv_colItem");
  document.querySelector(".inv-table-head .inv-col-price").textContent = t("inv_colPrice");
  document.querySelector(".inv-table-head .inv-col-qty").textContent = t("inv_colQty");
  document.querySelector(".inv-table-head .inv-col-cat").textContent = t("inv_colCat");
  // Points summary
  document.querySelectorAll("#storePtsEarnedLabel").forEach(el => { el.textContent = t("pts_earned"); });
  document.querySelectorAll("#storePtsSpentLabel").forEach(el => { el.textContent = t("pts_spent"); });
  document.querySelectorAll("#dashPtsAvailLabel, #storePtsAvailLabel").forEach(el => { el.textContent = t("pts_available"); });
  // Settings — Language
  document.getElementById("settingsLangTitle").textContent = t("settings_language");
  document.getElementById("settingsLangHint").textContent = t("settings_langHint");
  // Settings — Theme
  document.getElementById("settingsThemeTitle").textContent = t("settings_theme");
  document.getElementById("settingsThemeHint").textContent = t("settings_themeHint");
  const themeOpts = document.getElementById("themeSelect").options;
  themeOpts[0].textContent = t("settings_themeLight");
  themeOpts[1].textContent = t("settings_themeDark");
  // Settings — Calendar View
  document.getElementById("settingsCalendarViewTitle").textContent = t("settings_calView");
  document.getElementById("settingsCalendarViewHint").textContent = t("settings_calViewHint");
  const calOpts = document.getElementById("calViewSelect").options;
  calOpts[0].textContent = t("settings_calViewGrid");
  calOpts[1].textContent = t("settings_calViewList");
  // Settings — Reset
  document.getElementById("settingsResetTitle").textContent = t("settings_reset");
  document.getElementById("settingsResetHint").textContent = t("settings_resetHint");
  document.getElementById("resetAllBtn").textContent = t("settings_resetBtn");
  // Settings — Supply Store
  document.getElementById("settingsSupplyTitle").textContent = t("settings_supply");
  document.getElementById("settingsSupplyHint").textContent = t("settings_supplyHint");
  document.getElementById("supplyStoreBtn").textContent = t("settings_supplyBtn");
  // Settings — Cloud Sync
  document.getElementById("settingsCloudTitle").textContent = t("settings_cloud");
  document.getElementById("settingsCloudHint").textContent = t("settings_cloudHint");
  // Store
  document.getElementById("storeTitle").textContent = t("store_title");
  document.getElementById("storeSummary").textContent = t("store_summary");
  document.getElementById("storePtsAvailLabel").textContent = t("store_availPts");
  // Life
  document.getElementById("lifeTitle").textContent = t("life_title");
  document.getElementById("lifeSummary").textContent = t("life_summary");
  document.getElementById("lifeTotalLabel").textContent = t("life_totalLabel");
  document.getElementById("lifeStatHealthLabel").textContent = t("life_health");
  document.getElementById("lifeStatEnergyLabel").textContent = t("life_energy");
  document.getElementById("lifeStatHungerLabel").textContent = t("life_hunger");
  document.getElementById("lifeStatThirstLabel").textContent = t("life_thirst");
  // Admin modal
  document.getElementById("adminModalTitle").textContent = t("admin_title");
  document.getElementById("adminLabelUser").textContent = t("admin_user");
  document.getElementById("adminUser").placeholder = t("admin_userPlaceholder");
  document.getElementById("adminLabelPass").textContent = t("admin_pass");
  document.getElementById("adminPass").placeholder = t("admin_passPlaceholder");
  document.getElementById("adminCancelBtn").textContent = t("admin_cancel");
  document.getElementById("adminError").textContent = t("admin_error");
  // Redeem modal
  document.getElementById("redeemModalTitle").textContent = t("store_redeemTitle");
  document.getElementById("redeemCancelBtn").textContent = t("admin_cancel");
  document.getElementById("redeemConfirmBtn").textContent = t("store_redeemConfirm");
  // Inventory image
  document.getElementById("invLabelImage").innerHTML = t("invLabelImage") + " <em>" + t("entry_descOptional") + "</em>";
  document.getElementById("invImageLabel").textContent = t("invImageChoose");
  document.getElementById("invImageName").textContent = t("invImageNoFile");
  document.getElementById("invImageRemove").textContent = t("invImageRemove");
  // Settings — Profile
  document.getElementById("settingsProfileTitle").textContent = t("settings_profile");
  document.getElementById("settingsProfileHint").textContent = t("settings_profileHint");
  document.querySelector('label[for="userName"]').textContent = t("settings_name");
  document.getElementById("userName").placeholder = t("settings_namePlaceholder");
  document.querySelector('label[for="userNickname"]').textContent = t("settings_nickname");
  document.getElementById("userNickname").placeholder = t("settings_nicknamePlaceholder");
  document.querySelector('label[for="userPhone"]').textContent = t("settings_phone");
  document.getElementById("userPhone").placeholder = t("settings_phonePlaceholder");
  document.getElementById("saveProfileBtn").textContent = t("settings_saveProfile");
  // Settings — Notification Sound
  document.getElementById("settingsNotifTitle").textContent = t("settings_notifSound");
  document.getElementById("settingsNotifHint").textContent = t("settings_notifHint");
  document.getElementById("notifChooseLabel").textContent = t("settings_chooseFile");
  document.getElementById("notifSoundTest").textContent = t("settings_test");
  document.getElementById("notifSoundRemove").textContent = t("settings_remove");
  updateSoundUI();
  // Settings — Save Data
  document.getElementById("settingsSaveTitle").textContent = t("settings_saveData");
  document.getElementById("settingsSaveHint").textContent = t("settings_saveHint");
  document.getElementById("exportBtn").textContent = t("settings_export");
  document.getElementById("importLabel").textContent = t("settings_import");
  document.getElementById("chooseFolderBtn").textContent = t("settings_chooseFolder");
  if (!saveDirHandle) document.getElementById("saveFolderPath").textContent = t("settings_noFolder");
  // Entry modal
  document.getElementById("entryLabelName").textContent = t("entry_nameLabel");
  document.getElementById("entryName").placeholder = t("entry_namePlaceholder");
  document.getElementById("entryLabelDesc").innerHTML = t("entry_descLabel") + " <em>" + t("entry_descOptional") + "</em>";
  document.getElementById("entryDescription").placeholder = t("entry_descPlaceholder");
  document.getElementById("entryLabelDate").textContent = t("entry_dateLabel");
  document.getElementById("entryLabelTime").innerHTML = t("entry_timeLabel") + " <em>" + t("entry_descOptional") + "</em>";
  document.getElementById("entryLabelTodos").textContent = t("entry_todosLabel");
  document.getElementById("entryLabelAlarms").innerHTML = t("entry_alarmsLabel") + " <em>" + t("entry_descOptional") + "</em>";
  document.getElementById("addTodoRow").textContent = t("entry_addTodo");
  document.getElementById("addAlarmRow").textContent = t("entry_addAlarm");
  document.getElementById("entryCancelBtn").textContent = t("entry_cancel");
  document.querySelector('#entryForm button[type="submit"]').textContent = t("entry_save");
  // Inventory modal
  document.getElementById("invLabelName").textContent = t("invModal_itemName");
  document.getElementById("invItemName").placeholder = t("invModal_itemPlaceholder");
  document.getElementById("invLabelDesc").innerHTML = t("invModal_desc") + " <em>" + t("invModal_descOptional") + "</em>";
  document.getElementById("invLabelPrice").textContent = t("invModal_price");
  document.getElementById("invLabelQty").textContent = t("invModal_qty");
  document.getElementById("invLabelCat").textContent = t("invModal_cat");
  document.getElementById("invLabelAcc").innerHTML = t("invModal_acc") + " <em>" + t("invModal_descOptional") + "</em>";
  document.getElementById("invAddAccRow").textContent = t("invModal_addAcc");
  document.getElementById("invLabelConsumable").textContent = t("invModal_consumable");
  document.getElementById("invLabelStatEffects").innerHTML = t("invModal_statEffects") + " <em>" + t("invModal_descOptional") + "</em>";
  document.getElementById("invAddStatEffectRow").textContent = t("invModal_addEffect");
  document.getElementById("invCancelBtn").textContent = t("invModal_cancel");
  document.querySelector('#invForm button[type="submit"]').textContent = t("invModal_save");
  document.getElementById("invDeleteBtn").textContent = t("invModal_delete");
  // Detail modal
  document.getElementById("detailDeleteBtn").textContent = t("detail_delete");
  document.getElementById("detailEditBtn").textContent = t("detail_edit");
  document.getElementById("detailCloseBtn").textContent = t("detail_close");
  // Set html lang attribute
  document.documentElement.lang = lang;
}

document.getElementById("langSelect").addEventListener("change", (e) => {
  lang = e.target.value;
  localStorage.setItem(LANG_KEY, lang);
  applyTranslations();
  refreshAll();
  scheduleCloudSave();
});

document.getElementById("themeSelect").addEventListener("change", (e) => {
  theme = e.target.value;
  localStorage.setItem(THEME_KEY, theme);
  applyTheme();
  scheduleCloudSave();
});

document.getElementById("calViewSelect").addEventListener("change", (e) => {
  calView = e.target.value;
  localStorage.setItem(CAL_VIEW_KEY, calView);
  syncCalViewButtons();
  applyCalView();
  scheduleCloudSave();
});

document.getElementById("calViewGridBtn").addEventListener("click", () => {
  calView = "grid";
  localStorage.setItem(CAL_VIEW_KEY, calView);
  document.getElementById("calViewSelect").value = calView;
  syncCalViewButtons();
  applyCalView();
});

document.getElementById("calViewListBtn").addEventListener("click", () => {
  calView = "list";
  localStorage.setItem(CAL_VIEW_KEY, calView);
  document.getElementById("calViewSelect").value = calView;
  syncCalViewButtons();
  applyCalView();
});

function syncCalViewButtons() {
  const gridBtn = document.getElementById("calViewGridBtn");
  const listBtn = document.getElementById("calViewListBtn");
  gridBtn.classList.toggle("active", calView === "grid");
  listBtn.classList.toggle("active", calView === "list");
}

document.getElementById("resetAllBtn").addEventListener("click", () => {
  if (!confirm(t("settings_resetConfirm"))) return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SEC_STORAGE_KEY);
  localStorage.removeItem(SEC_DELETED_KEY);
  localStorage.removeItem(USER_PROFILE_KEY);
  localStorage.removeItem(THEME_KEY);
  localStorage.removeItem(CAL_VIEW_KEY);
  localStorage.removeItem(STORE_SPENT_KEY);
  localStorage.removeItem(REDEEMED_KEY);
  localStorage.removeItem(EDIT_PENALTY_KEY);
  localStorage.removeItem(DELETE_PENALTY_KEY);
  localStorage.removeItem(NOTIF_SOUND_KEY);
  localStorage.removeItem("ledger.firedAlarms.v1");
  localStorage.removeItem(LANG_KEY);
  localStorage.removeItem(LIFE_STATS_KEY);
  entries = [];
  secTasks = [];
  deletedSecTasks = [];
  userProfile = { name: "", nickname: "", phone: "" };
  firedAlarms = {};
  notifSoundData = null;
  lang = "en";
  theme = "dark";
  calView = "grid";
  storeSpent = 0;
  redeemed = [];
  editPenalties = [];
  deletePenalties = [];
  lifeStats = { health: 95, energy: 80, hunger: 50, thirst: 70, level: 1, lastDecayAt: new Date().toISOString(), lowSince: null };
  document.getElementById("langSelect").value = lang;
  document.getElementById("themeSelect").value = theme;
  document.getElementById("calViewSelect").value = calView;
  syncCalViewButtons();
  applyTheme();
  applyTranslations();
  refreshAll();
  showToast(t("toast_deleted"));
  scheduleCloudSave();
});

function refreshAll() {
  processDecay();
  loadProfileUI();
  applyTranslations();
  applyTheme();
  document.getElementById("themeSelect").value = theme;
  document.getElementById("calViewSelect").value = calView;
  syncCalViewButtons();
  renderDashboard();
  applyCalView();
  if (document.getElementById("panel-inventory").classList.contains("active")) {
    renderInventory();
  }
  if (document.getElementById("panel-store").classList.contains("active")) {
    renderStore();
  }
  renderPointsSummary();
  renderLife();
}
