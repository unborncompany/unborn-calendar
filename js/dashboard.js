/* ============ dashboard.js — Dashboard & Secondary Tasks ============ */

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getSecTaskPoints(task) {
  if (task.done) {
    if (task.pointsAwardedAt && task.createdAt && isAntiCheatActive(task.createdAt, task.pointsAwardedAt)) {
      return 1;
    }
    const dayEnd = new Date(`${task.targetDate}T23:59:59`);
    const doneAt = new Date(task.doneAt || Date.now());
    if (doneAt <= dayEnd) return 3;
    return 1;
  }
  const now = new Date();
  const targetEnd = new Date(`${task.targetDate}T23:59:59`);
  const threeDays = 3 * 24 * 60 * 60 * 1000;
  if (now - targetEnd > threeDays) return -2;
  return 0;
}

function renderSecTasks() {
  const list = document.getElementById("secTaskList");
  list.innerHTML = "";

  const tomorrow = tomorrowISO();
  const today = todayISO();
  const tomorrowTasks = secTasks.filter(t => t.targetDate === tomorrow);
  // Include today AND any overdue (targetDate <= today) so orphaned tasks stay visible
  const todayTasks = secTasks.filter(t => t.targetDate <= today);

  const totalPoints = secTasks.reduce((s, t) => s + getSecTaskPoints(t), 0);
  const tomorrowDone = tomorrowTasks.filter(t => t.done).length;
  const todayDone = todayTasks.filter(t => t.done).length;
  document.getElementById("secSummary").textContent =
    (tomorrowTasks.length === 0 && todayTasks.length === 0)
      ? t("dash_secNoTasks")
      : `${tomorrowDone + todayDone}/${tomorrowTasks.length + todayTasks.length} ${t("dash_done")} \u00b7 ${totalPoints} pts`;

  // Section labels
  document.getElementById("secTodaySection").querySelector(".dash-sec-label").textContent = t("dash_secToday");
  document.querySelector(".dash-sec-tomorrow .dash-sec-label").textContent = t("dash_secTomorrow");
  document.getElementById("secAddBtn").textContent = t("dash_secAdd");
  document.getElementById("secSaveBtn").textContent = t("dash_secSave");
  document.getElementById("secCancelBtn").textContent = t("dash_secCancel");
  document.getElementById("secTaskInput").placeholder = t("dash_secPlaceholder");

  // Today's secondary tasks (read-only display)
  const todaySection = document.getElementById("secTodaySection");
  const todayList = document.getElementById("secTodayList");
  todayList.innerHTML = "";
  const todayIncomplete = todayTasks.filter(t => !t.done);
  if (todayIncomplete.length > 0) {
    todaySection.style.display = "block";
    todayIncomplete.forEach(task => {
      const pts = getSecTaskPoints(task);
      const item = document.createElement("div");
      item.className = "sec-task-item" + (task.done ? " done" : "") + (pts < 0 ? " missed" : "");

      const check = document.createElement("input");
      check.type = "checkbox";
      check.className = "sec-task-check";
      check.checked = task.done;
      check.addEventListener("change", () => {
        if (check.checked) {
          if (task.createdAt && isCooldownActive(task.createdAt)) {
            check.checked = false;
            showToast(t("toast_cooldown")(getRemainingCooldown(task.createdAt)));
            return;
          }
          task.pendingPoints = true;
          saveSecTasks();
          renderSecTasks();
        } else {
          task.pendingPoints = false;
          saveSecTasks();
          renderSecTasks();
        }
      });

      const text = document.createElement("span");
      text.className = "sec-task-text";
      text.textContent = task.name;

      const status = document.createElement("span");
      status.className = "sec-task-status " + (pts > 0 ? "pos" : pts < 0 ? "neg" : "neutral");
      status.textContent = pts > 0 ? `+${pts}` : pts < 0 ? `${pts}` : t("dash_pending");

      const getPointsBtn = document.createElement("button");
      getPointsBtn.className = "btn btn-primary btn-small";
      getPointsBtn.textContent = t("dash_getPoints");
      getPointsBtn.style.fontSize = "11px";
      getPointsBtn.style.padding = "4px 10px";
      getPointsBtn.addEventListener("click", () => {
        task.done = true;
        task.doneAt = new Date().toISOString();
        task.pointsAwardedAt = new Date().toISOString();
        task.pendingPoints = false;
        saveSecTasks();
        if (task.createdAt && isAntiCheatActive(task.createdAt, task.pointsAwardedAt)) {
          showToast(t("toast_antiCheat"));
        }
        playPointsCelebration(getSecTaskPoints(task), task.name);
        item.style.transition = "opacity 0.3s, transform 0.3s";
        item.style.opacity = "0";
        item.style.transform = "translateX(20px)";
        setTimeout(() => {
          renderSecTasks();
          renderPointsSummary();
          renderLifeStats();
        }, 300);
      });

      item.appendChild(check);
      item.appendChild(text);
      item.appendChild(status);
      if (task.pendingPoints) {
        item.appendChild(getPointsBtn);
      }
      todayList.appendChild(item);
    });
  } else {
    todaySection.style.display = "none";
  }

  // Tomorrow's secondary tasks (with add/remove)
  const tomorrowIncomplete = tomorrowTasks.filter(t => !t.done);
  if (tomorrowIncomplete.length === 0) {
    list.innerHTML = renderEmptyState(t("dash_clear"), t("dash_secNoTasks"), "", "padding:12px");
    return;
  }

  tomorrowIncomplete.forEach(task => {
    const pts = getSecTaskPoints(task);
    const item = document.createElement("div");
    item.className = "sec-task-item" + (task.done ? " done" : "") + (pts < 0 ? " missed" : "");

    const check = document.createElement("input");
    check.type = "checkbox";
    check.className = "sec-task-check";
    check.checked = task.done;
    check.addEventListener("change", () => {
      if (check.checked) {
        if (task.createdAt && isCooldownActive(task.createdAt)) {
          check.checked = false;
          showToast(t("toast_cooldown")(getRemainingCooldown(task.createdAt)));
          return;
        }
        task.pendingPoints = true;
        saveSecTasks();
        renderSecTasks();
      } else {
        task.pendingPoints = false;
        saveSecTasks();
        renderSecTasks();
      }
    });

    const text = document.createElement("span");
    text.className = "sec-task-text";
    text.textContent = task.name;

    const status = document.createElement("span");
    status.className = "sec-task-status " + (pts > 0 ? "pos" : pts < 0 ? "neg" : "neutral");
    status.textContent = pts > 0 ? `+${pts}` : pts < 0 ? `${pts}` : t("dash_pending");

    const getPointsBtn = document.createElement("button");
    getPointsBtn.className = "btn btn-primary btn-small";
    getPointsBtn.textContent = t("dash_getPoints");
    getPointsBtn.style.fontSize = "11px";
    getPointsBtn.style.padding = "4px 10px";
    getPointsBtn.addEventListener("click", () => {
      task.done = true;
      task.doneAt = new Date().toISOString();
      task.pointsAwardedAt = new Date().toISOString();
      task.pendingPoints = false;
      saveSecTasks();
      if (task.createdAt && isAntiCheatActive(task.createdAt, task.pointsAwardedAt)) {
        showToast(t("toast_antiCheat"));
      }
      playPointsCelebration(getSecTaskPoints(task), task.name);
      item.style.transition = "opacity 0.3s, transform 0.3s";
      item.style.opacity = "0";
      item.style.transform = "translateX(20px)";
      setTimeout(() => {
        renderSecTasks();
        renderPointsSummary();
        renderLifeStats();
      }, 300);
    });

    const remove = document.createElement("button");
    remove.className = "sec-task-remove";
    remove.textContent = "\u00d7";
    remove.addEventListener("click", () => {
      deletedSecTasks.push({
        id: task.id,
        name: task.name,
        targetDate: task.targetDate,
        deletedAt: new Date().toISOString(),
      });
      saveDeletedSecTasks();
      secTasks = secTasks.filter(t => t.id !== task.id);
      saveSecTasks();
      renderSecTasks();
      renderPointsSummary();
      showToast(t("dash_secDeleted"));
    });

    item.appendChild(check);
    item.appendChild(text);
    item.appendChild(status);
    if (task.pendingPoints) {
      item.appendChild(getPointsBtn);
    }
    item.appendChild(remove);
    list.appendChild(item);
  });
}

