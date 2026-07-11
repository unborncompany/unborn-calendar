/* ============ firebase.js — Firebase / Cloud Sync ============ */

let firebaseReady = false;
let fb = null; // will hold Firebase modules once ready
let currentUser = null;
let isSyncing = false;
let unsubUserDoc = null; // Firestore real-time listener unsubscribe

function onFirebaseReady() {
  fb = window.__firebase;
  if (!fb) return;
  firebaseReady = true;

  fb.onAuthStateChanged(fb.auth, async (user) => {
    currentUser = user;
    updateAuthUI();
    if (user) {
      await loadFromCloud();
      subscribeToCloud();
    } else {
      unsubscribeCloud();
    }
  });
}

// Wait for Firebase SDK to load
window.addEventListener("firebase-ready", onFirebaseReady);
// Also check if it already loaded
if (window.__firebase) onFirebaseReady();

function updateAuthUI() {
  const signInBtn = document.getElementById("googleSignInBtn");
  const signOutBtn = document.getElementById("googleSignOutBtn");
  const authUser = document.getElementById("authUser");
  const authAvatar = document.getElementById("authAvatar");
  const authName = document.getElementById("authName");
  const syncStatus = document.getElementById("syncStatus");
  const cloudStatusDot = document.getElementById("cloudStatusDot");
  const cloudStatusText = document.getElementById("cloudStatusText");
  const settingsGoogleBtn = document.getElementById("settingsGoogleBtn");

  if (currentUser) {
    signInBtn.style.display = "none";
    authUser.style.display = "flex";
    authAvatar.src = currentUser.photoURL || "";
    authAvatar.style.display = currentUser.photoURL ? "" : "none";
    authName.textContent = currentUser.displayName || currentUser.email;
    syncStatus.style.display = "flex";
    syncStatus.classList.add("synced");
    cloudStatusDot.className = "cloud-status-dot online";
    cloudStatusText.textContent = "Signed in as " + (currentUser.displayName || currentUser.email);
    settingsGoogleBtn.textContent = "Sign out";
  } else {
    signInBtn.style.display = "";
    authUser.style.display = "none";
    syncStatus.style.display = "none";
    syncStatus.classList.remove("synced");
    cloudStatusDot.className = "cloud-status-dot offline";
    cloudStatusText.textContent = "Not signed in";
    settingsGoogleBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> Sign in with Google';
  }
}

async function signInWithGoogle() {
  if (!firebaseReady) { showToast("Cloud sync not available"); return; }
  try {
    await fb.signInWithPopup(fb.auth, fb.provider);
  } catch (err) {
    console.error("Google sign-in error:", err);
    if (err.code !== "auth/popup-closed-by-user") {
      showToast("Sign-in failed: " + err.message);
    }
  }
}

async function signOutGoogle() {
  if (!firebaseReady) return;
  try {
    await fb.signOut(fb.auth);
  } catch (err) {
    console.error("Sign-out error:", err);
  }
}

function getCloudData() {
  return {
    version: 1,
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
    firedAlarms: firedAlarms,
    notifSound: notifSoundData,
    lifeStats: lifeStats,
    updatedAt: new Date().toISOString(),
  };
}

async function saveToCloud() {
  if (!firebaseReady || !currentUser || isSyncing) return;
  try {
    isSyncing = true;
    showSyncStatus("saving");
    const data = getCloudData();
    const userDocRef = fb.doc(fb.db, "users", currentUser.uid);
    await fb.setDoc(userDocRef, data);
    showSyncStatus("synced");
  } catch (err) {
    console.error("Cloud save error:", err);
    showSyncStatus("error");
  } finally {
    isSyncing = false;
  }
}

async function loadFromCloud() {
  if (!firebaseReady || !currentUser) return;
  try {
    isSyncing = true;
    showSyncStatus("loading");
    const userDocRef = fb.doc(fb.db, "users", currentUser.uid);
    const snap = await fb.getDoc(userDocRef);
    if (snap.exists()) {
      const data = snap.data();
      // Apply cloud data to local state
      if (data.entries) entries = data.entries;
      if (data.inventory) inventory = data.inventory;
      if (data.secTasks) secTasks = data.secTasks;
      if (data.deletedSecTasks) deletedSecTasks = data.deletedSecTasks;
      if (data.userProfile) userProfile = data.userProfile;
      if (data.lang) { lang = data.lang; document.getElementById("langSelect").value = lang; }
      if (data.theme) { theme = data.theme; document.getElementById("themeSelect").value = theme; applyTheme(); }
      if (data.calView) { calView = data.calView; document.getElementById("calViewSelect").value = calView; }
      if (data.storeSpent !== undefined) storeSpent = data.storeSpent;
      if (data.redeemed) redeemed = data.redeemed;
      if (data.editPenalties) editPenalties = data.editPenalties;
      if (data.deletePenalties) deletePenalties = data.deletePenalties;
      if (data.firedAlarms) firedAlarms = data.firedAlarms;
      if (data.notifSound) notifSoundData = data.notifSound;
      if (data.lifeStats) lifeStats = { ...lifeStats, ...data.lifeStats };
      // Save everything to localStorage as cache
      saveEntries();
      saveInventory();
      saveSecTasks();
      saveDeletedSecTasks();
      saveUserProfile();
      saveRedeemed();
      saveEditPenalties();
      saveDeletePenalties();
      try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
      try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
      try { localStorage.setItem(CAL_VIEW_KEY, calView); } catch (e) {}
      try { localStorage.setItem(STORE_SPENT_KEY, storeSpent.toString()); } catch (e) {}
      try { localStorage.setItem("ledger.firedAlarms.v1", JSON.stringify(firedAlarms)); } catch (e) {}
      if (data.lifeStats) {
        try { localStorage.setItem(LIFE_STATS_KEY, JSON.stringify(lifeStats)); } catch (e) {}
      }
      if (notifSoundData) {
        try { localStorage.setItem(NOTIF_SOUND_KEY, notifSoundData); } catch (e) {}
      }
      loadNotifSound();
      refreshAll();
      showSyncStatus("synced");
    } else {
      // First time — push local data to cloud
      await saveToCloud();
    }
  } catch (err) {
    console.error("Cloud load error:", err);
    showSyncStatus("error");
  } finally {
    isSyncing = false;
  }
}

