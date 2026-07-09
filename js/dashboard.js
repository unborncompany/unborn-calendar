/* ============ dashboard.js — Dashboard & Secondary Tasks ============ */

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getSecTaskPoints(task) {
  if (task.done) {
    // Completed — check if before or after the target day's end
    const dayEnd = new Date(`${task.targetDate}T23:59:59`);
    const doneAt = new Date(task.doneAt || Date.now());
    if (doneAt <= dayEnd) return 3;
    return 1;
  }
  // Not completed — check if 3+ days past target
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
          // Mark as done and remove from list
          task.done = true;
          task.doneAt = new Date().toISOString();
          saveSecTasks();
          // Animate removal
          item.style.transition = "opacity 0.3s, transform 0.3s";
          item.style.opacity = "0";
          item.style.transform = "translateX(20px)";
          setTimeout(() => {
            renderSecTasks();
            renderPointsSummary();
            renderLifeStats();
          }, 300);
        } else {
          task.done = false;
          task.doneAt = null;
          saveSecTasks();
          renderSecTasks();
          renderPointsSummary();
          renderLifeStats();
        }
      });

      const text = document.createElement("span");
      text.className = "sec-task-text";
      text.textContent = task.name;

      const status = document.createElement("span");
      status.className = "sec-task-status " + (pts > 0 ? "pos" : pts < 0 ? "neg" : "neutral");
      status.textContent = pts > 0 ? `+${pts}` : pts < 0 ? `${pts}` : t("dash_pending");

      item.appendChild(check);
      item.appendChild(text);
      item.appendChild(status);
      todayList.appendChild(item);
    });
  } else {
    todaySection.style.display = "none";
  }

  // Tomorrow's secondary tasks (with add/remove)
  const tomorrowIncomplete = tomorrowTasks.filter(t => !t.done);
  if (tomorrowIncomplete.length === 0) {
    list.innerHTML = `<div class="empty-state" style="padding:12px"><span>${t("dash_clear")}</span>${t("dash_secNoTasks")}</div>`;
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
        // Mark as done and remove from list
        task.done = true;
        task.doneAt = new Date().toISOString();
        saveSecTasks();
        // Animate removal
        item.style.transition = "opacity 0.3s, transform 0.3s";
        item.style.opacity = "0";
        item.style.transform = "translateX(20px)";
        setTimeout(() => {
          renderSecTasks();
          renderPointsSummary();
          renderLifeStats();
        }, 300);
      } else {
        task.done = false;
        task.doneAt = null;
        saveSecTasks();
        renderSecTasks();
        renderPointsSummary();
        renderLifeStats();
      }
    });

    const text = document.createElement("span");
    text.className = "sec-task-text";
    text.textContent = task.name;

    const status = document.createElement("span");
    status.className = "sec-task-status " + (pts > 0 ? "pos" : pts < 0 ? "neg" : "neutral");
    status.textContent = pts > 0 ? `+${pts}` : pts < 0 ? `${pts}` : t("dash_pending");

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
  const hour = new Date().getHours();
  const target = hour < 5 ? todayISO() : tomorrowISO();
  secTasks.push({
    id: uid(),
    name,
    targetDate: target,
    done: false,
    doneAt: null,
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
function renderDayEntries(container, dayISO, emptyMsg) {
  container.innerHTML = "";

  const dayEntries = entries
    .filter(e => e.date === dayISO)
    .map(e => ({ ...e, _status: getStatus(e) }))
    .sort((a, b) => deadlineOf(a) - deadlineOf(b));

  if (dayEntries.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:16px"><span>${t("dash_free")}</span>${emptyMsg || t("dash_nothingToday")}</div>`;
    return;
  }

  dayEntries.forEach(entry => {
    const wrap = document.createElement("div");
    wrap.className = `dash-entry-wrap status-${entry._status}`;

    const header = document.createElement("div");
    header.className = "dash-entry-header";
    const doneCount = entry.todos.filter(t => t.done).length;
    const entryPts = entry._status === "completed" ? calcEntryPoints(entry) : calcMaxPoints(entry);
    header.innerHTML = `
      <span class="dash-entry-time">${entry.time ? formatTimePretty(entry.time) : "\u2014"}</span>
      <div class="dash-entry-info">
        <div class="dash-entry-name">${escapeHTML(entry.name)}</div>
        <div class="dash-entry-progress">${doneCount}/${entry.todos.length} ${t("dash_done")}</div>
      </div>
      <span class="dash-entry-pts ${entryPts >= 0 ? "pos" : "neg"}">${entryPts >= 0 ? "+" : ""}${entryPts}</span>
      <span class="dash-entry-chevron">&#9654;</span>
    `;
    header.addEventListener("click", () => {
      wrap.classList.toggle("expanded");
    });
    wrap.appendChild(header);

    // Todos section
    const todosDiv = document.createElement("div");
    todosDiv.className = "dash-entry-todos";
    entry.todos.forEach(todo => {
      const item = document.createElement("label");
      item.className = "dash-todo-item" + (todo.done ? " done" : "");
      item.innerHTML = `<input type="checkbox" class="dash-todo-check" ${todo.done ? "checked" : ""}> <span>${escapeHTML(todo.text)}</span>`;
      item.querySelector("input").addEventListener("change", (e) => {
        todo.done = e.target.checked;
        saveEntries();
        item.classList.toggle("done", todo.done);
        // Update progress display
        const newDone = entry.todos.filter(t => t.done).length;
        header.querySelector(".dash-entry-progress").textContent = `${newDone}/${entry.todos.length} ${t("dash_done")}`;
        // Record completedAt when allDone flips true; clear it if un-completed
        const newAllDone = entry.todos.length > 0 && entry.todos.every(t => t.done);
        if (newAllDone && !entry.completedAt) {
          entry.completedAt = new Date().toISOString();
        } else if (!newAllDone) {
          entry.completedAt = null;
        }
        // Update status if needed
        const newStatus = getStatus(entry);
        wrap.className = `dash-entry-wrap status-${newStatus}` + (wrap.classList.contains("expanded") ? " expanded" : "");
        renderPointsSummary();
        renderLifeStats();
      });
      todosDiv.appendChild(item);
    });
    wrap.appendChild(todosDiv);

    container.appendChild(wrap);
  });
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

  renderDayEntries(document.getElementById("dashTodayList"), today, t("dash_nothingToday"));
  renderDayEntries(document.getElementById("dashTomorrowList"), tomorrow, t("dash_nothingTomorrow"));

  renderSecTasks();
}