// Add secondary task
document.getElementById("secAddBtn").addEventListener("click", () => {
  document.getElementById("secInputArea").style.display = "flex";
  document.getElementById("secTaskInput").value = "";
  document.getElementById("secTaskInput").focus();
});

document.getElementById("secCancelBtn").addEventListener("click", () => {
  document.getElementById("secInputArea").style.display = "none";
});

document.getElementById("secSaveBtn").addEventListener("click", () => {
  const name = document.getElementById("secTaskInput").value.trim();
  if (!name) return;
  if (!canAddSecTask()) {
    showToast(t("toast_secTaskCap"));
    return;
  }
  const hour = new Date().getHours();
  const target = hour < 5 ? todayISO() : tomorrowISO();
  secTasks.push({
    id: uid(),
    name,
    targetDate: target,
    done: false,
    doneAt: null,
    createdAt: new Date().toISOString(),
  });
  saveSecTasks();
  document.getElementById("secInputArea").style.display = "none";
  renderSecTasks();
  showToast(t("dash_secAdded"));
});

document.getElementById("secTaskInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("secSaveBtn").click();
  if (e.key === "Escape") document.getElementById("secCancelBtn").click();
});

/* ============ Dashboard — Main ============ */
function previewEntryPoints(entry) {
  // Calculate points as if completed right now (for the "get points" preview)
  const deadline = deadlineOf(entry);
  const now = new Date();
  if (now <= deadline) return 5; // before deadline
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  if (now - deadline > oneWeek) return -4; // 1+ week late
  return 2; // after deadline but within a week
}

