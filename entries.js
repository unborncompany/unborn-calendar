/* ============ entries.js — Entry Add/Edit & Detail Modal ============ */

const entryModalOverlay = document.getElementById("entryModalOverlay");
const entryForm = document.getElementById("entryForm");

function getAlarmPresets() {
  return [
    { label: t("alarm_5min"), minutes: 5 },
    { label: t("alarm_15min"), minutes: 15 },
    { label: t("alarm_30min"), minutes: 30 },
    { label: t("alarm_1hour"), minutes: 60 },
    { label: t("alarm_2hours"), minutes: 120 },
    { label: t("alarm_1day"), minutes: 1440 },
    { label: t("alarm_custom"), minutes: -1 },
  ];
}

function alarmLabel(alarm) {
  if (alarm.minutes >= 0) {
    return getAlarmPresets().find(p => p.minutes === alarm.minutes)?.label || t("alarm_fallback")(alarm.minutes);
  }
  return `${t("alarm_at")} ${formatDatePretty(alarm.date)} ${formatTimePretty(alarm.time)}`;
}

function addAlarmRow(alarm) {
  const list = document.getElementById("alarmInputList");
  const row = document.createElement("div");
  row.className = "todo-input-row alarm-row";

  const isCustom = alarm && alarm.minutes === -1;
  const mins = isCustom ? -1 : (alarm?.minutes ?? 15);
  const customDate = alarm?.date || todayISO();
  const customTime = alarm?.time || "09:00";

  row.innerHTML = `
    <select class="alarm-type-input">
      ${getAlarmPresets().map(p => `<option value="${p.minutes}" ${p.minutes === mins ? "selected" : ""}>${p.label}</option>`).join("")}
    </select>
    <div class="alarm-custom-time" style="${isCustom ? "" : "display:none"}">
      <input type="date" class="alarm-custom-date" value="${customDate}">
      <input type="time" class="alarm-custom-time-input" value="${customTime}">
    </div>
    <button type="button" class="todo-remove-btn" title="${t("inv_remove")}">&times;</button>
  `;

  const typeSelect = row.querySelector(".alarm-type-input");
  const customWrap = row.querySelector(".alarm-custom-time");

  typeSelect.addEventListener("change", () => {
    customWrap.style.display = typeSelect.value === "-1" ? "" : "none";
  });

  row.querySelector(".todo-remove-btn").addEventListener("click", () => {
    if (list.children.length > 1) row.remove();
    else {
      typeSelect.value = "15";
      customWrap.style.display = "none";
    }
  });

  list.appendChild(row);
}

function openEntryModal(entryId, presetDate) {
  entryForm.reset();
  editingTodoRows = [];
  document.getElementById("todoInputList").innerHTML = "";
  document.getElementById("alarmInputList").innerHTML = "";

  if (entryId) {
    const entry = entries.find(e => e.id === entryId);
    document.getElementById("entryModalTitle").textContent = t("entry_editTitle");
    document.getElementById("entryId").value = entry.id;
    document.getElementById("entryName").value = entry.name;
    document.getElementById("entryDescription").value = entry.description || "";
    document.getElementById("entryDate").value = entry.date;
    document.getElementById("entryTime").value = entry.time || "";
    entry.todos.forEach(t => addTodoRow(t.text, t.id));
    if (entry.alarms && entry.alarms.length > 0) {
      entry.alarms.forEach(a => addAlarmRow(a));
    } else {
      addAlarmRow({ minutes: 15 });
    }
  } else {
    document.getElementById("entryModalTitle").textContent = t("entry_newTitle");
    document.getElementById("entryId").value = "";
    document.getElementById("entryDate").value = presetDate || todayISO();
    addTodoRow("");
    addAlarmRow({ minutes: 15 });
  }

  entryModalOverlay.classList.add("open");
  document.getElementById("entryName").focus();
}

function closeEntryModal() {
  entryModalOverlay.classList.remove("open");
}

