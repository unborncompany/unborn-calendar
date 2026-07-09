/* ============ calendar.js — Calendar Grid & List ============ */

document.getElementById("prevMonth").addEventListener("click", () => {
  currentCalDate.setMonth(currentCalDate.getMonth() - 1);
  renderCalendar();
});
document.getElementById("nextMonth").addEventListener("click", () => {
  currentCalDate.setMonth(currentCalDate.getMonth() + 1);
  renderCalendar();
});
document.getElementById("todayBtn").addEventListener("click", () => {
  currentCalDate = new Date();
  currentCalDate.setDate(1);
  renderCalendar();
});

function renderCalendar() {
  const grid = document.getElementById("calGrid");
  grid.innerHTML = "";

  const year = currentCalDate.getFullYear();
  const month = currentCalDate.getMonth();
  const monthNames = t("cal_months");
  document.getElementById("monthLabel").textContent = `${monthNames[month]} ${year}`;

  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const todayStr = todayISO();

  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  for (let i = 0; i < totalCells; i++) {
    let dayNum, cellMonth, cellYear, otherMonth = false;

    if (i < startOffset) {
      dayNum = daysInPrevMonth - startOffset + i + 1;
      cellMonth = month - 1; cellYear = year;
      otherMonth = true;
    } else if (i >= startOffset + daysInMonth) {
      dayNum = i - startOffset - daysInMonth + 1;
      cellMonth = month + 1; cellYear = year;
      otherMonth = true;
    } else {
      dayNum = i - startOffset + 1;
      cellMonth = month; cellYear = year;
    }

    const normDate = new Date(cellYear, cellMonth, dayNum);
    const dateStr = `${normDate.getFullYear()}-${pad(normDate.getMonth() + 1)}-${pad(normDate.getDate())}`;

    const cell = document.createElement("div");
    cell.className = "cal-cell" + (otherMonth ? " other-month" : "") + (dateStr === todayStr ? " is-today" : "");

    const dayEntries = entries.filter(e => e.date === dateStr)
      .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));

    const maxShow = 3;
    const chipsHTML = dayEntries.slice(0, maxShow).map(e => {
      const status = getStatus(e);
      return `<div class="cal-chip status-${status}" data-id="${e.id}">${escapeHTML(e.name)}</div>`;
    }).join("");
    const moreHTML = dayEntries.length > maxShow
      ? `<div class="cal-more">+${dayEntries.length - maxShow} ${t("dash_more")}</div>` : "";

    cell.innerHTML = `
      <div class="cal-cell-head">
        <span class="cal-date-num">${dayNum}</span>
        <button class="cal-add-btn" title="${t("cal_addEntry")}">+</button>
      </div>
      <div class="cal-entries">${chipsHTML}${moreHTML}</div>
    `;

    const addBtn = cell.querySelector(".cal-add-btn");
    addBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      openEntryModal(null, dateStr);
    });

    cell.addEventListener("click", (ev) => {
      const chip = ev.target.closest(".cal-chip");
      if (chip) {
        ev.stopPropagation();
        openDetailModal(chip.dataset.id);
        return;
      }
      openEntryModal(null, dateStr);
    });

    grid.appendChild(cell);
  }
}

function renderCalList() {
  const list = document.getElementById("calList");
  list.innerHTML = "";

  const year = currentCalDate.getFullYear();
  const month = currentCalDate.getMonth();
  const monthNames = t("cal_months");
  document.getElementById("monthLabel").textContent = `${monthNames[month]} ${year}`;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = todayISO();
  const weekdays = t("cal_weekdays");

  for (let d = 1; d <= daysInMonth; d++) {
    const normDate = new Date(year, month, d);
    const dateStr = `${normDate.getFullYear()}-${pad(normDate.getMonth() + 1)}-${pad(normDate.getDate())}`;
    const dayOfWeek = normDate.getDay();

    const dayEntries = entries
      .filter(e => e.date === dateStr)
      .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));

    const dayDiv = document.createElement("div");
    dayDiv.className = "cal-list-day" + (dateStr === todayStr ? " cal-list-today" : "");

    const head = document.createElement("div");
    head.className = "cal-list-head";
    head.innerHTML = `
      <span class="cal-list-weekday">${weekdays[dayOfWeek]}</span>
      <span class="cal-list-date">${d}</span>
      <span class="cal-list-count">${dayEntries.length} ${dayEntries.length !== 1 ? t("dash_more") : "entry"}</span>
      <button class="cal-list-add-btn" title="${t("cal_addEntry")}">+</button>
      <span class="cal-list-chevron">&#9654;</span>
    `;

    head.querySelector(".cal-list-add-btn").addEventListener("click", (ev) => {
      ev.stopPropagation();
      openEntryModal(null, dateStr);
    });

    head.addEventListener("click", () => {
      dayDiv.classList.toggle("expanded");
    });

    dayDiv.appendChild(head);

    const entriesDiv = document.createElement("div");
    entriesDiv.className = "cal-list-entries";

    if (dayEntries.length === 0) {
      entriesDiv.innerHTML = `<div class="cal-list-empty">${t("dash_free")} — ${t("dash_nothingToday")}</div>`;
    } else {
      dayEntries.forEach(entry => {
        const status = getStatus(entry);
        const maxPts = calcMaxPoints(entry);
        const entryPts = status === "completed" ? calcEntryPoints(entry) : maxPts;
        const row = document.createElement("div");
        row.className = "cal-list-entry";
        row.innerHTML = `
          <span class="cal-list-entry-time">${entry.time ? formatTimePretty(entry.time) : "\u2014"}</span>
          <span class="cal-list-entry-name">${escapeHTML(entry.name)}</span>
          <span class="cal-list-entry-pts ${entryPts >= 0 ? "pos" : "neg"}">${entryPts >= 0 ? "+" : ""}${entryPts}</span>
        `;
        row.addEventListener("click", () => openDetailModal(entry.id));
        entriesDiv.appendChild(row);
      });
    }

    dayDiv.appendChild(entriesDiv);
    list.appendChild(dayDiv);
  }
}