function renderDayEntries(container, dayISO, emptyMsg, lifeMode = false) {
  container.innerHTML = "";

  const dayEntries = entries
    .filter(e => e.date === dayISO)
    .map(e => ({ ...e, _status: getStatus(e) }))
    .sort((a, b) => deadlineOf(a) - deadlineOf(b));

  if (dayEntries.length === 0) {
    container.innerHTML = renderEmptyState(t("dash_free"), emptyMsg || t("dash_nothingToday"), "life-empty", "padding:16px;grid-column:1/-1");
    return;
  }

  dayEntries.forEach(entry => {
    const doneCount = entry.todos.filter(t => t.done).length;
    const allDone = entry.todos.length > 0 && entry.todos.every(t => t.done);
    const entryPts = entry._status === "completed" ? calcEntryPoints(entry) : calcMaxPoints(entry);
    const isPendingClaim = allDone && entry.pendingPoints && !entry.pointsAwardedAt;

    // --- Gamey completed card (shared between lifeMode and dashboard) ---
    if (isPendingClaim) {
      const wrap = document.createElement("div");
      wrap.className = "dash-entry-wrap gamey-completed";
      const previewPts = previewEntryPoints(entry);

      wrap.innerHTML = `
        <div class="dash-entry-gamey-card">
          <div class="gamey-card-glow"></div>
          <div class="gamey-card-particles">
            <div class="gamey-particle"></div>
            <div class="gamey-particle"></div>
            <div class="gamey-particle"></div>
            <div class="gamey-particle"></div>
            <div class="gamey-particle"></div>
            <div class="gamey-particle"></div>
          </div>
          <div class="gamey-card-content">
            <div class="gamey-card-icon">&#10003;</div>
            <div class="gamey-card-text">
              <div class="gamey-card-title">${t("dash_completed")}</div>
              <div class="gamey-card-subtitle">${escapeHTML(entry.name)}</div>
              <div class="gamey-card-pts">${previewPts >= 0 ? "+" : ""}${previewPts} pts</div>
            </div>
            <button class="btn btn-primary btn-small gamey-get-points-btn">${t("dash_getPoints")}</button>
          </div>
        </div>
      `;
      wrap.querySelector(".gamey-get-points-btn").addEventListener("click", (ev) => {
        ev.stopPropagation();
        entry.completedAt = new Date().toISOString();
        entry.pointsAwardedAt = new Date().toISOString();
        entry.pendingPoints = false;
        saveEntries();
        const pts = calcEntryPoints(entry);
        if (entry.createdAt && isAntiCheatActive(entry.createdAt, entry.pointsAwardedAt)) {
          showToast(t("toast_antiCheat"));
        }
        // Celebration
        playPointsCelebration(pts, entry.name);
        wrap.classList.add("claiming");
        setTimeout(() => {
          renderPointsSummary();
          renderLifeStats();
          renderDashboard();
        }, 600);
      });
      container.appendChild(wrap);
      return;
    }

    // --- Active / completed (already claimed) card ---
    if (lifeMode) {
      // Life card style entry with checkboxes
      const card = document.createElement("div");
      card.className = "life-card life-task-card" + (entry._status === "completed" ? " completed" : "");

      // Icon area
      const noImg = document.createElement("div");
      noImg.className = "life-card-noimg life-task-icon";
      if (entry._status === "completed") {
        noImg.innerHTML = `<span class="life-task-check-icon completed">&#10003;</span>`;
        noImg.classList.add("done");
      } else {
        noImg.innerHTML = `<span class="life-task-time">${entry.time ? formatTimePretty(entry.time) : "\u2014"}</span>`;
      }
      card.appendChild(noImg);

      const body = document.createElement("div");
      body.className = "life-card-body";

      // Name
      const name = document.createElement("div");
      name.className = "life-card-name";
      name.textContent = entry.name;
      body.appendChild(name);

      // Points badge
      const price = document.createElement("div");
      price.className = "life-card-price";
      price.textContent = (entryPts >= 0 ? "+" : "") + entryPts + " pts";
      if (entryPts < 0) price.style.color = "var(--danger)";
      body.appendChild(price);

      // Progress
      const qty = document.createElement("div");
      qty.className = "life-card-qty";
      qty.textContent = `${doneCount}/${entry.todos.length} ${t("dash_done")}`;
      body.appendChild(qty);

      // Todos section
      const todosDiv = document.createElement("div");
      todosDiv.className = "life-card-todos life-card-todos-scroll";
      entry.todos.forEach(todo => {
        const item = document.createElement("label");
        item.className = "dash-todo-item" + (todo.done ? " done" : "");
        item.innerHTML = `<input type="checkbox" class="dash-todo-check" ${todo.done ? "checked" : ""}> <span>${escapeHTML(todo.text)}</span>`;
        item.querySelector("input").addEventListener("change", (e) => {
          if (e.target.checked && entry.createdAt && isCooldownActive(entry.createdAt)) {
            e.target.checked = false;
            showToast(t("toast_cooldown")(getRemainingCooldown(entry.createdAt)));
            return;
          }
          todo.done = e.target.checked;
          saveEntries();
          item.classList.toggle("done", todo.done);
          const newDone = entry.todos.filter(t => t.done).length;
          qty.textContent = `${newDone}/${entry.todos.length} ${t("dash_done")}`;
          const newAllDone = entry.todos.length > 0 && entry.todos.every(t => t.done);
          entry.pendingPoints = newAllDone;
          if (newAllDone) {
            saveEntries();
            renderDashboard();
            return;
          }
          const newStatus = getStatus(entry);
          card.className = "life-card life-task-card" + (newStatus === "completed" ? " completed" : "");
          renderPointsSummary();
          renderLifeStats();
        });
        todosDiv.appendChild(item);
      });

      body.appendChild(todosDiv);
      card.appendChild(body);
      container.appendChild(card);
    } else {
      // Dashboard style entry — 3 states
      const isCompleted = entry._status === "completed" && entry.pointsAwardedAt;

      const wrap = document.createElement("div");
      wrap.className = `dash-entry-wrap status-${entry._status}` + (isCompleted ? " dash-entry-locked" : "");

      // Header — shared across active and locked
      const header = document.createElement("div");
      header.className = "dash-entry-header";

      const ptsDisplay = isCompleted ? calcEntryPoints(entry) : entryPts;
      header.innerHTML = `
        <div class="dash-entry-info">
          <div class="dash-entry-meta">
            ${entry.time ? `<span class="dash-entry-time">${formatTimePretty(entry.time)}</span>` : ''}
            <span class="dash-entry-name">${escapeHTML(entry.name)}</span>
          </div>
          ${entry.description ? `<div class="dash-entry-desc">${escapeHTML(entry.description)}</div>` : ''}
          <div class="dash-entry-progress">${doneCount}/${entry.todos.length} ${t("dash_done")}</div>
        </div>
        <span class="dash-entry-pts ${ptsDisplay >= 0 ? "pos" : "neg"}">${ptsDisplay >= 0 ? "+" : ""}${ptsDisplay}</span>
      `;
      wrap.appendChild(header);

      // Todos section — scrollable, locked if completed
      const todosDiv = document.createElement("div");
      todosDiv.className = "dash-entry-todos dash-entry-todos-visible dash-entry-todos-scroll";
      entry.todos.forEach(todo => {
        const item = document.createElement("label");
        item.className = "dash-todo-item" + (todo.done ? " done" : "");
        const checkedAttr = todo.done ? " checked" : "";
        const disabledAttr = isCompleted ? " disabled" : "";
        item.innerHTML = `<input type="checkbox" class="dash-todo-check"${checkedAttr}${disabledAttr}> <span>${escapeHTML(todo.text)}</span>`;
        if (!isCompleted) {
          item.querySelector("input").addEventListener("change", (e) => {
            if (e.target.checked && entry.createdAt && isCooldownActive(entry.createdAt)) {
              e.target.checked = false;
              showToast(t("toast_cooldown")(getRemainingCooldown(entry.createdAt)));
              return;
            }
            todo.done = e.target.checked;
            saveEntries();
            item.classList.toggle("done", todo.done);
            const newDone = entry.todos.filter(t => t.done).length;
            header.querySelector(".dash-entry-progress").textContent = `${newDone}/${entry.todos.length} ${t("dash_done")}`;
            const newAllDone = entry.todos.length > 0 && entry.todos.every(t => t.done);
            entry.pendingPoints = newAllDone;
            if (newAllDone) {
              renderDashboard();
              return;
            }
            wrap.className = `dash-entry-wrap status-${getStatus(entry)}`;
            renderPointsSummary();
            renderLifeStats();
          });
        }
        todosDiv.appendChild(item);
      });

      wrap.appendChild(todosDiv);
      container.appendChild(wrap);
    }
  });
}