document.getElementById("quickAddBtn").addEventListener("click", () => openEntryModal(null, todayISO()));
document.getElementById("entryModalClose").addEventListener("click", closeEntryModal);
document.getElementById("entryCancelBtn").addEventListener("click", closeEntryModal);
entryModalOverlay.addEventListener("click", (e) => { if (e.target === entryModalOverlay) closeEntryModal(); });

function addTodoRow(text, existingId) {
  const list = document.getElementById("todoInputList");
  const row = document.createElement("div");
  row.className = "todo-input-row";
  const tid = existingId || todoId();
  row.dataset.todoId = tid;
  row.innerHTML = `
    <input type="text" class="todo-text-input" placeholder="${t("entry_todoPlaceholder")}" value="${escapeHTML(text || "")}">
    <button type="button" class="todo-remove-btn" title="${t("inv_remove")}">&times;</button>
  `;
  row.querySelector(".todo-remove-btn").addEventListener("click", () => {
    if (list.children.length > 1) row.remove();
    else row.querySelector("input").value = "";
  });
  list.appendChild(row);
}

document.getElementById("addTodoRow").addEventListener("click", () => addTodoRow(""));
document.getElementById("addAlarmRow").addEventListener("click", () => addAlarmRow({ minutes: 15 }));

entryForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const id = document.getElementById("entryId").value;
  const name = document.getElementById("entryName").value.trim();
  const description = document.getElementById("entryDescription").value.trim();
  const date = document.getElementById("entryDate").value;
  const time = document.getElementById("entryTime").value;

  const todoRows = document.querySelectorAll("#todoInputList .todo-input-row");
  const todoTexts = [];
  todoRows.forEach(row => {
    const text = row.querySelector(".todo-text-input").value.trim();
    if (text) todoTexts.push({ text, id: row.dataset.todoId });
  });

  const alarmRows = document.querySelectorAll("#alarmInputList .alarm-row");
  const alarms = [];
  alarmRows.forEach(row => {
    const typeVal = parseInt(row.querySelector(".alarm-type-input").value, 10);
    if (typeVal >= 0) {
      alarms.push({ minutes: typeVal });
    } else {
      const d = row.querySelector(".alarm-custom-date").value;
      const t = row.querySelector(".alarm-custom-time-input").value;
      if (d && t) alarms.push({ minutes: -1, date: d, time: t });
    }
  });

  if (!name || !date) return;
  if (todoTexts.length === 0) {
    showToast(t("toast_addTodo"));
    return;
  }

  if (id) {
    const entry = entries.find(en => en.id === id);
    const oldTodos = entry.todos;
    entry.name = name;
    entry.description = description;
    entry.date = date;
    entry.time = time;
    entry.alarms = alarms;
    entry.todos = todoTexts.map(({ text, id: todoRowId }) => {
      const existing = oldTodos.find(t => t.id === todoRowId);
      return {
        id: todoRowId,
        text,
        done: existing ? existing.done : false,
      };
    });
    editPenalties.push({ entryId: entry.id, name: entry.name, editedAt: new Date().toISOString() });
    saveEditPenalties();
    showToast(t("toast_entryUpdated"));
  } else {
    entries.push({
      id: uid(),
      name, description, date, time, alarms,
      todos: todoTexts.map(({ text, id: todoRowId }) => ({
        id: todoRowId,
        text,
        done: false,
      })),
    });
    showToast(t("toast_entryAdded"));
  }

  saveEntries();
  closeEntryModal();
  refreshAll();
});

/* ============ Detail Modal ============ */
const detailModalOverlay = document.getElementById("detailModalOverlay");
let currentDetailId = null;