function subscribeToCloud() {
  if (!firebaseReady || !currentUser) return;
  unsubscribeCloud();
  const userDocRef = fb.doc(fb.db, "users", currentUser.uid);
  unsubUserDoc = fb.onSnapshot(userDocRef, (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    // Only apply if not currently syncing (avoid loops)
    if (isSyncing) return;
    isSyncing = true;
    if (data.entries) entries = data.entries;
    if (data.inventory) inventory = data.inventory;
    if (data.secTasks) secTasks = data.secTasks;
    if (data.deletedSecTasks) deletedSecTasks = data.deletedSecTasks;
    if (data.userProfile) userProfile = data.userProfile;
    if (data.lang) lang = data.lang;
    if (data.theme) { theme = data.theme; applyTheme(); }
    if (data.calView) calView = data.calView;
    if (data.storeSpent !== undefined) storeSpent = data.storeSpent;
    if (data.redeemed) redeemed = data.redeemed;
    if (data.editPenalties) editPenalties = data.editPenalties;
    if (data.deletePenalties) deletePenalties = data.deletePenalties;
    if (data.firedAlarms) firedAlarms = data.firedAlarms;
    if (data.notifSound) notifSoundData = data.notifSound;
    if (data.lifeStats) lifeStats = { ...lifeStats, ...data.lifeStats };
    // Update localStorage cache
    saveEntries();
    saveInventory();
    saveSecTasks();
    saveDeletedSecTasks();
    saveUserProfile();
    saveRedeemed();
    saveEditPenalties();
    saveDeletePenalties();
    refreshAll();
    isSyncing = false;
    showSyncStatus("synced");
  }, (err) => {
    console.error("Cloud listener error:", err);
    showSyncStatus("error");
  });
}

function unsubscribeCloud() {
  if (unsubUserDoc) { unsubUserDoc(); unsubUserDoc = null; }
}

function showSyncStatus(status) {
  const el = document.getElementById("syncStatus");
  if (!el) return;
  const dot = el.querySelector(".sync-dot");
  const label = el.querySelector(".sync-label");
  el.style.display = "flex";
  el.className = "sync-status " + status;
  if (status === "synced") { label.textContent = "Synced"; }
  else if (status === "saving") { label.textContent = "Saving..."; }
  else if (status === "loading") { label.textContent = "Loading..."; }
  else if (status === "error") { label.textContent = "Sync error"; }
  else if (status === "offline") { label.textContent = t("sync_offline"); }
}

/* ============ Online / Offline indicator ============ */
let _lastFirestoreStatus = null;

function setOnlineStatus() {
  const el = document.getElementById("syncStatus");
  if (!navigator.onLine) {
    _lastFirestoreStatus = el && el.classList.contains("synced") ? "synced" : _lastFirestoreStatus;
    showSyncStatus("offline");
  } else if (_lastFirestoreStatus) {
    showSyncStatus(_lastFirestoreStatus);
    _lastFirestoreStatus = null;
  }
}

window.addEventListener("online", () => {
  setOnlineStatus();
  /* Re-trigger cloud sync if user is signed in */
  if (currentUser) {
    loadFromCloud().then(() => subscribeToCloud());
  }
});

window.addEventListener("offline", () => {
  _lastFirestoreStatus = "synced";
  showSyncStatus("offline");
});

/* Set initial state on load */
if (!navigator.onLine) {
  /* Defer slightly so other init code can run first */
  setTimeout(() => { if (!navigator.onLine) showSyncStatus("offline"); }, 500);
}

// Auth button handlers
document.getElementById("googleSignInBtn").addEventListener("click", signInWithGoogle);
document.getElementById("googleSignOutBtn").addEventListener("click", signOutGoogle);
document.getElementById("settingsGoogleBtn").addEventListener("click", () => {
  if (currentUser) { signOutGoogle(); } else { signInWithGoogle(); }
});