/* ============ Points Celebration ============ */
function playPointsCelebration(pts, entryName) {
  // Confetti burst
  const confettiContainer = document.createElement("div");
  confettiContainer.className = "gamey-confetti-container";
  for (let i = 0; i < 12; i++) {
    const c = document.createElement("div");
    c.className = "gamey-confetti";
    confettiContainer.appendChild(c);
  }
  document.body.appendChild(confettiContainer);
  setTimeout(() => confettiContainer.remove(), 1000);

  // Points popup
  const popup = document.createElement("div");
  popup.className = "gamey-points-popup";
  popup.innerHTML = `
    <div class="gamey-points-popup-inner">
      <span class="gamey-points-popup-check">&#10003;</span>
      <div class="gamey-points-popup-label">Points earned</div>
      <div class="gamey-points-popup-pts">+${pts}</div>
      <div class="gamey-points-popup-name">${escapeHTML(entryName)}</div>
    </div>
  `;
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 1500);

  // Level check - flash if leveled up
  const oldLevel = lifeStats.level;
  const newLevel = calcLevel();
  if (newLevel > oldLevel) {
    setTimeout(() => {
      const flash = document.createElement("div");
      flash.className = "gamey-level-flash";
      document.body.appendChild(flash);
      setTimeout(() => flash.remove(), 900);
      showToast(`Level up! Level ${newLevel}`);
    }, 800);
  }
}