function openDetailModal(entryId) {
  const entry = entries.find(e => e.id === entryId);
  if (!entry) return;
  currentDetailId = entryId;

  const status = getStatus(entry);
  const statusText = status === "completed" ? t("detail_completed") : status === "past-due" ? t("detail_pastDue") : t("detail_active");
  document.getElementById("detailName").textContent = entry.name;
  document.getElementById("detailStatus").textContent = statusText;
  document.getElementById("detailStatus").className = `status-badge status-${status}`;
  document.getElementById("detailDateTime").textContent =
    formatDatePretty(entry.date) + (entry.time ? ` \u00b7 ${formatTimePretty(entry.time)}` : "");
  document.getElementById("detailDescription").textContent = entry.description || "";
  document.getElementById("detailDescription").style.display = entry.description ? "block" : "none";

  const todosWrap = document.getElementById("detailTodos");
  todosWrap.innerHTML = "";
  entry.todos.forEach((todo) => {
    const item = document.createElement("label");
    item.className = "detail-todo-item" + (todo.done ? " done" : "");
    item.innerHTML = `<input type="checkbox" ${todo.done ? "checked" : ""}> <span>${escapeHTML(todo.text)}</span>`;
    item.querySelector("input").addEventListener("change", (e) => {
      todo.done = e.target.checked;
      saveEntries();
      openDetailModal(entryId);
      refreshAll();
    });
    todosWrap.appendChild(item);
  });

  // Alarms — editable
  const alarmSection = document.getElementById("detailAlarms");
  alarmSection.innerHTML = "";
  if (entry.alarms && entry.alarms.length > 0) {
    const label = document.createElement("div");
    label.className = "detail-alarms-label";
    label.textContent = t("entry_alarmsLabel");
    alarmSection.appendChild(label);

    const chipList = document.createElement("div");
    chipList.className = "detail-alarm-list";
    entry.alarms.forEach((a, idx) => {
      const chip = document.createElement("span");
      chip.className = "detail-alarm-chip";
      chip.innerHTML = `${escapeHTML(alarmLabel(a))} <button class="detail-alarm-remove" title="${t("inv_remove")}">&times;</button>`;
      chip.querySelector(".detail-alarm-remove").addEventListener("click", (ev) => {
        ev.stopPropagation();
        entry.alarms.splice(idx, 1);
        if (entry.alarms.length === 0) delete entry.alarms;
        saveEntries();
        openDetailModal(entryId);
        refreshAll();
      });
      chipList.appendChild(chip);
    });
    alarmSection.appendChild(chipList);
  }

  // Add alarm button in detail view
  const addAlarmBtn = document.createElement("button");
  addAlarmBtn.className = "btn btn-ghost btn-small";
  addAlarmBtn.style.marginTop = "8px";
  addAlarmBtn.textContent = t("entry_addAlarm");
  addAlarmBtn.addEventListener("click", () => {
    if (!entry.alarms) entry.alarms = [];
    entry.alarms.push({ minutes: 15 });
    saveEntries();
    openDetailModal(entryId);
    refreshAll();
  });
  alarmSection.appendChild(addAlarmBtn);

  detailModalOverlay.classList.add("open");
}

function closeDetailModal() {
  detailModalOverlay.classList.remove("open");
  currentDetailId = null;
}

document.getElementById("detailModalClose").addEventListener("click", closeDetailModal);
document.getElementById("detailCloseBtn").addEventListener("click", closeDetailModal);
detailModalOverlay.addEventListener("click", (e) => { if (e.target === detailModalOverlay) closeDetailModal(); });

document.getElementById("detailEditBtn").addEventListener("click", () => {
  const id = currentDetailId;
  closeDetailModal();
  openEntryModal(id);
});

document.getElementById("detailDeleteBtn").addEventListener("click", () => {
  if (!currentDetailId) return;
  if (!confirm(t("confirm_deleteEntry"))) return;
  const deletedEntry = entries.find(e => e.id === currentDetailId);
  deletePenalties.push({ entryId: currentDetailId, name: deletedEntry ? deletedEntry.name : "unknown", deletedAt: new Date().toISOString() });
  saveDeletePenalties();
  entries = entries.filter(e => e.id !== currentDetailId);
  saveEntries();
  closeDetailModal();
  refreshAll();
    showToast(t("toast_deleted"));
});
