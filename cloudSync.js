// ============================================================================
// cloudSync.js — Firebase Authentication + Firestore Cloud Sync
// ============================================================================
// This module provides Google Sign-In authentication and Firestore-based
// cloud storage for the English Lessons Tracker app.
//
// HOW IT WORKS:
// - When signed out: app uses localStorage only (local-only mode)
// - When signed in:  data syncs to Firestore under users/{uid}/...
// - localStorage is always written as a cache/offline fallback
// - On login, existing localStorage data is uploaded to Firestore (if Firestore
//   is empty) so the user doesn't lose anything.
//
// FIRESTORE STRUCTURE:
//   users/{uid}/
//     data/main        — students, disenrolled, settings (1 doc)
//     whiteboards/{id} — per-board whiteboard data (1 doc per board)
//
// NOTE ON ATTACHMENTS:
//   Firestore documents have a 1 MB size limit. Base64 images in attachments
//   and whiteboard canvas data can be large. If you hit the limit, consider
//   using Firebase Storage instead, or strip attachments before sync.
// ============================================================================

(function() {
    'use strict';

    // ---- Firebase Configuration ----
    // TODO: Replace with your own Firebase config if needed.
    // The values below are from the user's Firebase project.
    const firebaseConfig = {
        apiKey: "AIzaSyDFSqHBKDKksROx4Lg5L3DqX6r5HsjzQvg",
        authDomain: "student-tracker-79d38.firebaseapp.com",
        projectId: "student-tracker-79d38",
        storageBucket: "student-tracker-79d38.firebasestorage.app",
        messagingSenderId: "905744546124",
        appId: "1:905744546124:web:d1f54d5d1027fa63ca37e9",
        measurementId: "G-FVQQ02HGL7"
    };

    // Initialize Firebase (compat SDK loaded via CDN script tags)
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    // Enable offline persistence so Firestore works even with flaky connections.
    // This also means writes are queued if the user goes offline.
    db.enablePersistence({ synchronizeTabs: true }).catch(function(err) {
        if (err.code === 'failed-precondition') {
            console.warn('Firestore persistence unavailable: multiple tabs open.');
        } else if (err.code === 'unimplemented') {
            console.warn('Firestore persistence not supported by this browser.');
        }
    });

    // ---- Public state ----
    let currentFirebaseUser = null;  // null when signed out
    let isSyncing = false;           // true while loading from Firestore
    let syncEnabled = false;         // true when user is signed in

    // Expose globally so app.js can check these
    window.cloudSync = {
        get user() { return currentFirebaseUser; },
        get isSignedIn() { return syncEnabled; },
        get isSyncing() { return isSyncing; }
    };

    // ---- Auth Functions ----

    window.firebaseSignIn = function() {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).catch(function(error) {
            console.error('Sign-in error:', error);
            alert('Sign-in failed: ' + error.message);
        });
    };

    window.firebaseSignOut = function() {
        auth.signOut().catch(function(error) {
            console.error('Sign-out error:', error);
        });
    };

    // ---- Email/Password Sign-In (the login gate) ----
    //
    // This app is gated behind Firebase Auth: #loginGate is shown by default
    // and #appContainer stays hidden until onAuthStateChanged reports a signed-in
    // user. There's no self-service sign-up here on purpose — add your own
    // account once via Firebase Console → Authentication → Users → Add user,
    // and make sure the "Email/Password" sign-in provider is enabled there.

    window.firebaseSignInEmail = function() {
        const emailInput = document.getElementById('loginEmail');
        const passwordInput = document.getElementById('loginPassword');
        const errorEl = document.getElementById('loginError');
        const submitBtn = document.getElementById('loginSubmitBtn');
        if (!emailInput || !passwordInput) return;

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (errorEl) { errorEl.style.display = 'none'; errorEl.textContent = ''; }

        if (!email || !password) {
            if (errorEl) {
                errorEl.textContent = 'Enter both email and password.';
                errorEl.style.display = 'block';
            }
            return;
        }

        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Signing in…'; }

        auth.signInWithEmailAndPassword(email, password).catch(function(error) {
            console.error('Email sign-in error:', error);
            if (errorEl) {
                errorEl.textContent = friendlyAuthError(error);
                errorEl.style.display = 'block';
            }
        }).finally(function() {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Sign In'; }
        });
    };

    function friendlyAuthError(error) {
        switch (error.code) {
            case 'auth/invalid-email': return 'That email address looks invalid.';
            case 'auth/user-disabled': return 'This account has been disabled.';
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential': return 'Incorrect email or password.';
            case 'auth/too-many-requests': return 'Too many attempts. Please wait a bit and try again.';
            case 'auth/network-request-failed': return 'Network error — check your connection and try again.';
            default: return 'Sign-in failed: ' + (error.message || 'Unknown error.');
        }
    }

    // ---- Gate the app behind sign-in ----
    // Shows #loginGate / hides #appContainer when signed out, and vice versa.
    function toggleAppGate(user) {
        const gate = document.getElementById('loginGate');
        const app = document.getElementById('appContainer');
        const checkingMsg = document.getElementById('authCheckingMsg');
        const formArea = document.getElementById('loginFormArea');
        if (!gate || !app) return;

        // The "Checking session…" message only makes sense before Firebase has
        // told us anything at all — once onAuthStateChanged fires (signed in or
        // not), replace it with either the app or the login form.
        if (checkingMsg) checkingMsg.style.display = 'none';

        // Offline auth bypass: if no Firebase user but offline admin login is
        // valid, skip the gate and open the app directly.
        if (!user && localStorage.getItem('lessonsOfflineAuth') === '1') {
            gate.style.display = 'none';
            app.style.display = 'block';
            if (formArea) formArea.style.display = 'none';
            return;
        }

        if (user) {
            gate.style.display = 'none';
            app.style.display = 'block';
            if (formArea) formArea.style.display = 'none';
            // Clear the login form so credentials don't linger in the DOM/inputs
            const emailInput = document.getElementById('loginEmail');
            const passwordInput = document.getElementById('loginPassword');
            if (emailInput) emailInput.value = '';
            if (passwordInput) passwordInput.value = '';
            const errorEl = document.getElementById('loginError');
            if (errorEl) { errorEl.style.display = 'none'; errorEl.textContent = ''; }
        } else {
            gate.style.display = 'flex';
            app.style.display = 'none';
            if (formArea) formArea.style.display = 'block';
        }
    }

    // ---- Auth State Listener ----

    auth.onAuthStateChanged(function(user) {
        currentFirebaseUser = user;
        syncEnabled = !!user;

        // Update UI
        updateAuthUI(user);
        toggleAppGate(user);

        if (user) {
            console.log('Signed in as:', user.displayName || user.email);
            loadFromCloud();
        } else {
            console.log('Signed out — showing login gate.');
            isSyncing = false;
        }
    });

    function updateAuthUI(user) {
        const signedOutEl = document.getElementById('authSignedOut');
        const signedInEl = document.getElementById('authSignedIn');
        const photoEl = document.getElementById('authUserPhoto');
        const nameEl = document.getElementById('authUserName');
        const statusEl = document.getElementById('authStatus');
        const footerMsg = document.getElementById('footerStorageMsg');

        if (user) {
            signedOutEl.style.display = 'none';
            signedInEl.style.display = 'flex';
            photoEl.src = user.photoURL || '';
            photoEl.style.display = user.photoURL ? 'block' : 'none';
            nameEl.textContent = user.displayName || user.email || '';
            statusEl.textContent = '✓ Synced';
            statusEl.className = 'auth-status synced';
            if (footerMsg) footerMsg.textContent = 'Data is synced to the cloud.';
        } else {
            signedOutEl.style.display = 'block';
            signedInEl.style.display = 'none';
            statusEl.textContent = '';
            statusEl.className = 'auth-status';
            if (footerMsg) footerMsg.textContent = 'Data is stored in this browser — export a backup regularly.';
        }
    }

    function setSyncStatus(text, isError) {
        const statusEl = document.getElementById('authStatus');
        if (statusEl) {
            statusEl.textContent = text;
            statusEl.className = 'auth-status' + (isError ? ' error' : ' syncing');
        }
    }

    // ---- Firestore Document References ----

    function mainDocRef() {
        return db.collection('users').doc(currentFirebaseUser.uid)
                     .collection('data').doc('main');
    }

    function whiteboardDocRef(boardId) {
        return db.collection('users').doc(currentFirebaseUser.uid)
                     .collection('whiteboards').doc(boardId);
    }

    // ---- Load from Cloud ----

    function loadFromCloud() {
        if (!syncEnabled) return;
        isSyncing = true;
        setSyncStatus('Loading...');

        mainDocRef().get().then(function(doc) {
            if (doc.exists) {
                const cloudData = doc.data();
                mergeCloudData(cloudData);
                setSyncStatus('✓ Synced');
            } else {
                // First login — upload local data to Firestore
                uploadLocalDataToCloud();
            }
            isSyncing = false;

            // Re-render the current view
            if (typeof renderTable === 'function') renderTable();
            if (typeof renderDashboard === 'function') renderDashboard();
            if (typeof renderCalendar === 'function') renderCalendar();
            if (typeof renderProgressView === 'function') renderProgressView();
            if (typeof applyTheme === 'function') applyTheme();

            // Publish current availability for the public booking page, and check
            // for any booking requests that came in while we were signed out.
            publishAvailability(true);
            if (typeof renderPendingBookingRequests === 'function') renderPendingBookingRequests();
        }).catch(function(error) {
            console.error('Error loading from cloud:', error);
            setSyncStatus('Sync error', true);
            isSyncing = false;
        });
    }

    function mergeCloudData(cloudData) {
        // Merge cloud data into local variables (defined in app.js).
        // We only overwrite if the cloud has data; otherwise keep local.
        if (cloudData.students) {
            students = cloudData.students.map(migrateStudent);
        }
        if (cloudData.disenrolled) {
            disenrolled = cloudData.disenrolled.map(migrateStudent);
        }
        if (cloudData.exchangeRate !== undefined) exchangeRate = cloudData.exchangeRate;
        if (cloudData.defaultCurrency) defaultCurrency = cloudData.defaultCurrency;
        if (cloudData.yearlyGoal !== undefined) yearlyGoal = cloudData.yearlyGoal;
        if (cloudData.privacyMode !== undefined) privacyMode = !!cloudData.privacyMode;
        if (cloudData.darkMode !== undefined) darkMode = cloudData.darkMode === true;
        if (cloudData.calendarStyle) calendarStyle = cloudData.calendarStyle;
        if (cloudData.hiddenColumns) {
            hiddenColumns = cloudData.hiddenColumns;
            try {
                localStorage.setItem('englishStudents_hiddenCols', JSON.stringify(hiddenColumns));
            } catch(e) {}
        }
        if (cloudData.bookingWeeklyAvailability) bookingWeeklyAvailability = cloudData.bookingWeeklyAvailability;
        if (cloudData.bookingMorningStart) bookingMorningStart = cloudData.bookingMorningStart;
        if (cloudData.bookingMorningEnd) bookingMorningEnd = cloudData.bookingMorningEnd;
        if (cloudData.bookingAfternoonStart) bookingAfternoonStart = cloudData.bookingAfternoonStart;
        if (cloudData.bookingAfternoonEnd) bookingAfternoonEnd = cloudData.bookingAfternoonEnd;

        // Also update localStorage as cache
        saveToLocalStorage();
    }

    function uploadLocalDataToCloud() {
        if (!syncEnabled) return;
        setSyncStatus('Uploading local data...');

        const localData = {
            students: students,
            disenrolled: disenrolled,
            exchangeRate: exchangeRate,
            defaultCurrency: defaultCurrency,
            yearlyGoal: yearlyGoal,
            privacyMode: privacyMode,
            darkMode: darkMode,
            calendarStyle: calendarStyle,
            hiddenColumns: hiddenColumns || [],
            bookingWeeklyAvailability: bookingWeeklyAvailability || {},
            bookingMorningStart: bookingMorningStart,
            bookingMorningEnd: bookingMorningEnd,
            bookingAfternoonStart: bookingAfternoonStart,
            bookingAfternoonEnd: bookingAfternoonEnd,
            lastModified: firebase.firestore.FieldValue.serverTimestamp()
        };

        return mainDocRef().set(localData).then(function() {
            setSyncStatus('✓ Synced');

            // Also upload any local whiteboard data
            uploadLocalWhiteboards();
        }).catch(function(error) {
            console.error('Error uploading local data:', error);
            setSyncStatus('Upload failed', true);
        });
    }

    // ---- Public Booking Page Support ----
    //
    // The booking page (booking.html) is a separate, unauthenticated page that
    // potential students can open without signing in. It needs to know which
    // time slots are already taken WITHOUT exposing any student names or
    // personal data, and it needs a place to drop new booking requests for the
    // teacher to review.
    //
    // This app writes a top-level `publicAvailability/busySlots` document
    // (just a bare list of {date, time} — no names) every time the schedule
    // changes, and reads/updates a top-level `bookingRequests` collection that
    // the booking page writes to.
    //
    // IMPORTANT — Firestore security rules must allow this. Suggested rules:
    //
    //   match /publicAvailability/{doc} {
    //     allow read: if true;
    //     allow write: if request.auth != null;
    //   }
    //   match /bookingRequests/{doc} {
    //     allow create: if true;
    //     allow read, update, delete: if request.auth != null;
    //   }
    //
    // Debounced the same way as saveToCloud — schedule changes often happen in
    // quick bursts (e.g. editing several scheduled lessons), so we don't want
    // to hammer Firestore with a write per keystroke/click.
    let availabilitySaveTimeout = null;
    const AVAILABILITY_SAVE_DELAY = 800; // ms

    function publishAvailability(immediate) {
        if (!syncEnabled) return;
        if (immediate) {
            if (availabilitySaveTimeout) clearTimeout(availabilitySaveTimeout);
            _doPublishAvailability();
            return;
        }
        if (availabilitySaveTimeout) clearTimeout(availabilitySaveTimeout);
        availabilitySaveTimeout = setTimeout(function() {
            _doPublishAvailability();
        }, AVAILABILITY_SAVE_DELAY);
    }

    function _doPublishAvailability() {
        if (!syncEnabled) return;
        try {
            const todayVal = new Date().toISOString().split('T')[0];
            const slots = [];
            // Pull from every student regardless of status (Active/Paused/Contact
            // Student) — a scheduled time still occupies the slot either way.
            // Disenrolled students shouldn't normally have future scheduled
            // lessons, but we include them too just in case one was left behind.
            const allLists = [
                (typeof students !== 'undefined' ? students : []),
                (typeof disenrolled !== 'undefined' ? disenrolled : [])
            ];
            allLists.forEach(function(list) {
                list.forEach(function(s) {
                    (s.scheduledLessons || []).forEach(function(sl) {
                        if (sl && sl.date && sl.time && sl.date >= todayVal) {
                            slots.push({ date: sl.date, time: sl.time });
                        }
                    });
                });
            });
            db.collection('publicAvailability').doc('busySlots').set({
                slots: slots,
                weeklyAvailability: (typeof bookingWeeklyAvailability !== 'undefined' ? bookingWeeklyAvailability : {}),
                morningStart: (typeof bookingMorningStart !== 'undefined' ? bookingMorningStart : '08:00'),
                morningEnd: (typeof bookingMorningEnd !== 'undefined' ? bookingMorningEnd : '13:00'),
                afternoonStart: (typeof bookingAfternoonStart !== 'undefined' ? bookingAfternoonStart : '13:00'),
                afternoonEnd: (typeof bookingAfternoonEnd !== 'undefined' ? bookingAfternoonEnd : '20:30'),
                hideWeekendsBooking: (typeof hideWeekendsBooking !== 'undefined' ? hideWeekendsBooking : false),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }).catch(function(error) {
                console.error('Error publishing availability:', error);
            });
        } catch (e) {
            console.warn('Could not compute availability to publish', e);
        }
    }

    function getPendingBookingRequests() {
        if (!syncEnabled) return Promise.resolve([]);
        return db.collection('bookingRequests').where('status', '==', 'pending').get()
            .then(function(snapshot) {
                const results = [];
                snapshot.forEach(function(doc) {
                    results.push(Object.assign({ id: doc.id }, doc.data()));
                });
                return results;
            })
            .catch(function(error) {
                console.error('Error fetching booking requests:', error);
                return [];
            });
    }

    function updateBookingRequestStatus(requestId, status) {
        if (!syncEnabled) return Promise.resolve();
        return db.collection('bookingRequests').doc(requestId).update({
            status: status,
            resolvedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(function(error) {
            console.error('Error updating booking request:', error);
        });
    }

    // ---- Save to Cloud ----

    // Debounce cloud writes to avoid hitting Firestore rate limits.
    let cloudSaveTimeout = null;
    const CLOUD_SAVE_DELAY = 800; // ms

    function saveToCloud() {
        if (!syncEnabled) return;

        if (cloudSaveTimeout) clearTimeout(cloudSaveTimeout);
        cloudSaveTimeout = setTimeout(function() {
            _doCloudSave();
        }, CLOUD_SAVE_DELAY);
    }

    function _doCloudSave() {
        if (!syncEnabled) return;
        setSyncStatus('Saving...');

        const data = {
            students: students,
            disenrolled: disenrolled,
            exchangeRate: exchangeRate,
            defaultCurrency: defaultCurrency,
            yearlyGoal: yearlyGoal,
            privacyMode: privacyMode,
            darkMode: darkMode,
            calendarStyle: calendarStyle,
            hiddenColumns: hiddenColumns || [],
            bookingWeeklyAvailability: bookingWeeklyAvailability || {},
            bookingMorningStart: bookingMorningStart,
            bookingMorningEnd: bookingMorningEnd,
            bookingAfternoonStart: bookingAfternoonStart,
            bookingAfternoonEnd: bookingAfternoonEnd,
            lastModified: firebase.firestore.FieldValue.serverTimestamp()
        };

        mainDocRef().set(data).then(function() {
            setSyncStatus('✓ Synced');
        }).catch(function(error) {
            console.error('Error saving to cloud:', error);
            setSyncStatus('Save failed', true);
        });
    }

    // ---- Whiteboard Cloud Sync ----

    function saveWhiteboardToCloud(boardId, state) {
        if (!syncEnabled) return;

        whiteboardDocRef(boardId).set(state).then(function() {
            // Silent success
        }).catch(function(error) {
            console.error('Error saving whiteboard to cloud:', error);
            // If the document is too large (1MB limit), warn the user
            if (error.code === 'resource-exhausted') {
                console.warn('Whiteboard data too large for Firestore. Consider clearing the board or using smaller images.');
            }
        });
    }

    function loadWhiteboardFromCloud(boardId) {
        if (!syncEnabled) return Promise.resolve(null);

        return whiteboardDocRef(boardId).get().then(function(doc) {
            if (doc.exists) {
                return doc.data();
            }
            return null;
        }).catch(function(error) {
            console.error('Error loading whiteboard from cloud:', error);
            return null;
        });
    }

    function deleteWhiteboardFromCloud(boardId) {
        if (!syncEnabled) return;

        whiteboardDocRef(boardId).delete().catch(function(error) {
            console.error('Error deleting whiteboard from cloud:', error);
        });
    }

    function uploadLocalWhiteboards() {
        // Find all whiteboard keys in localStorage and upload them
        const WB_PREFIX = 'studentTrackerWhiteboard_v2::';
        const WB_LAST_KEY = 'studentTrackerWhiteboardLastBoard';

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(WB_PREFIX)) {
                const boardId = key.substring(WB_PREFIX.length);
                try {
                    const state = JSON.parse(localStorage.getItem(key));
                    saveWhiteboardToCloud(boardId, state);
                } catch(e) {}
            }
        }

        // Also save the last board ID
        const lastBoard = localStorage.getItem(WB_LAST_KEY);
        if (lastBoard) {
            whiteboardDocRef('__meta').set({ lastBoard: lastBoard }).catch(function() {});
        }
    }

    // ---- Expose cloud functions for app.js to call ----

    window.cloudSync.saveToCloud = saveToCloud;
    window.cloudSync.saveWhiteboardToCloud = saveWhiteboardToCloud;
    window.cloudSync.loadWhiteboardFromCloud = loadWhiteboardFromCloud;
    window.cloudSync.deleteWhiteboardFromCloud = deleteWhiteboardFromCloud;
    window.cloudSync.publishAvailability = publishAvailability;
    window.cloudSync.getPendingBookingRequests = getPendingBookingRequests;
    window.cloudSync.updateBookingRequestStatus = updateBookingRequestStatus;

})();