function renderPointsSummary() {
  const total = calcTotalPoints();
  const available = total - storeSpent;
  const dashAvail = document.getElementById("dashPtsAvail");
  const storeEarned = document.getElementById("storePtsEarned");
  const storeSpentEl = document.getElementById("storePtsSpent");
  const storeAvail = document.getElementById("storePtsAvail");
  if (dashAvail) {
    dashAvail.textContent = available;
    dashAvail.className = "points-summary-val points-val-avail" + (available < 0 ? " negative" : "");
  }
  if (storeEarned) storeEarned.textContent = total;
  if (storeSpentEl) storeSpentEl.textContent = storeSpent;
  if (storeAvail) {
    storeAvail.textContent = available;
    storeAvail.className = "points-summary-val points-val-avail" + (available < 0 ? " negative" : "");
  }
  // Labels
  document.querySelectorAll("#dashPtsAvailLabel, #storePtsAvailLabel").forEach(el => { el.textContent = t("pts_available"); });
}

/* ============ Mood Check-in ============ */
function getMoodPeriod(hour) {
  // Morning: displayed after morning has passed (12:00–20:00)
  // Afternoon: displayed after afternoon has passed (20:00–06:00)
  // Night: displayed once morning starts (06:00–12:00)
  if (hour >= 20 || hour < 6) return "afternoon";
  if (hour >= 6 && hour < 12) return "night";
  return "morning";
}

function getMoodForToday(period) {
  const today = todayISO();
  return moods.find(m => m.date === today && m.period === period);
}

function getMoodStateId(stateObj) {
  return stateObj.id || stateObj.label;
}

function getMoodStateLabel(stateObj) {
  return stateObj.label || stateObj.id;
}

function renderMoodCheckin() {
  const container = document.getElementById("dashMoodCheckin");
  if (!container) return;
  container.innerHTML = "";

  const hour = new Date().getHours();
  const period = getMoodPeriod(hour);
  const questionKey = "mood_question_" + period;
  const existing = getMoodForToday(period);

  const card = document.createElement("div");
  card.className = "mood-checkin-card";

  if (existing) {
    const stateLabel = getMoodStateLabel(moodStates.find(s => s.id === existing.state || s.label === existing.state) || { label: existing.state });
    card.innerHTML = `
      <div class="mood-checkin-answered">
        <span class="mood-answered-badge">${getMoodEmoji(existing.state)} ${stateLabel}</span>
        <span class="mood-answered-label">${t("mood_answered")}</span>
      </div>
    `;
  } else {
    const question = document.createElement("div");
    question.className = "mood-checkin-question";
    question.textContent = t(questionKey);
    card.appendChild(question);

    const statesRow = document.createElement("div");
    statesRow.className = "mood-checkin-states";
    moodStates.forEach(state => {
      const btn = document.createElement("button");
      btn.className = "mood-state-btn";
      btn.textContent = state.emoji + " " + state.label;
      btn.addEventListener("click", () => {
        moods.push({
          date: todayISO(),
          period: period,
          state: state.id || state.label,
          timestamp: new Date().toISOString(),
        });
        saveMoods();
        // Award 1 point for mood check-in
        moodPoints.push({
          date: todayISO(),
          timestamp: new Date().toISOString(),
        });
        saveMoodPoints();
        showToast(t("toast_moodPoints"));
        playPointsCelebration(1, "Mood check-in");
        renderMoodCheckin();
        renderMoodOverview();
        renderPointsSummary();
        renderLifeStats();
      });
      statesRow.appendChild(btn);
    });
    card.appendChild(statesRow);
  }

  container.appendChild(card);
}

/* ============ Mood Overview ============ */
function renderMoodOverview() {
  const container = document.getElementById("dashMoodOverview");
  if (!container) return;
  container.innerHTML = "";

  if (moods.length === 0) {
    container.innerHTML = `<div class="mood-overview"><div class="mood-overview-empty">${t("mood_noData")}</div></div>`;
    return;
  }

  const card = document.createElement("div");
  card.className = "mood-overview";

  const title = document.createElement("div");
  title.className = "mood-overview-title";
  title.textContent = t("mood_weekOverview");
  card.appendChild(title);

  // Today's periods
  const today = todayISO();
  const todayMoods = moods.filter(m => m.date === today);
  const row = document.createElement("div");
  row.className = "mood-today-row";

  MOOD_PERIODS.forEach(period => {
    const found = todayMoods.find(m => m.period === period);
    const item = document.createElement("div");
    item.className = "mood-today-period" + (found ? "" : " pending");
    const periodKey = "mood_period" + period.charAt(0).toUpperCase() + period.slice(1);
    item.innerHTML = `
      <span class="mood-period-dot"></span>
      <span class="mood-period-label">${t(periodKey)}</span>
      <span class="mood-period-state">${found ? getMoodEmoji(found.state) + " " + (moodStates.find(s => s.id === found.state || s.label === found.state)?.label || found.state) : "\u2014"}</span>
    `;
    row.appendChild(item);
  });
  card.appendChild(row);

  // Week stats — last 7 days
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekMoods = moods.filter(m => new Date(m.date) >= weekAgo);

  if (weekMoods.length > 0) {
    const section = document.createElement("div");
    section.className = "mood-week-section";

    const label = document.createElement("div");
    label.className = "mood-week-label";
    label.textContent = t("mood_mostFelt") + " / " + t("mood_leastFelt");
    section.appendChild(label);

    // Count occurrences
    const counts = {};
    weekMoods.forEach(m => { counts[m.state] = (counts[m.state] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

    const statsRow = document.createElement("div");
    statsRow.className = "mood-week-stats";

    if (sorted.length > 0) {
      const most = sorted[0];
      const least = sorted[sorted.length - 1];
      const mostLabel = moodStates.find(s => s.id === most[0] || s.label === most[0])?.label || most[0];
      const leastLabel = moodStates.find(s => s.id === least[0] || s.label === least[0])?.label || least[0];

      const mostEl = document.createElement("div");
      mostEl.className = "mood-stat-item mood-stat-most";
      mostEl.innerHTML = `
        <span class="mood-stat-emoji">${getMoodEmoji(most[0])}</span>
        <span class="mood-stat-label">${mostLabel}</span>
        <span class="mood-stat-value">${most[1]}</span>
      `;
      statsRow.appendChild(mostEl);

      if (sorted.length > 1 && least[0] !== most[0]) {
        const leastEl = document.createElement("div");
        leastEl.className = "mood-stat-item mood-stat-least";
        leastEl.innerHTML = `
          <span class="mood-stat-emoji">${getMoodEmoji(least[0])}</span>
          <span class="mood-stat-label">${leastLabel}</span>
          <span class="mood-stat-value">${least[1]}</span>
        `;
        statsRow.appendChild(leastEl);
      }
    }

    section.appendChild(statsRow);
    card.appendChild(section);
  }

  container.appendChild(card);
}

function renderDashboard() {
  const today = todayISO();
  const tomorrow = tomorrowISO();

  // Greeting based on time of day
  const hour = new Date().getHours();
  let greeting;
  if (hour >= 5 && hour < 12) greeting = t("greet_morning");
  else if (hour >= 12 && hour < 18) greeting = t("greet_afternoon");
  else if (hour >= 18 && hour < 21) greeting = t("greet_evening");
  else greeting = t("greet_night");

  const displayName = userProfile.nickname || userProfile.name || "";
  const greetingEl = document.getElementById("dashGreeting");
  greetingEl.textContent = displayName ? `${greeting}, ${displayName}` : greeting;

  // Task message
  const todayCount = entries.filter(e => e.date === today).length;
  const tomorrowCount = entries.filter(e => e.date === tomorrow).length;
  const totalTasks = todayCount + tomorrowCount;
  const taskMsgEl = document.getElementById("dashTaskMsg");
  taskMsgEl.textContent = totalTasks > 0 ? t("dash_thingsTodo") : t("dash_allClear");

  // Expected points
  const todayPts = entries.filter(e => e.date === today).reduce((s, e) => s + calcMaxPoints(e), 0);
  const tomorrowPts = entries.filter(e => e.date === tomorrow).reduce((s, e) => s + calcMaxPoints(e), 0);
  const expectedPts = todayPts + tomorrowPts;
  const ptsEl = document.getElementById("dashExpectedPts");
  ptsEl.textContent = expectedPts > 0 ? t("dash_ptsAvailable")(expectedPts) : "";

  // Mini week calendar
  const weekCal = document.getElementById("dashWeekCal");
  weekCal.innerHTML = "";
  const weekdays = t("cal_weekdays");
  const now = new Date();
  const dayOfWeek = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek);
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const dISO = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const dayDiv = document.createElement("div");
    dayDiv.className = "wc-day" + (dISO === today ? " today" : "");
    const hasEntry = entries.some(e => e.date === dISO);
    if (hasEntry) dayDiv.classList.add("has-entry");
    dayDiv.innerHTML = `<span class="wc-weekday">${weekdays[i]}</span><span class="wc-num">${d.getDate()}</span>`;
    weekCal.appendChild(dayDiv);
  }

  // Day sections
  document.getElementById("dashTitleToday").textContent = t("dash_secToday") + " \u00b7 " + formatDatePretty(today);
  document.getElementById("dashTitleTomorrow").textContent = t("dash_secTomorrow") + " \u00b7 " + formatDatePretty(tomorrow);
  document.getElementById("dashSummaryToday").textContent =
    todayCount === 0 ? t("dash_nothingToday") : t("dash_tasksToday")(todayCount) + " \u00b7 " + (todayPts > 0 ? t("dash_ptsToday")(todayPts) : "0 pts");
  document.getElementById("dashSummaryTomorrow").textContent =
    tomorrowCount === 0 ? t("dash_nothingTomorrow") : t("dash_tasksTomorrow")(tomorrowCount) + " \u00b7 " + (tomorrowPts > 0 ? t("dash_ptsTomorrow")(tomorrowPts) : "0 pts");

  // Check if we're in the Life panel
  const isLifePanel = document.getElementById("panel-life") && document.getElementById("panel-life").classList.contains("active");

  renderDayEntries(document.getElementById("dashTodayList"), today, t("dash_nothingToday"), isLifePanel);
  renderDayEntries(document.getElementById("dashTomorrowList"), tomorrow, t("dash_nothingTomorrow"), isLifePanel);

  renderSecTasks();
  renderMoodCheckin();
  renderMoodOverview();
}
