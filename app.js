let students = [];
        let disenrolled = [];
        let editingIndex = -1;
        let payingIndex = -1;
        let vocabFilter = 'All'; // 'All' | 'Verb' | 'Adjective' | 'Adverb' | 'Other' — resets when switching students
        let sortKey = null;   // null | 'status' | 'next'
        let sortDir = 1;      // 1 = ascending, -1 = descending
        const STORAGE_KEY = 'englishStudents_v2';
        let exchangeRate = 950; // default CLP per USD
        let defaultCurrency = 'USD'; // 'USD' or 'CLP' // default CLP per USD
        let yearlyGoal = 5000;
        let privacyMode = false; // when true, monetary values render as '****'
        let darkMode = false;
        let hideWeekends = false;
        let hideWeekendsBooking = false;   // controls weekends on public booking page

        // ---------- Booking page availability settings ----------
        // A recurring weekly template of which half-hour blocks are open for
        // student booking requests, independent of which slots are already
        // taken by scheduled lessons. Lets you block out blocks that are
        // unavailable for unrelated reasons (another job, gym, etc).
        // Shape: { "0": {"08:00": true, "08:30": false, ...}, "1": {...}, ... }
        // where 0=Monday..6=Sunday (matching DAY_NAMES_SHORT ordering used
        // elsewhere). A day/time missing from this object defaults to OPEN —
        // that keeps old installs (which never had this setting) working
        // exactly as before, fully open, with no migration needed.
        let bookingWeeklyAvailability = {};
        let bookingMorningStart = '08:00';
        let bookingMorningEnd = '13:00';
        let bookingAfternoonStart = '13:00';
        let bookingAfternoonEnd = '20:30';

        // Mirrors the fixed booking window in booking.js (8:00 AM–8:30 PM, half-hour
        // blocks) so the Settings grid lines up exactly with what the booking page offers.
        const BOOKING_START_HOUR = 8;
        const BOOKING_LAST_START_HOUR = 20;
        const BOOKING_LAST_START_MIN = 30;
        const BOOKING_DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

        function buildBookingSlotTimes() {
            const times = [];
            let h = BOOKING_START_HOUR, m = 0;
            while (h < BOOKING_LAST_START_HOUR || (h === BOOKING_LAST_START_HOUR && m <= BOOKING_LAST_START_MIN)) {
                times.push(String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'));
                m += 30;
                if (m >= 60) { m = 0; h += 1; }
            }
            return times;
        }
        const BOOKING_SLOT_TIMES = buildBookingSlotTimes();

        function formatBookingTimeLabel(t) {
            const [h, m] = t.split(':').map(Number);
            const ampm = h >= 12 ? 'PM' : 'AM';
            let h12 = h % 12;
            if (h12 === 0) h12 = 12;
            return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
        }

        function isBookingSlotOpen(dayIdx, timeStr) {
            const dayMap = bookingWeeklyAvailability[dayIdx];
            if (!dayMap || !(timeStr in dayMap)) return true; // not explicitly set — default open
            return !!dayMap[timeStr];
        }

        function setBookingSlotOpen(dayIdx, timeStr, open) {
            if (!bookingWeeklyAvailability[dayIdx]) bookingWeeklyAvailability[dayIdx] = {};
            bookingWeeklyAvailability[dayIdx][timeStr] = open;
        }

        function renderBookingHoursGrid() {
            const wrap = document.getElementById('bookingHoursGrid');
            if (!wrap) return;
            const dayCount = hideWeekendsBooking ? 5 : 7;
            const rowCols = '70px repeat(' + dayCount + ', 34px)';
            let html = '<div class="booking-hours-table">';
            html += '<div class="bh-row bh-header" style="grid-template-columns:' + rowCols + '"><div class="bh-time-label"></div>' +
                BOOKING_DAY_NAMES.slice(0, dayCount).map(d => `<div class="bh-day-label">${d}</div>`).join('') + '</div>';
            BOOKING_SLOT_TIMES.forEach(t => {
                const isHour = t.endsWith(':00');
                html += `<div class="bh-row${isHour ? ' bh-hour' : ''}" style="grid-template-columns:${rowCols}"><div class="bh-time-label">${isHour ? formatBookingTimeLabel(t) : ''}</div>`;
                for (let d = 0; d < dayCount; d++) {
                    const open = isBookingSlotOpen(d, t);
                    html += `<div class="bh-cell${open ? ' open' : ' closed'}" onclick="toggleBookingHourCell(${d}, '${t}')" title="${BOOKING_DAY_NAMES[d]} ${formatBookingTimeLabel(t)} — ${open ? 'open for booking' : 'blocked'}"></div>`;
                }
                html += '</div>';
            });
            html += '</div>';
            wrap.innerHTML = html;
        }

        window.toggleBookingHourCell = function(dayIdx, timeStr) {
            setBookingSlotOpen(dayIdx, timeStr, !isBookingSlotOpen(dayIdx, timeStr));
            saveToLocalStorage();
            renderBookingHoursGrid();
        };

        window.setAllBookingHours = function(open) {
            for (let d = 0; d < 7; d++) {
                BOOKING_SLOT_TIMES.forEach(t => setBookingSlotOpen(d, t, open));
            }
            saveToLocalStorage();
            renderBookingHoursGrid();
        };
        

        window.sortBy = function(key) {
            if (sortKey === key) {
                sortDir *= -1;
            } else {
                sortKey = key;
                sortDir = 1;
            }
            renderTable();
        };

        function todayStr() { return new Date().toISOString().split('T')[0]; }

        // Simple unique id for vocabulary entries — good enough for a single-user,
        // local-only app; doesn't need to be cryptographically unique.
        function makeVocabId() {
            return 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
        }

        const MONTH_NAMES = ["January","February","March","April","May","June",
                              "July","August","September","October","November","December"];

        // Formats a plain "YYYY-MM-DD" string as "June 20, 2026" without any
        // timezone conversion (parsing it as a Date object can shift the day
        // depending on the browser's local timezone).
        function formatDate(dateStr) {
            if (!dateStr) return '-';
            const parts = dateStr.split('-');
            if (parts.length !== 3) return dateStr;
            const [y, m, d] = parts.map(p => parseInt(p, 10));
            if (!y || !m || !d) return dateStr;
            return `${MONTH_NAMES[m - 1]} ${d}, ${y}`;
        }

        // Formats "HH:MM" (24-hour, from <input type="time">) as "5:30 PM"
        function formatTime(timeStr) {
            if (!timeStr) return '';
            const [hh, mm] = timeStr.split(':').map(p => parseInt(p, 10));
            if (isNaN(hh) || isNaN(mm)) return '';
            const ampm = hh >= 12 ? 'PM' : 'AM';
            let h12 = hh % 12;
            if (h12 === 0) h12 = 12;
            return `${h12}:${String(mm).padStart(2, '0')} ${ampm}`;
        }

        // ---------- Calendar view ----------
        const today = new Date();
        let calMonth = today.getMonth();
        let calYear = today.getFullYear();
        let calendarStyle = window.innerWidth <= 768 ? 'list' : 'grid';

        window.switchView = function(view) {
            document.getElementById('dashboardView').style.display = view === 'dashboard' ? 'block' : 'none';
            document.getElementById('listView').style.display = view === 'list' ? 'block' : 'none';
            document.getElementById('calendarView').style.display = view === 'calendar' ? 'block' : 'none';
            document.getElementById('progressView').style.display = view === 'progress' ? 'block' : 'none';
            document.getElementById('graphView').style.display = view === 'graph' ? 'block' : 'none';
            document.getElementById('settingsView').style.display = view === 'settings' ? 'block' : 'none';
            document.getElementById('whiteboardView').style.display = view === 'whiteboard' ? 'block' : 'none';
            document.getElementById('tabDashboardBtn').classList.toggle('active', view === 'dashboard');
            document.getElementById('tabListBtn').classList.toggle('active', view === 'list');
            document.getElementById('tabCalendarBtn').classList.toggle('active', view === 'calendar');
            document.getElementById('tabProgressBtn').classList.toggle('active', view === 'progress');
            document.getElementById('tabGraphBtn').classList.toggle('active', view === 'graph');
            document.getElementById('tabSettingsBtn').classList.toggle('active', view === 'settings');
            document.getElementById('tabWhiteboardBtn').classList.toggle('active', view === 'whiteboard');
            if (view === 'dashboard') { renderDashboard(); if (typeof renderPendingBookingRequests === 'function') renderPendingBookingRequests(); }
            if (view === 'calendar') renderCalendar();
            if (view === 'progress') renderProgressView();
            if (view === 'graph') renderGraph();
            if (view === 'settings') renderColumnSettings();
            if (view === 'whiteboard') initWhiteboard();
        };

        window.changeCalendarMonth = function(delta) {
            calMonth += delta;
            if (calMonth < 0) { calMonth = 11; calYear--; }
            if (calMonth > 11) { calMonth = 0; calYear++; }
            renderCalendar();
        };

        window.goToCurrentMonth = function() {
            calMonth = today.getMonth();
            calYear = today.getFullYear();
            renderCalendar();
        };

        function buildEventsByDate() {
            const map = {};
            const addEvent = (date, event) => {
                if (!date) return;
                if (!map[date]) map[date] = [];
                map[date].push(event);
            };

            const addForBucket = (list, bucket) => {
                list.forEach((student, idx) => {
                    const historyTag = bucket === 'history' ? ' (History)' : '';
                    (student.lessonHistory || []).forEach((entry, lIndex) => {
                        addEvent(entry.date, {
                            type: 'lesson', bucket, idx, lIndex,
                            label: `📚 ${student.name} (${entry.hours}h)${historyTag}`
                        });
                    });
                    (student.paymentHistory || []).forEach((p, pIndex) => {
                        const type = p.status === 'pending' ? 'payment-pending' : 'payment-received';
                        const icon = p.status === 'pending' ? '⏳' : '💰';
                        addEvent(p.date, {
                            type, bucket, idx, pIndex,
                            label: `${icon} ${student.name} ${formatMoneySimple(p.amount)}${historyTag}`
                        });
                    });
                    // "Scheduled" lessons only make sense for currently-active students.
                    if (bucket === 'active' && Array.isArray(student.scheduledLessons)) {
                        student.scheduledLessons.forEach((sl, slIndex) => {
                            if (!sl || !sl.date) return;
                            const timeSuffix = sl.time ? ` ${formatTime(sl.time)}` : '';
                            addEvent(sl.date, {
                                type: 'scheduled', bucket, idx, slIndex,
                                label: `🗓️ ${student.name}${timeSuffix}`
                            });
                        });
                    }
                });
            };

            addForBucket(students, 'active');
            addForBucket(disenrolled, 'history');

            return map;
        }

        // Progress-log entries are intentionally NOT part of buildEventsByDate —
        // they never appear as calendar chips. They're only surfaced inside the
        // Day Details popup, gathered here on demand for a specific date.
        function gatherProgressEntriesForDate(dateStr) {
            const results = [];
            const addForBucket = (list, bucket) => {
                list.forEach((student, idx) => {
                    (student.progressEntries || []).forEach((entry, pgIndex) => {
                        if (entry.date === dateStr) {
                            results.push({ type: 'progress', bucket, idx, pgIndex, text: entry.text, attachments: entry.attachments });
                        }
                    });
                });
            };
            addForBucket(students, 'active');
            addForBucket(disenrolled, 'history');
            return results;
        }

        let expandedCalDate = null;

        function renderCalendar() {
            document.getElementById('calendarMonthLabel').textContent = `${MONTH_NAMES[calMonth]} ${calYear}`;
            const legend = document.querySelector('.calendar-legend');
            if (legend) legend.style.display = calendarStyle === 'list' ? 'none' : '';

            if (calendarStyle === 'list') {
                renderCalendarList();
            } else {
                renderCalendarGrid();
            }
        }

        function renderCalendarGrid() {
            const grid = document.getElementById('calendarGrid');
            grid.innerHTML = '';
            grid.className = 'calendar-grid';
            grid.style.cssText = '';
            document.getElementById('calendarWeekdays').style.display = '';

            const eventsByDate = buildEventsByDate();
            const firstOfMonth = new Date(calYear, calMonth, 1);
            const startWeekday = (firstOfMonth.getDay() + 6) % 7; // 0=Mon..6=Sun
            const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
            const daysInPrevMonth = new Date(calYear, calMonth, 0).getDate();

            const todayStrVal = todayStr();
            const cellDates = [];

            for (let i = startWeekday - 1; i >= 0; i--) {
                const d = daysInPrevMonth - i;
                const m = calMonth === 0 ? 11 : calMonth - 1;
                const y = calMonth === 0 ? calYear - 1 : calYear;
                cellDates.push({ day: d, month: m, year: y, otherMonth: true });
            }
            for (let d = 1; d <= daysInMonth; d++) {
                cellDates.push({ day: d, month: calMonth, year: calYear, otherMonth: false });
            }
            let trail = 1;
            while (cellDates.length % 7 !== 0) {
                const m = calMonth === 11 ? 0 : calMonth + 1;
                const y = calMonth === 11 ? calYear + 1 : calYear;
                cellDates.push({ day: trail++, month: m, year: y, otherMonth: true });
            }

            // Hide weekends: filter out Sat/Sun and switch to 5-column grid
            if (hideWeekends) {
                const filtered = cellDates.filter(function(_, i) { return (i % 7) < 5; });
                cellDates.length = 0;
                cellDates.push.apply(cellDates, filtered);
                var nextM = calMonth === 11 ? 0 : calMonth + 1;
                var nextY = calMonth === 11 ? calYear + 1 : calYear;
                var trailDay = 1;
                while (cellDates.length % 5 !== 0) {
                    cellDates.push({ day: trailDay++, month: nextM, year: nextY, otherMonth: true });
                }
                grid.style.gridTemplateColumns = 'repeat(5, 1fr)';
            }

            updateWeekdayHeaders();

            cellDates.forEach(function(cell) {
                var dateStr = cell.year + '-' + String(cell.month + 1).padStart(2, '0') + '-' + String(cell.day).padStart(2, '0');
                var el = document.createElement('div');
                el.className = 'calendar-daycell' + (cell.otherMonth ? ' other-month' : '') + (dateStr === todayStrVal ? ' today' : '');

                var events = eventsByDate[dateStr] || [];
                var maxShown = 3;
                var shown = events.slice(0, maxShown);
                var extra = events.length - shown.length;

                var eventsHtml = shown
                    .map(function(ev) { return '<div class="cal-event ' + ev.type + (ev.bucket === 'history' ? ' history' : '') + '" onclick="showDayDetails(\'' + dateStr + '\')" title="' + ev.label + '">' + ev.label + '</div>'; })
                    .join('');
                var moreHtml = extra > 0
                    ? '<button class="cal-more" onclick="showDayDetails(\'' + dateStr + '\')">+' + extra + ' more</button>'
                    : '';

                el.innerHTML =
                    '<div class="cal-date-row">' +
                        '<div class="cal-date-num">' + cell.day + '</div>' +
                        '<button class="cal-add-btn" onclick="openDayEntryModal(\'' + dateStr + '\')" title="Add a lesson or payment for this day">+</button>' +
                    '</div>' +
                    '<div class="cal-events">' + eventsHtml + moreHtml + '</div>';
                grid.appendChild(el);
            });
        }

        function renderCalendarList() {
            const grid = document.getElementById('calendarGrid');
            grid.innerHTML = '';
            grid.className = 'cal-list';
            grid.style.cssText = '';
            document.getElementById('calendarWeekdays').style.display = 'none';

            const eventsByDate = buildEventsByDate();
            const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
            const todayStrVal = todayStr();
            const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

            for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const dateObj = new Date(calYear, calMonth, d);
                const dayOfWeek = (dateObj.getDay() + 6) % 7; // 0=Mon..6=Sun
                if (hideWeekends && dayOfWeek >= 5) continue;
                const events = eventsByDate[dateStr] || [];
                const dayName = DAY_NAMES[dayOfWeek];
                const isToday = dateStr === todayStrVal;
                const isExpanded = expandedCalDate === dateStr;

                const dayEl = document.createElement('div');
                dayEl.className = 'cal-list-day' + (isToday ? ' today' : '') + (events.length > 0 ? ' has-events' : '');

                const headerHtml = `
                    <div class="cal-list-header" onclick="toggleCalDay('${dateStr}')">
                        <div class="cal-list-date">
                            <span class="cal-list-arrow${isExpanded ? ' open' : ''}">▶</span>
                            <strong>${dayName}, ${MONTH_NAMES[calMonth]} ${d}</strong>
                            ${isToday ? '<span class="cal-list-today-badge">Today</span>' : ''}
                        </div>
                        <div class="cal-list-actions">
                            ${events.length > 0 ? `<span class="cal-list-count">${events.length} event${events.length > 1 ? 's' : ''}</span>` : ''}
                            <button class="cal-add-btn" onclick="event.stopPropagation(); openDayEntryModal('${dateStr}')" title="Add entry">+</button>
                        </div>
                    </div>
                `;

                let eventsHtml = '';
                if (isExpanded && events.length > 0) {
                    eventsHtml = `<div class="cal-list-events">` +
                        events.map(ev => `<div class="cal-event ${ev.type}${ev.bucket === 'history' ? ' history' : ''}" onclick="showDayDetails('${dateStr}')" title="${ev.label}">${ev.label}</div>`).join('') +
                        `</div>`;
                } else if (isExpanded && events.length === 0) {
                    eventsHtml = `<div class="cal-list-events"><p class="cal-list-empty">No entries for this day.</p></div>`;
                }

                dayEl.innerHTML = headerHtml + eventsHtml;
                grid.appendChild(dayEl);
            }
        }

        window.toggleCalDay = function(dateStr) {
            expandedCalDate = expandedCalDate === dateStr ? null : dateStr;
            renderCalendar();
        };

        let currentDayDetailsDate = null;
        let currentDayEvents = [];

        window.showDayDetails = function(dateStr) {
            currentDayDetailsDate = dateStr;
            const eventsByDate = buildEventsByDate();
            const events = eventsByDate[dateStr] || [];
            const progressEvents = gatherProgressEntriesForDate(dateStr);
            currentDayEvents = events.concat(progressEvents);
            document.getElementById('dayDetailsTitle').textContent = formatDate(dateStr);

            const list = document.getElementById('dayDetailsList');
            if (currentDayEvents.length === 0) {
                list.innerHTML = '<p style="color:#94a3b8;">Nothing on this day.</p>';
            } else {
                list.innerHTML = currentDayEvents.map((ev, i) => {
                    if (ev.type === 'progress') {
                        const srcList = ev.bucket === 'history' ? disenrolled : students;
                        const student = srcList[ev.idx];
                        const name = student ? student.name : 'Unknown student';
                        return `
                            <div class="day-details-event progress-entry">
                                <div>
                                    <strong>📝 ${name} — Progress Note</strong>
                                    <div class="day-details-progress-text">${(ev.text || '').replace(/\n/g, '<br>')}</div>
                                    ${renderAttachmentsHtml(ev.attachments)}
                                </div>
                                <span class="history-actions">
                                    <button class="btn btn-small btn-outline" onclick="closeDayDetailsModal(); switchView('progress'); openProgressIndex=${ev.idx}; renderProgressView();">View in Progress</button>
                                    <button class="btn btn-small btn-delete" onclick="removeCalendarEvent(${i})">Remove</button>
                                </span>
                            </div>
                        `;
                    }
                    const viewLabel = ev.bucket === 'history' ? 'View in History' : 'View Student';
                    const viewAction = ev.bucket === 'history'
                        ? `closeDayDetailsModal(); showHistoryModal();`
                        : `closeDayDetailsModal(); editStudent(${ev.idx});`;
                    const scheduledBtn = ev.type === 'scheduled'
                        ? `<button class="btn btn-small btn-payment" onclick="markScheduledDone(${i})">✓ Mark Done</button>`
                        : '';
                    const editPaymentBtn = (ev.type === 'payment-received' || ev.type === 'payment-pending')
                        ? `<button class="btn btn-small btn-outline" onclick="openPaymentEditModal(${i})">✏️ Edit</button>`
                        : '';
                    const attachHtml = (ev.type === 'payment-received' || ev.type === 'payment-pending') && ev.pIndex !== undefined
                        ? renderAttachmentsHtml(((ev.bucket === 'history' ? disenrolled[ev.idx] : students[ev.idx]) || {}).paymentHistory?.[ev.pIndex]?.attachments)
                        : '';
                    return `
                        <div class="day-details-event">
                            <span>${ev.label}${attachHtml}</span>
                            <span class="history-actions">
                                ${editPaymentBtn}
                                ${scheduledBtn}
                                <button class="btn btn-small btn-outline" onclick="${viewAction}">${viewLabel}</button>
                                <button class="btn btn-small btn-delete" onclick="removeCalendarEvent(${i})">Remove</button>
                            </span>
                        </div>
                    `;
                }).join('');
            }
            document.getElementById('dayDetailsModal').style.display = 'flex';
        };

        window.removeCalendarEvent = function(i) {
            const ev = currentDayEvents[i];
            if (!ev) return;
            const list = ev.bucket === 'history' ? disenrolled : students;
            const student = list[ev.idx];
            if (!student) return;

            if (ev.type === 'lesson') {
                if (!confirm(`Remove this lesson entry for ${student.name}? This gives back 1 lesson to their remaining balance.`)) return;
                student.lessonHistory.splice(ev.lIndex, 1);
                student.remaining = (student.remaining || 0) + 1;
                // Recompute "last lesson" from whatever's left, since the removed
                // entry may have been the most recent one on record.
                const remainingDates = (student.lessonHistory || []).map(e => e.date).filter(Boolean).sort();
                student.lastLesson = remainingDates.length ? remainingDates[remainingDates.length - 1] : '';
                if (student.status === 'Contact Student' && student.remaining > 0) {
                    student.status = 'Active';
                }
            } else if (ev.type === 'progress') {
                if (!confirm(`Remove this progress note for ${student.name}?`)) return;
                student.progressEntries.splice(ev.pgIndex, 1);
            } else if (ev.type === 'payment-received' || ev.type === 'payment-pending') {
                const payment = student.paymentHistory[ev.pIndex];
                if (!payment) return;
                if (!confirm(`Remove this payment entry for ${student.name}? This subtracts ${payment.lessons} lesson(s) and $${Math.round(payment.amount)} from their totals.`)) return;
                student.paymentHistory.splice(ev.pIndex, 1);
                student.paid = Math.max(0, (student.paid || 0) - (payment.lessons || 0));
                student.remaining = Math.max(0, (student.remaining || 0) - (payment.lessons || 0));
            } else if (ev.type === 'scheduled') {
                if (!confirm(`Remove this scheduled class for ${student.name}?`)) return;
                if (Array.isArray(student.scheduledLessons)) {
                    student.scheduledLessons.splice(ev.slIndex, 1);
                }
            }

            saveToLocalStorage();
            if (ev.type === 'scheduled') publishAvailabilityNow();
            renderTable();
            renderCalendar();
            renderProgressView();
            renderDashboard();
            showDayDetails(currentDayDetailsDate); // refresh the modal in place
        };

        // Mark a scheduled lesson as done: logs it as a lesson and clears the scheduled date
        window.markScheduledDone = function(eventIndex) {
            const ev = currentDayEvents[eventIndex];
            if (!ev || ev.type !== 'scheduled') return;
            const list = ev.bucket === 'history' ? disenrolled : students;
            const student = list[ev.idx];
            if (!student) return;

            const date = currentDayDetailsDate;
            const hours = 1;

            if ((student.remaining || 0) < hours) {
                if (!confirm(`${student.name} has no remaining lessons. Add 1 paid lesson automatically to cover this?`)) return;
                const deficit = hours - (student.remaining || 0);
                student.paid = (student.paid || 0) + deficit;
                student.remaining = (student.remaining || 0) + deficit;
            }

            student.remaining -= hours;
            if (!student.lastLesson || date >= student.lastLesson) {
                student.lastLesson = date;
            }
            student.lessonHistory.push({ date, hours });

            if (Array.isArray(student.scheduledLessons)) {
                student.scheduledLessons.splice(ev.slIndex, 1);
            }

            if (student.remaining <= 0 && student.status !== 'Paused') {
                student.status = 'Contact Student';
            }

            saveToLocalStorage();
            publishAvailabilityNow();
            renderTable();
            renderCalendar();
            renderProgressView();
            renderDashboard();
            showDayDetails(currentDayDetailsDate);
        };

        window.closeDayDetailsModal = function() {
            document.getElementById('dayDetailsModal').style.display = 'none';
        };

        window.openDayEntryModalFromDetails = function() {
            if (!currentDayDetailsDate) return;
            currentEditPaymentRef = null;
            openDayEntryModal(currentDayDetailsDate);
        };

        // ---------- Add Day Entry (lesson or payment, from the calendar) ----------
        let dayEntryDate = null;
        let currentEditPaymentRef = null; // { bucket, idx, pIndex } when editing an existing payment

        window.openDayEntryModal = function(dateStr) {
            if (students.length === 0) {
                alert('Add a student first from the Students tab, then you can log lessons and payments for them here.');
                return;
            }
            dayEntryDate = dateStr;
            currentEditPaymentRef = null;
            document.getElementById('dayEntryDateLabel').textContent = formatDate(dateStr);

            const sel = document.getElementById('dayEntryStudent');
            sel.innerHTML = students.map((s, i) => `<option value="${i}">${s.name}</option>`).join('');

            document.querySelector('input[name="dayEntryType"][value="lesson"]').checked = true;
            document.getElementById('dayEntryHours').value = 1;
            document.getElementById('dayEntryLessons').value = 4;
            document.querySelector('input[name="dayEntryPaymentStatus"][value="received"]').checked = true;
            updateDayEntryAmount();
            toggleDayEntryFields();

            // Show schedule checkbox only for future dates
            const isFuture = dateStr > todayStr();
            const scheduleRow = document.getElementById('dayEntryScheduleRow');
            const scheduleCheck = document.getElementById('dayEntryScheduleCheck');
            if (scheduleRow) scheduleRow.style.display = isFuture ? 'block' : 'none';
            if (scheduleCheck) scheduleCheck.checked = false;

            // Reset file attachment area
            const fileInput = document.getElementById('dayEntryFiles');
            if (fileInput) { fileInput.value = ''; updateDayEntryAttachList(); }
            const attachContainer = document.getElementById('dayEntryExistingAttachments');
            if (attachContainer) attachContainer.innerHTML = '';

            document.getElementById('dayEntryModal').style.display = 'flex';
        };

        window.toggleDayEntryFields = function() {
            const type = document.querySelector('input[name="dayEntryType"]:checked').value;
            document.getElementById('dayEntryLessonFields').style.display = type === 'lesson' ? 'block' : 'none';
            document.getElementById('dayEntryPaymentFields').style.display = type === 'payment' ? 'block' : 'none';
        };

        function updateDayEntryAmount() {
            const idx = parseInt(document.getElementById('dayEntryStudent').value, 10);
            const s = students[idx];
            if (!s) return;
            const lessons = parseFloat(document.getElementById('dayEntryLessons').value) || 0;
            document.getElementById('dayEntryAmount').value = lessons * (s.rate || 15);
        }

        window.closeDayEntryModal = function() {
            document.getElementById('dayEntryModal').style.display = 'none';
            document.getElementById('dayEntryStudent').disabled = false;
            dayEntryDate = null;
            currentEditPaymentRef = null;
        };

        window.openPaymentEditModal = function(eventIndex) {
            const ev = currentDayEvents[eventIndex];
            if (!ev || (ev.type !== 'payment-received' && ev.type !== 'payment-pending')) return;
            const list = ev.bucket === 'history' ? disenrolled : students;
            const student = list[ev.idx];
            const payment = student?.paymentHistory?.[ev.pIndex];
            if (!student || !payment) return;

            currentEditPaymentRef = { bucket: ev.bucket, idx: ev.idx, pIndex: ev.pIndex };

            dayEntryDate = currentDayDetailsDate;
            document.getElementById('dayEntryDateLabel').textContent = formatDate(dayEntryDate);

            // Show the student name but don't allow changing it during edit
            const sel = document.getElementById('dayEntryStudent');
            sel.innerHTML = `<option value="${ev.idx}">${student.name}${ev.bucket === 'history' ? ' (History)' : ''}</option>`;
            sel.disabled = true;

            document.querySelector('input[name="dayEntryType"][value="payment"]').checked = true;
            document.getElementById('dayEntryLessons').value = payment.lessons || 4;
            document.getElementById('dayEntryAmount').value = payment.amount || 0;
            if (payment.status === 'pending') {
                document.querySelector('input[name="dayEntryPaymentStatus"][value="pending"]').checked = true;
            } else {
                document.querySelector('input[name="dayEntryPaymentStatus"][value="received"]').checked = true;
            }
            toggleDayEntryFields();

            // Show existing attachments
            const attachContainer = document.getElementById('dayEntryExistingAttachments');
            if (attachContainer) {
                attachContainer.innerHTML = renderAttachmentsHtml(payment.attachments);
            }
            const fileInput = document.getElementById('dayEntryFiles');
            if (fileInput) { fileInput.value = ''; updateDayEntryAttachList(); }

            document.getElementById('dayEntryModal').style.display = 'flex';
        };

        window.updateDayEntryAttachList = function() {
            const input = document.getElementById('dayEntryFiles');
            const list = document.getElementById('dayEntrySelectedFiles');
            if (!input || !list) return;
            const files = Array.from(input.files);
            if (files.length === 0) { list.innerHTML = ''; return; }
            list.innerHTML = files.map(f =>
                `<span class="selected-file-chip">${f.name}<span class="file-size">${formatFileSize(f.size)}</span></span>`
            ).join('');
            const totalBytes = files.reduce((s, f) => s + f.size, 0);
            const warn = document.getElementById('dayEntryStorageWarning');
            if (warn) {
                warn.style.display = totalBytes > 2 * 1024 * 1024 ? 'block' : 'none';
            }
        };

        window.confirmDayEntry = async function() {
            const editRef = currentEditPaymentRef;
            currentEditPaymentRef = null;
            let student;
            if (editRef) {
                const list = editRef.bucket === 'history' ? disenrolled : students;
                student = list[editRef.idx];
            } else {
                const idx = parseInt(document.getElementById('dayEntryStudent').value, 10);
                student = students[idx];
            }
            if (!student || !dayEntryDate) return;
            const type = document.querySelector('input[name="dayEntryType"]:checked').value;

            if (type === 'lesson') {
                const hours = Math.max(0.5, parseFloat(document.getElementById('dayEntryHours').value) || 1);
                const scheduleCheck = document.getElementById('dayEntryScheduleCheck');
                const isScheduled = scheduleCheck && scheduleCheck.checked;

                if (isScheduled) {
                    // Schedule for later — add to scheduledLessons without deducting balance
                    if (!Array.isArray(student.scheduledLessons)) student.scheduledLessons = [];
                    const timeInput = document.getElementById('dayEntryScheduleTime');
                    student.scheduledLessons.push({ date: dayEntryDate, time: timeInput ? timeInput.value || '' : '' });
                } else {
                    // Log completed lesson
                    if ((student.remaining || 0) < hours) {
                        const deficit = hours - (student.remaining || 0);
                        student.paid = (student.paid || 0) + deficit;
                        student.remaining = (student.remaining || 0) + deficit;
                    }
                    
                    student.remaining -= hours;
                    
                    if (!student.lastLesson || dayEntryDate >= student.lastLesson) {
                        student.lastLesson = dayEntryDate;
                    }
                    student.lessonHistory.push({ date: dayEntryDate, hours });

                    if (student.remaining <= 0 && student.status !== 'Paused') {
                        student.status = 'Contact Student';
                    }
                }
            } else {
                const lessons = Math.max(1, parseInt(document.getElementById('dayEntryLessons').value) || 0);
                const amount = Math.max(0, parseFloat(document.getElementById('dayEntryAmount').value) || 0);
                const status = document.querySelector('input[name="dayEntryPaymentStatus"]:checked').value;

                // Read attachment files
                const fileInput = document.getElementById('dayEntryFiles');
                const newFiles = fileInput ? Array.from(fileInput.files) : [];
                const newAttachments = [];
                for (const file of newFiles) {
                    try {
                        if (file.size > MAX_ATTACH_SIZE) {
                            alert(`"${file.name}" is too large (${formatFileSize(file.size)}). Max file size is ${formatFileSize(MAX_ATTACH_SIZE)}.`);
                            continue;
                        }
                        const data = await readFileAsDataURL(file);
                        newAttachments.push({ id: makeAttachId(), name: file.name, type: file.type, size: file.size, data });
                    } catch (e) {
                        console.warn('Failed to read file:', file.name, e);
                    }
                }

                if (editRef) {
                    // --- Edit mode: update an existing payment ---
                    const list = editRef.bucket === 'history' ? disenrolled : students;
                    const editStudent = list[editRef.idx];
                    const payment = editStudent?.paymentHistory?.[editRef.pIndex];
                    if (!payment) {
                        alert('Payment record not found.');
                        return;
                    }
                    const oldLessons = payment.lessons || 0;
                    editStudent.paid = Math.max(0, (editStudent.paid || 0) - oldLessons);
                    editStudent.remaining = Math.max(0, (editStudent.remaining || 0) - oldLessons);

                    payment.date = dayEntryDate;
                    payment.amount = amount;
                    payment.lessons = lessons;
                    payment.status = status;
                    payment.attachments = [...(payment.attachments || []), ...newAttachments];

                    editStudent.paid = (editStudent.paid || 0) + lessons;
                    editStudent.remaining = (editStudent.remaining || 0) + lessons;

                    if (editStudent.status === 'Contact Student') {
                        editStudent.status = 'Active';
                    }
                } else {
                    // --- New payment ---
                    student.paid = (student.paid || 0) + lessons;
                    student.remaining = (student.remaining || 0) + lessons;
                    student.paymentHistory.push({ date: dayEntryDate, amount, lessons, status, attachments: newAttachments });

                    if (student.status === 'Contact Student') {
                        student.status = 'Active';
                    }
                }
            }

            saveToLocalStorage();
            const savedDate = dayEntryDate;
            closeDayEntryModal();
            renderTable();
            renderCalendar();
            showDayDetails(savedDate);
        };

        function loadInitialData() {
            // No demo/seed data — new installs simply start with an empty
            // student list. Use "+ Add New Student" to get started.
            students = [];
            disenrolled = [];
            saveToLocalStorage();
        }

        function migrateStudent(s) {
            // Ensure older records (or imported v1 backups) have the new fields
            if (!s.lessonHistory) s.lessonHistory = [];
            if (!s.paymentHistory) s.paymentHistory = [];
            if (typeof s.paid !== 'number') s.paid = 0;
            if (typeof s.remaining !== 'number') s.remaining = 0;
            if (typeof s.rate !== 'number') s.rate = 15;
            if (typeof s.whatsapp !== 'string') s.whatsapp = '';
            if (typeof s.address !== 'string') s.address = '';
            if (typeof s.age !== 'string') s.age = '';
            if (typeof s.progress !== 'string') s.progress = '';
            if (!Array.isArray(s.vocabulary)) s.vocabulary = [];
            if (!Array.isArray(s.progressEntries)) s.progressEntries = [];
            (s.paymentHistory || []).forEach(p => { if (!Array.isArray(p.attachments)) p.attachments = []; });
            // Migrate single next/nextTime to scheduledLessons array
            if (!Array.isArray(s.scheduledLessons)) {
                s.scheduledLessons = [];
                if (s.next) {
                    s.scheduledLessons.push({ date: s.next, time: s.nextTime || '' });
                }
                delete s.next;
                delete s.nextTime;
            }
            return s;
        }

        function saveToLocalStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
        students, 
        disenrolled,
        exchangeRate,
        defaultCurrency,
        yearlyGoal,
        privacyMode,
        darkMode,
        calendarStyle,
        hideWeekends,
        hideWeekendsBooking,           // ← NEW
        bookingWeeklyAvailability,
        bookingMorningStart,
        bookingMorningEnd,
        bookingAfternoonStart,
        bookingAfternoonEnd
    }));
    const used = checkLocalStorageSpace();
    if (used > 4 * 1024 * 1024) {
        console.warn('LocalStorage is getting full (' + formatFileSize(used) + ' used). Export backups regularly.');
    }
    // Sync to cloud if signed in
    if (window.cloudSync && window.cloudSync.isSignedIn && window.cloudSync.saveToCloud) {
        window.cloudSync.saveToCloud();
    }
    // Keep the public booking page's availability grid up to date
    if (window.cloudSync && window.cloudSync.isSignedIn && window.cloudSync.publishAvailability) {
        window.cloudSync.publishAvailability();
    }
}
        // Forces an immediate (non-debounced) availability publish. The regular
        // publish inside saveToLocalStorage() above is debounced by 800ms, which
        // is fine when a slot is being newly booked (no harm in the booking page
        // catching up a moment later). But when a slot is being FREED UP — a
        // scheduled lesson removed, marked done, or its student deleted — we
        // don't want to risk that write being dropped by a tab close or view
        // switch before the debounce fires, since that would leave the slot
        // stuck showing as "unavailable" to students. Call this right after
        // saveToLocalStorage() for those cases.
        function publishAvailabilityNow() {
            if (window.cloudSync && window.cloudSync.isSignedIn && window.cloudSync.publishAvailability) {
                window.cloudSync.publishAvailability(true);
            }
        }

        function loadFromLocalStorage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
            students = parsed.map(migrateStudent);
            disenrolled = [];
        } else {
            students = (parsed.students || []).map(migrateStudent);
            disenrolled = (parsed.disenrolled || []).map(migrateStudent);
            exchangeRate = parsed.exchangeRate || 950;
            defaultCurrency = parsed.defaultCurrency || 'USD';
            yearlyGoal = parsed.yearlyGoal || 5000;
            privacyMode = !!parsed.privacyMode;
            darkMode = parsed.darkMode === true;
            
            if (parsed.calendarStyle === 'grid' || parsed.calendarStyle === 'list') {
                calendarStyle = parsed.calendarStyle;
            }
            if (typeof parsed.hideWeekends === 'boolean') {
                hideWeekends = parsed.hideWeekends;
            }
            // NEW: Load hide weekends for booking page
            if (typeof parsed.hideWeekendsBooking === 'boolean') {
                hideWeekendsBooking = parsed.hideWeekendsBooking;
            }

            if (parsed.bookingWeeklyAvailability && typeof parsed.bookingWeeklyAvailability === 'object') {
                bookingWeeklyAvailability = parsed.bookingWeeklyAvailability;
            }
            if (typeof parsed.bookingMorningStart === 'string') bookingMorningStart = parsed.bookingMorningStart;
            if (typeof parsed.bookingMorningEnd === 'string') bookingMorningEnd = parsed.bookingMorningEnd;
            if (typeof parsed.bookingAfternoonStart === 'string') bookingAfternoonStart = parsed.bookingAfternoonStart;
            if (typeof parsed.bookingAfternoonEnd === 'string') bookingAfternoonEnd = parsed.bookingAfternoonEnd;
        }
    } else {
        loadInitialData();
    }
    applyTheme();
}

        


function formatCLP(amount) {
    return Math.round(amount * exchangeRate).toLocaleString('es-CL');
}

function formatMoneyUSD(amount) {
    return '$' + Math.round(amount);
}

function formatMoneyBoth(amount) {
    if (privacyMode) return '****';
    if (!amount) return '$0';
    return `${formatMoneyUSD(amount)} <small>(≈ $${formatCLP(amount)} CLP)</small>`;
}

        function formatMoney(amount) {
            if (privacyMode) return '****';
            if (amount === null || amount === undefined || isNaN(amount)) return defaultCurrency === 'CLP' ? '$0 CLP' : '$0';
            
            const usd = Math.round(amount);
            const clp = Math.round(amount * exchangeRate);
            
            if (defaultCurrency === 'CLP') {
                return `$${clp.toLocaleString('es-CL')} CLP <small>($${usd} USD)</small>`;
            } else {
                return `$${usd} <small>(≈ $${clp.toLocaleString('es-CL')} CLP)</small>`;
            }
        }

        function formatMoneySimple(amount) {
            if (privacyMode) return '****';
            if (amount === null || amount === undefined || isNaN(amount)) return '$0';
            if (defaultCurrency === 'CLP') {
                return `$${Math.round(amount * exchangeRate).toLocaleString('es-CL')} CLP`;
            } else {
                return `$${Math.round(amount)}`;
            }
        }

        // New helper for rate display (used in table and modals)
        function formatRate(rate) {
            if (privacyMode) return '****';
            if (defaultCurrency === 'CLP') {
                return `$${Math.round((rate || 15) * exchangeRate).toLocaleString('es-CL')} CLP/hr`;
            } else {
                return `$${(rate || 15)}/hr`;
            }
        }

        // ---------- File attachment helpers for progress entries ----------
        function formatFileSize(bytes) {
            if (!bytes || bytes <= 0) return '';
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
            return (bytes/(1024*1024)).toFixed(1) + ' MB';
        }

        function readFileAsDataURL(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }

        function renderAttachmentsHtml(attachments) {
            if (!attachments || attachments.length === 0) return '';
            const items = attachments.map((a) => {
                const isImage = a.type && a.type.startsWith('image/');
                if (isImage) {
                    return `<div class="entry-attachment"><img src="${a.data}" class="entry-attach-thumb" onclick="showAttachLightbox('${a.data.replace(/'/g, "\\'")}')" title="${a.name} (${formatFileSize(a.size)})"><span class="entry-attach-name">${a.name}</span><span class="entry-attach-size">${formatFileSize(a.size)}</span></div>`;
                }
                return `<div class="entry-attachment"><a href="${a.data}" download="${a.name}" class="entry-attach-link">📎 ${a.name}</a><span class="entry-attach-size">${formatFileSize(a.size)}</span></div>`;
            }).join('');
            return `<div class="entry-attachments">${items}</div>`;
        }

        function renderAttachmentsForEntry(entry) {
            if (!entry.attachments || entry.attachments.length === 0) return '';
            return renderAttachmentsHtml(entry.attachments);
        }

        // Lightbox for viewing attached images
        let attachLightboxEl = null;
        function showAttachLightbox(src) {
            if (!attachLightboxEl) {
                attachLightboxEl = document.createElement('div');
                attachLightboxEl.className = 'entry-attach-lightbox';
                attachLightboxEl.onclick = () => { attachLightboxEl.style.display = 'none'; };
                document.body.appendChild(attachLightboxEl);
            }
            attachLightboxEl.innerHTML = `<img src="${src}" alt="Attachment">`;
            attachLightboxEl.style.display = 'flex';
        }

        // Update the selected-files list in the add-entry form
        function updateAttachList() {
            const input = document.getElementById('newEntryFiles');
            const list = document.getElementById('selectedFilesList');
            if (!input || !list) return;
            const files = Array.from(input.files);
            if (files.length === 0) { list.innerHTML = ''; return; }
            list.innerHTML = files.map(f =>
                `<span class="selected-file-chip">${f.name}<span class="file-size">${formatFileSize(f.size)}</span></span>`
            ).join('');
            // Show storage warning if total is large
            const totalBytes = files.reduce((s, f) => s + f.size, 0);
            const warn = document.getElementById('storageWarning');
            if (warn) {
                warn.style.display = totalBytes > 2 * 1024 * 1024 ? 'block' : 'none';
            }
        }

        function checkLocalStorageSpace() {
            let used = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    used += localStorage[key].length * 2; // UTF-16 ~ 2 bytes per char
                }
            }
            return used;
        }

        // Stored per-entry attachment as {id, name, type, size, data (base64)}
        function makeAttachId() {
            return 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
        }

        const MAX_ATTACH_SIZE = 5 * 1024 * 1024; // 5 MB per file
        const MAX_ATTACH_COUNT = 5; // max files per entry

        function triggerStandardDownload(jsonText, filename) {
            const blob = new Blob([jsonText], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        async function exportBackup() {
            const jsonText = JSON.stringify({
                students,
                disenrolled,
                exchangeRate,
                defaultCurrency,
                yearlyGoal,
                privacyMode,
                darkMode,
                calendarStyle,
                hideWeekends,
                hiddenColumns,
                bookingWeeklyAvailability,
                bookingMorningStart,
                bookingMorningEnd,
                bookingAfternoonStart,
                bookingAfternoonEnd
            }, null, 2);
            const filename = `student-tracker-backup-${todayStr()}.json`;

            // Where supported (Chrome/Edge, served over https or localhost — not when
            // the page is opened directly as a file://), this opens a native "Save As"
            // dialog. Using the same `id` makes the browser reopen it in whichever
            // folder you picked last time, so pointing it at the folder this HTML file
            // lives in once means every future export lands there automatically.
            if (window.showSaveFilePicker) {
                try {
                    const handle = await window.showSaveFilePicker({
                        id: 'studentTrackerBackup',
                        suggestedName: filename,
                        types: [{ description: 'JSON Backup', accept: { 'application/json': ['.json'] } }]
                    });
                    const writable = await handle.createWritable();
                    await writable.write(jsonText);
                    await writable.close();
                    return;
                } catch (err) {
                    if (err.name === 'AbortError') return; // user cancelled the dialog
                    console.warn('Save picker unavailable, falling back to standard download.', err);
                }
            }

            // Fallback: a normal browser download. The browser — not this page —
            // controls exactly where that lands (usually your default Downloads
            // folder); see the hint in the UI for how to point that at this file's folder.
            triggerStandardDownload(jsonText, filename);
        }

        function importBackup(event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const parsed = JSON.parse(e.target.result);
                    let newStudents, newDisenrolled;
                    if (Array.isArray(parsed)) {
                        newStudents = parsed;
                        newDisenrolled = [];
                    } else if (parsed && Array.isArray(parsed.students)) {
                        newStudents = parsed.students;
                        newDisenrolled = parsed.disenrolled || [];
                    } else {
                        throw new Error('Not a valid backup file');
                    }
                    if (!confirm(`Import ${newStudents.length} student(s) and ${newDisenrolled.length} history record(s)? This will replace your current data (export a backup first if unsure).`)) return;
                    students = newStudents.map(migrateStudent);
                    disenrolled = newDisenrolled.map(migrateStudent);
                    // Restore settings if present in the backup
                    if (typeof parsed.exchangeRate === 'number') exchangeRate = parsed.exchangeRate;
                    if (typeof parsed.defaultCurrency === 'string') defaultCurrency = parsed.defaultCurrency;
                    if (typeof parsed.yearlyGoal === 'number') yearlyGoal = parsed.yearlyGoal;
                    if (typeof parsed.privacyMode === 'boolean') privacyMode = parsed.privacyMode;
                    if (typeof parsed.darkMode === 'boolean') darkMode = parsed.darkMode;
                    if (parsed.calendarStyle === 'grid' || parsed.calendarStyle === 'list') calendarStyle = parsed.calendarStyle;
                    if (typeof parsed.hideWeekends === 'boolean') hideWeekends = parsed.hideWeekends;
                    if (Array.isArray(parsed.hiddenColumns)) {
                        hiddenColumns = parsed.hiddenColumns;
                        saveHiddenColumns();
                        updateColumnVisibilityStyle();
                    }
                    if (parsed.bookingWeeklyAvailability && typeof parsed.bookingWeeklyAvailability === 'object') {
                        bookingWeeklyAvailability = parsed.bookingWeeklyAvailability;
                    }
                    if (typeof parsed.bookingMorningStart === 'string') bookingMorningStart = parsed.bookingMorningStart;
                    if (typeof parsed.bookingMorningEnd === 'string') bookingMorningEnd = parsed.bookingMorningEnd;
                    if (typeof parsed.bookingAfternoonStart === 'string') bookingAfternoonStart = parsed.bookingAfternoonStart;
                    if (typeof parsed.bookingAfternoonEnd === 'string') bookingAfternoonEnd = parsed.bookingAfternoonEnd;
                    saveToLocalStorage();
                    applyTheme();
                    renderTable();
                    renderDashboard();
                    alert('Backup imported successfully.');
                } catch (err) {
                    alert('Could not read that file as a valid backup: ' + err.message);
                }
                event.target.value = '';
            };
            reader.readAsText(file);
        }

        let expandedStudentIndex = -1;

        window.toggleStudentDetail = function(index, event) {
            if (event) event.stopPropagation();
            if (currentDetailEditSpan) finishDetailInlineEdit(true);
            expandedStudentIndex = expandedStudentIndex === index ? -1 : index;
            renderTable();
        };

        function renderTable() {
            const tbody = document.querySelector('#studentTable tbody');
            tbody.innerHTML = '';

            // Keep expanded index valid
            if (expandedStudentIndex >= students.length) expandedStudentIndex = -1;

            const query = document.getElementById('searchBox').value.trim().toLowerCase();
            const visible = students
                .map((s, i) => ({ s, i }))
                .filter(({ s }) => !query || s.name.toLowerCase().includes(query));

            const STATUS_RANK = { 'Contact Student': 0, 'Active': 1, 'Paused': 2 };
            if (sortKey === 'status') {
                visible.sort((a, b) => {
                    const ra = STATUS_RANK[a.s.status] ?? 3;
                    const rb = STATUS_RANK[b.s.status] ?? 3;
                    return (ra - rb) * sortDir;
                });
            } else if (sortKey === 'next') {
                // Students with no scheduled lessons always sink to the bottom,
                // regardless of sort direction — there's nothing meaningful to rank them by.
                visible.sort((a, b) => {
                    const na = getNextScheduledLesson(a.s);
                    const nb = getNextScheduledLesson(b.s);
                    const da = na ? `${na.date} ${na.time || '00:00'}` : null;
                    const db = nb ? `${nb.date} ${nb.time || '00:00'}` : null;
                    if (da === null && db === null) return 0;
                    if (da === null) return 1;
                    if (db === null) return -1;
                    return da < db ? -1 * sortDir : da > db ? 1 * sortDir : 0;
                });
            }

            document.getElementById('thStatus').textContent = 'Status ' + (sortKey === 'status' ? (sortDir === 1 ? '▲' : '▼') : '⇅');
            document.getElementById('thNext').textContent = 'Next Scheduled ' + (sortKey === 'next' ? (sortDir === 1 ? '▲' : '▼') : '⇅');

            if (visible.length === 0) {
                tbody.innerHTML = `<tr class="empty-row"><td colspan="5">No students match your search.</td></tr>`;
            }

            const now = new Date();
            const curMonth = now.getMonth();
            const curYear = now.getFullYear();

           let hoursMonth = 0, revenueMonth = 0, revenueYear = 0, pendingLessons = 0;

            visible.forEach(({ s: student, i: index }) => {
                // 1. Calculate 'paid' dynamically from all payment records
                if (student.paymentHistory && student.paymentHistory.length > 0) {
                    student.paid = student.paymentHistory.reduce((sum, p) => sum + (p.lessons || 0), 0);
                }

                // 2. Calculate 'used' dynamically from all logged lesson records
                let used = 0;
                if (student.lessonHistory && student.lessonHistory.length > 0) {
                    used = student.lessonHistory.reduce((sum, l) => sum + (l.hours || 0), 0);
                }

                // 3. Calculate 'remaining' as the exact difference
                student.remaining = (student.paid || 0) - used;

                pendingLessons += student.remaining || 0;

                const row = document.createElement('tr');
                const low = (student.remaining || 0) <= 1 && student.status !== 'Paused';
                if (low) row.classList.add('low-remaining');

                const remClass = low ? 'remaining-low' : 'remaining-ok';
                const statusClass = student.status === 'Paused' ? 'status-paused'
                    : student.status === 'Contact Student' ? 'status-contact'
                    : 'status-active';

                const pendingTotal = (student.paymentHistory || [])
                    .filter(p => p.status === 'pending')
                    .reduce((sum, p) => sum + (p.amount || 0), 0);
                const pendingTag = pendingTotal > 0 ? `<span class="pending-tag">⏳ ${privacyMode ? '****' : '$' + Math.round(pendingTotal)} owed</span>` : '';

                let statusCell;
                if (student.status === 'Contact Student') {
                    statusCell = `<a href="#" class="${statusClass}" style="text-decoration:none;" onclick="contactStudent(${index}); return false;" title="Message on WhatsApp">Contact</a>`;
                } else {
                    statusCell = `<span class="${statusClass}">${student.status || 'Active'}</span>`;
                }

                                row.innerHTML = `
                    <td data-col="name" class="editable" ondblclick="startInlineEdit(this, ${index}, 'name')"><span class="expand-arrow${expandedStudentIndex === index ? ' open' : ''}" onclick="toggleStudentDetail(${index}, event)">▶</span> <strong>${student.name}</strong>${pendingTag}</td>
                    <td data-col="remaining"><span class="remaining-badge ${remClass}">${student.remaining || 0}</span></td>
                    <td data-col="next" class="editable" ondblclick="startInlineEdit(this, ${index}, 'next')">${(() => { const n = getNextScheduledLesson(student); return n ? formatDate(n.date) + (n.time ? ' · ' + formatTime(n.time) : '') : ''; })()}</td>
                    <td data-col="status" class="editable" ondblclick="startInlineEdit(this, ${index}, 'status')">${statusCell}</td>
                    <td data-col="actions">
                        <button class="btn btn-small" onclick="showLessonModal(${index})" title="Log a lesson">➕</button>
                        <button class="btn btn-small btn-payment" onclick="showPaymentModal(${index})" title="Record a payment">💲</button>
                        <button class="btn btn-small" onclick="editStudent(${index})" title="Edit student">🖋️</button>
                        <button class="btn btn-small btn-disenroll" onclick="disenrollStudent(${index})" title="Disenroll student">❌</button>
                        <button class="btn btn-small btn-delete" onclick="deleteStudent(${index})" title="Delete student">🗑️</button>
                    </td>
                `;
                tbody.appendChild(row);

                // Expandable detail row
                if (expandedStudentIndex === index) {
                    const firstLesson = (student.lessonHistory || []).sort((a, b) => a.date.localeCompare(b.date))[0];
                    const lastLessonEntry = (student.lessonHistory || []).sort((a, b) => b.date.localeCompare(a.date))[0];
                    const totalPaid = (student.paymentHistory || []).reduce((sum, p) => sum + (p.amount || 0), 0);
                    const payments = (student.paymentHistory || []).sort((a, b) => b.date.localeCompare(a.date));

                    const paymentsHtml = payments.length
                        ? payments.map(p => `
                            <div class="student-payment-item">
                                <div>
                                    <strong>${formatDate(p.date)}</strong> — ${p.lessons || 0} lessons · ${privacyMode ? '****' : '$' + Math.round(p.amount || 0)}
                                </div>
                                <span class="student-payment-status ${p.status}">${p.status === 'received' ? '✅ Received' : '⏳ Pending'}</span>
                            </div>
                        `).join('')
                        : '<div style="color:var(--color-text-hint); font-style:italic; padding:6px 0;">No payments recorded.</div>';

                    const detailRow = document.createElement('tr');
                    detailRow.className = 'student-detail-row';
                    detailRow.innerHTML = `
                        <td colspan="5">
                            <div class="student-detail-panel">
                                <div class="student-detail-section">
                                    <h4>Student Info</h4>
                                    <div class="student-detail-field"><strong>Level:</strong> <span class="detail-editable" ondblclick="startDetailInlineEdit(this, ${index}, 'level')">${student.level || 'TBD'}</span></div>
                                    <div class="student-detail-field"><strong>Modality:</strong> <span class="detail-editable" ondblclick="startDetailInlineEdit(this, ${index}, 'modality')">${student.modality || 'TBD'}</span></div>
                                    <div class="student-detail-field"><strong>Rate:</strong> <span class="detail-editable" ondblclick="startDetailInlineEdit(this, ${index}, 'rate')">${formatRate(student.rate)}</span></div>
                                    <div class="student-detail-field"><strong>Last lesson:</strong> <span class="detail-editable" ondblclick="startDetailInlineEdit(this, ${index}, 'lastLesson')">${student.lastLesson ? formatDate(student.lastLesson) : '<span style="color:var(--color-text-hint);">None</span>'}</span></div>
                                    <div class="student-detail-field"><strong>Lessons paid:</strong> ${student.paid || 0}</div>
                                    <div class="student-detail-field"><strong>Lessons used:</strong> ${used}</div>
                                    <div class="student-detail-field"><strong>Remaining:</strong> ${student.remaining || 0}</div>
                                </div>
                                <div class="student-detail-section">
                                    <h4>Contact Info</h4>
                                    <div class="student-detail-field"><strong>Phone:</strong> <span class="detail-editable" ondblclick="startDetailInlineEdit(this, ${index}, 'whatsapp')">${student.whatsapp ? escapeHtml(student.whatsapp) : '<span style="color:var(--color-text-hint);">Not set</span>'}</span></div>
                                    <div class="student-detail-field"><strong>Age:</strong> <span class="detail-editable" ondblclick="startDetailInlineEdit(this, ${index}, 'age')">${student.age ? escapeHtml(student.age) : '<span style="color:var(--color-text-hint);">Not set</span>'}</span></div>
                                    <div class="student-detail-field"><strong>Address:</strong> <span class="detail-editable" ondblclick="startDetailInlineEdit(this, ${index}, 'address')">${student.address ? escapeHtml(student.address) : '<span style="color:var(--color-text-hint);">Not set</span>'}</span></div>
                                    <div class="student-detail-field" style="margin-top:8px;"><strong>Notes:</strong> <span class="detail-editable" ondblclick="startDetailInlineEdit(this, ${index}, 'notes')">${student.notes ? escapeHtml(student.notes) : '<span style="color:var(--color-text-hint);">None</span>'}</span></div>
                                </div>
                                <div class="student-detail-section">
                                    <h4>Class Summary</h4>
                                    <div class="student-detail-field"><strong>First class:</strong> ${firstLesson ? formatDate(firstLesson.date) : '<span style="color:var(--color-text-hint);">None</span>'}</div>
                                    <div class="student-detail-field"><strong>Last class:</strong> ${lastLessonEntry ? formatDate(lastLessonEntry.date) : '<span style="color:var(--color-text-hint);">None</span>'}</div>
                                    <div class="student-detail-field"><strong>Total hours:</strong> ${(student.lessonHistory || []).reduce((sum, e) => sum + (e.hours || 0), 0)}</div>
                                    <div class="student-detail-field"><strong>Total paid:</strong> ${privacyMode ? '****' : '$' + Math.round(totalPaid)}</div>
                                </div>
                                <div class="student-detail-section" style="grid-column: 1 / -1;">
                                    <h4>Payment History</h4>
                                    <div class="student-payment-list">${paymentsHtml}</div>
                                </div>
                            </div>
                        </td>
                    `;
                    tbody.appendChild(detailRow);
                }
            });

            // Hours delivered this month come from dated lesson history.
            // Revenue is counted separately, from received payments only — a lesson
            // being used doesn't add revenue, since that money was already counted
            // when the payment for it was recorded.
            let yearTotal = 0;
            let pendingPaymentsTotal = 0;
            students.forEach(student => {
                (student.lessonHistory || []).forEach(entry => {
                    const parts = (entry.date || '').split('-');
                    if (parts.length !== 3) return;
                    const y = parseInt(parts[0], 10), m = parseInt(parts[1], 10) - 1;
                    if (y === curYear && m === curMonth) {
                        hoursMonth += entry.hours || 1;
                    }
                });
                (student.paymentHistory || []).forEach(p => {
                    if (p.status === 'pending') {
                        pendingPaymentsTotal += p.amount || 0;
                        return;
                    }
                    const parts = (p.date || '').split('-');
                    if (parts.length !== 3) return;
                    const y = parseInt(parts[0], 10), m = parseInt(parts[1], 10) - 1;
                    if (y === curYear) {
                        yearTotal += p.amount || 0;
                        if (m === curMonth) revenueMonth += p.amount || 0;
                    }
                });
            });
            revenueYear = yearTotal;

            document.getElementById('totalHoursMonth').textContent = hoursMonth;
            document.getElementById('totalRevenueMonth').textContent = formatMoneySimple(revenueMonth);
            document.getElementById('totalRevenueYear').textContent = formatMoneySimple(revenueYear);
            document.getElementById('pendingLessons').textContent = pendingLessons;
            document.getElementById('pendingPayments').textContent = formatMoneySimple(pendingPaymentsTotal);
            document.getElementById('totalStudents').textContent = students.length;

            const goalDisplay = formatMoneySimple(yearlyGoal);
            const pct = Math.min(100, Math.round((revenueYear / yearlyGoal) * 100));
            document.getElementById('goalLabel').textContent = `${formatMoneySimple(revenueYear)} / ${goalDisplay} this year`;
            document.getElementById('goalBarFill').style.width = pct + '%';

            if (document.getElementById('calendarView').style.display !== 'none') {
                renderCalendar();
            }
            if (document.getElementById('progressView').style.display !== 'none') {
                renderProgressView();
            }
            if (document.getElementById('dashboardView').style.display !== 'none') {
                renderDashboard();
            }
            if (document.getElementById('graphView').style.display !== 'none') {
                renderGraph();
            }
        }
        

        // ---------- Dashboard tab ----------
        function escapeHtml(str) {
            if (!str) return '';
            return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }

        // Returns the soonest scheduled lesson for a student, or null
        function getNextScheduledLesson(student) {
            const lessons = (student.scheduledLessons || []).filter(sl => sl && sl.date);
            if (lessons.length === 0) return null;
            return lessons.reduce((earliest, sl) => {
                const key = sl.date + ' ' + (sl.time || '00:00');
                const earliestKey = earliest.date + ' ' + (earliest.time || '00:00');
                return key < earliestKey ? sl : earliest;
            });
        }

        function renderDashboard() {
    const wrap = document.getElementById('dashboardContent');
    const todayVal = todayStr();

    const withNext = students.map((s, i) => ({ s, i })).filter(({ s }) => {
        const next = getNextScheduledLesson(s);
        return next && next.date >= todayVal;
    });

    if (withNext.length === 0) {
        wrap.innerHTML = `
            <h2 style="margin:0 0 10px 0; color:#1e3a8a;">Next Up</h2>
            <p class="dashboard-empty">No upcoming classes scheduled.</p>
        `;
        return;
    }

    const nearestDate = withNext.reduce((min, { s }) => {
        const next = getNextScheduledLesson(s);
        return next.date < min ? next.date : min;
    }, getNextScheduledLesson(withNext[0].s).date);
    const dueNext = withNext.filter(({ s }) => getNextScheduledLesson(s).date === nearestDate);

    const dateLabel = nearestDate === todayVal ? `Today — ${formatDate(nearestDate)}` : formatDate(nearestDate);

    const statusBadge = (s) => {
        if (s.status === 'Contact Student') return `<span class="status-contact" style="font-size:0.72rem;">Contact Student</span>`;
        if (s.status === 'Paused') return `<span class="status-paused" style="font-size:0.72rem;">Paused</span>`;
        return '';
    };

    wrap.innerHTML = `
        <h2 style="margin:0 0 4px 0; color:#1e3a8a;">Next Up: ${dateLabel}</h2>
        <div class="dashboard-grid">
            ${dueNext.map(({ s, i }) => {
                const latestEntry = (s.progressEntries || []).sort((a,b)=>b.date.localeCompare(a.date))[0];
                const nextSl = getNextScheduledLesson(s);
                const contactBtn = s.status === 'Contact Student'
                    ? `<button class="btn btn-small" style="margin-top:10px;" onclick="contactStudent(${i})">💬 Contact</button>`
                    : '';
                return `
                    <div class="dashboard-card">
                        <div class="dashboard-card-header">
                            <div>
                                <div class="dashboard-card-name">${escapeHtml(s.name)}</div>
                                <div class="dashboard-card-meta">${formatDate(nextSl.date)}${nextSl.time ? ' · ' + formatTime(nextSl.time) : ''}</div>
                            </div>
                            <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
                                <span class="status-active" style="font-size:0.72rem;">${s.remaining || 0} left</span>
                                ${statusBadge(s)}
                            </div>
                        </div>
                        ${latestEntry ? `
                            <div class="dashboard-card-progress-label">Latest Note — ${formatDate(latestEntry.date)}</div>
                            <div class="dashboard-card-progress-text">${escapeHtml(latestEntry.text)}</div>
                        ` : `
                            <div class="dashboard-card-progress-label">Progress Notes</div>
                            <div class="dashboard-card-progress-text" style="color:#94a3b8;">No notes yet.</div>
                        `}
                        ${contactBtn}
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

        // ---------- Graph tab ----------
        // Sums received-payment amounts per calendar month for the given year.
        // Mirrors the "Revenue This Year" stat logic: only active students,
        // only 'received' payments — pending money isn't counted until it's in.
        function computeMonthlyRevenue(year) {
            const monthly = new Array(12).fill(0);
            students.forEach(student => {
                (student.paymentHistory || []).forEach(p => {
                    if (p.status === 'pending') return;
                    const parts = (p.date || '').split('-');
                    if (parts.length !== 3) return;
                    const y = parseInt(parts[0], 10), m = parseInt(parts[1], 10) - 1;
                    if (y === year) monthly[m] += p.amount || 0;
                });
            });
            return monthly;
        }

        function renderGraph() {
            const year = new Date().getFullYear();
            document.getElementById('graphYearLabel').textContent = year;
            const monthly = computeMonthlyRevenue(year);
            const wrap = document.getElementById('graphContent');

            const width = 900, height = 380;
            const padding = { top: 20, right: 30, bottom: 40, left: 75 };
            const chartWidth = width - padding.left - padding.right;
            const chartHeight = height - padding.top - padding.bottom;

            const maxVal = Math.max(...monthly, 0);
            const niceMax = Math.ceil((maxVal || 100) / 100) * 100;

            const xStep = chartWidth / (monthly.length - 1);
            const points = monthly.map((val, i) => ({
                x: padding.left + i * xStep,
                y: padding.top + chartHeight - (val / niceMax) * chartHeight,
                val
            }));

            const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
            const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(padding.top + chartHeight).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padding.top + chartHeight).toFixed(1)} Z`;

            const gridLines = 4;
            let gridHtml = '';
            for (let g = 0; g <= gridLines; g++) {
                const gy = padding.top + chartHeight - (g / gridLines) * chartHeight;
                const gVal = (niceMax / gridLines) * g;
                gridHtml += `
                    <line x1="${padding.left}" y1="${gy}" x2="${width - padding.right}" y2="${gy}" stroke="#e2e8f0" stroke-width="1" />
                    <text x="${padding.left - 10}" y="${gy + 4}" text-anchor="end" font-size="11" fill="#64748b">${privacyMode ? '****' : formatMoneySimple(gVal)}</text>
                `;
            }

            const monthLabels = MONTH_NAMES.map(m => m.slice(0, 3));
            const labelsHtml = points.map((p, i) => `
                <text x="${p.x}" y="${height - padding.bottom + 20}" text-anchor="middle" font-size="12" fill="#64748b">${monthLabels[i]}</text>
            `).join('');

            const pointsHtml = points.map((p, i) => `
                <circle cx="${p.x}" cy="${p.y}" r="4.5" fill="#1e40af" stroke="white" stroke-width="1.5">
                    <title>${monthLabels[i]} ${year}: ${privacyMode ? '****' : formatMoneySimple(p.val)}</title>
                </circle>
            `).join('');

            wrap.innerHTML = `
                <svg viewBox="0 0 ${width} ${height}" style="width:100%; height:auto; max-width:900px;">
                    <path d="${areaPath}" fill="rgba(30,64,175,0.08)" stroke="none" />
                    ${gridHtml}
                    <path d="${linePath}" fill="none" stroke="#1e40af" stroke-width="2.5" />
                    ${pointsHtml}
                    ${labelsHtml}
                </svg>
            `;
        }

        // ---------- Students Progress tab ----------
        let openProgressIndex = -1;

        const VOCAB_CATEGORIES = ['Verb', 'Adjective', 'Adverb', 'Other'];

        function renderVocabHtml(student) {
            const vocab = student.vocabulary || [];
            const filtered = vocabFilter === 'All' ? vocab : vocab.filter(v => v.category === vocabFilter);
            const sorted = [...filtered].sort((a, b) => a.word.localeCompare(b.word));

            const filterButtons = ['All', ...VOCAB_CATEGORIES].map(cat => {
                const count = cat === 'All' ? vocab.length : vocab.filter(v => v.category === cat).length;
                return `<button class="vocab-filter-btn${vocabFilter === cat ? ' active' : ''}" onclick="setVocabFilter('${cat}')">${cat} (${count})</button>`;
            }).join('');

            const listHtml = sorted.length
                ? sorted.map(v => `
                    <div class="vocab-item">
                        <span class="vocab-word">${escapeHtml(v.word)}<span class="vocab-tag tag-${v.category.toLowerCase()}">${v.category}</span></span>
                        <button class="btn btn-small btn-delete" onclick="deleteVocabWord('${v.id}')">×</button>
                    </div>
                `).join('')
                : `<p class="vocab-empty">${vocab.length === 0 ? 'No vocabulary added yet.' : 'No words match this filter.'}</p>`;

            return `
                <div class="progress-section-title">Known Vocabulary (${vocab.length})</div>
                <div class="vocab-add-row">
                    <input type="text" id="newVocabWord" placeholder="Add a word..." onkeydown="if(event.key==='Enter'){event.preventDefault();addVocabWord();}">
                    <select id="newVocabCategory">
                        ${VOCAB_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
                    </select>
                    <button class="btn btn-small" onclick="addVocabWord()">+ Add Word</button>
                </div>
                <div class="vocab-filter-row">${filterButtons}</div>
                <div class="vocab-list">${listHtml}</div>
            `;
        }

        function renderProgressView() {
    const sidebar = document.getElementById('progressStudentList');
    const detail = document.getElementById('progressDetail');
    sidebar.innerHTML = '';
    detail.innerHTML = '';

    if (students.length === 0) {
        sidebar.innerHTML = '<p style="color:#94a3b8; padding:14px;">No students yet.</p>';
        detail.innerHTML = '<p class="hint">Select a student from the list to view their vocabulary and progress log.</p>';
        return;
    }

    sidebar.innerHTML = '<div class="progress-sidebar-header">Students</div>';

    students.forEach((s, i) => {
        const totalHours = (s.lessonHistory || []).reduce((sum, e) => sum + (e.hours || 0), 0);
        const totalPaid = (s.paymentHistory || [])
            .filter(p => p.status === 'received')
            .reduce((sum, p) => sum + (p.amount || 0), 0);

        const item = document.createElement('div');
        item.className = 'progress-student-item' + (openProgressIndex === i ? ' active' : '');
        item.onclick = () => toggleProgressPanel(i);
        item.innerHTML = `
            <div class="progress-student-name">${escapeHtml(s.name)}</div>
            <div class="progress-student-stats">
                <span><strong>${totalHours}</strong> hrs</span>
                <span><strong>${formatMoneyBoth(totalPaid)}</strong></span>
            </div>
        `;
        sidebar.appendChild(item);
    });

    if (openProgressIndex >= 0 && students[openProgressIndex]) {
        const s = students[openProgressIndex];
        const entries = (s.progressEntries || []).sort((a,b) => b.date.localeCompare(a.date));

        let entriesHTML = entries.map((e, i) => `
            <div class="history-list-item">
                <div>
                    <strong>${formatDate(e.date)}</strong><br>
                    ${e.text.replace(/\n/g, '<br>')}
                    ${renderAttachmentsForEntry(e)}
                </div>
                <button class="btn btn-small btn-delete" onclick="deleteProgressEntry(${i})">×</button>
            </div>
        `).join('');

        if (entries.length === 0) entriesHTML = '<p style="color:#94a3b8; font-style:italic;">No progress entries yet.</p>';

        detail.innerHTML = `
            <h3>${escapeHtml(s.name)} — Progress</h3>

            <div class="progress-section-title">Add New Entry</div>
            <div style="display:flex; gap:10px; margin-bottom:10px;">
                <input type="date" id="newEntryDate" value="${todayStr()}" style="width:auto; flex:1;">
                <button class="btn btn-small" onclick="addProgressEntry()">+ Add Entry</button>
            </div>
            <textarea id="newEntryText" rows="3" placeholder="Write progress note..."></textarea>
            <div class="entry-attach-row">
                <input type="file" id="newEntryFiles" multiple onchange="updateAttachList()">
                <div id="selectedFilesList" class="selected-files-list"></div>
                <div id="storageWarning" class="storage-warning">⚠️ Large files use significant storage space. Keep backups of your originals.</div>
            </div>

            <div style="margin-top:16px; border-top:1px solid var(--color-border); padding-top:14px;">
                ${renderVocabHtml(s)}
            </div>

            <div style="margin-top:16px; border-top:1px solid var(--color-border); padding-top:14px;">
                <div class="progress-section-title">Progress Log</div>
                ${entriesHTML}
            </div>
        `;
    } else {
        detail.innerHTML = '<p class="hint">Select a student from the list to view their vocabulary and progress log.</p>';
    }
}


       window.toggleProgressPanel = function(i) {
    openProgressIndex = (openProgressIndex === i) ? -1 : i;
    vocabFilter = 'All';
    renderProgressView();
};

window.addProgressEntry = async function() {
    if (openProgressIndex < 0) return;
    const text = document.getElementById('newEntryText').value.trim();
    const date = document.getElementById('newEntryDate').value;
    const fileInput = document.getElementById('newEntryFiles');
    const files = fileInput ? Array.from(fileInput.files) : [];
    if (!text && files.length === 0) return;

    const s = students[openProgressIndex];
    if (!s.progressEntries) s.progressEntries = [];

    const attachments = [];
    for (const file of files) {
        try {
            if (file.size > MAX_ATTACH_SIZE) {
                alert(`"${file.name}" is too large (${formatFileSize(file.size)}). Max file size is ${formatFileSize(MAX_ATTACH_SIZE)}.`);
                continue;
            }
            const data = await readFileAsDataURL(file);
            attachments.push({ id: makeAttachId(), name: file.name, type: file.type, size: file.size, data });
        } catch (e) {
            console.warn('Failed to read file:', file.name, e);
        }
    }

    s.progressEntries.push({ date, text, attachments });

    document.getElementById('newEntryText').value = '';
    if (fileInput) { fileInput.value = ''; updateAttachList(); }
    saveToLocalStorage();
    renderProgressView();
    renderDashboard();
};

window.deleteProgressEntry = function(entryIndex) {
    if (openProgressIndex < 0) return;
    if (!confirm('Delete this progress entry?')) return;
    students[openProgressIndex].progressEntries.splice(entryIndex, 1);
    saveToLocalStorage();
    renderProgressView();
    renderDashboard();
};

window.setVocabFilter = function(category) {
    vocabFilter = category;
    renderProgressView();
};

window.addVocabWord = function() {
    if (openProgressIndex < 0) return;
    const wordInput = document.getElementById('newVocabWord');
    const categorySelect = document.getElementById('newVocabCategory');
    if (!wordInput || !categorySelect) return;

    const word = wordInput.value.trim();
    if (!word) return;
    const category = categorySelect.value;

    const s = students[openProgressIndex];
    if (!s.vocabulary) s.vocabulary = [];

    // Avoid piling up exact duplicates (same word + same category) for the same student.
    const alreadyExists = s.vocabulary.some(v => v.word.toLowerCase() === word.toLowerCase() && v.category === category);
    if (alreadyExists) {
        alert(`"${word}" is already in the ${category} list for ${s.name}.`);
        return;
    }

    s.vocabulary.push({ id: makeVocabId(), word, category, dateAdded: todayStr() });

    saveToLocalStorage();
    renderProgressView();
};

window.deleteVocabWord = function(id) {
    if (openProgressIndex < 0) return;
    const s = students[openProgressIndex];
    if (!confirm('Remove this word from the vocabulary list?')) return;
    s.vocabulary = (s.vocabulary || []).filter(v => v.id !== id);
    saveToLocalStorage();
    renderProgressView();
};

window.saveExchangeRate = function() {
    const rate = parseFloat(document.getElementById('exchangeRateInput').value);
    if (rate && rate > 0) {
        exchangeRate = rate;
        saveToLocalStorage();
        alert('Exchange rate saved! Refreshing views...');
        renderTable();
        renderProgressView();
        renderDashboard();
    }
};

        window.saveCurrencySettings = function() {
            const rate = parseFloat(document.getElementById('exchangeRateInput').value);
            const currency = document.getElementById('defaultCurrencySelect').value;

            if (rate && rate > 0) exchangeRate = rate;
            if (currency) defaultCurrency = currency;

            saveToLocalStorage();
            alert('Currency settings saved!');
            renderTable();
            renderProgressView();
            renderDashboard();
        };

        window.saveProgressNow = function() {
            if (openProgressIndex < 0 || !students[openProgressIndex]) return;
            const ta = document.getElementById('progressTextarea');
            if (!ta) return;
            students[openProgressIndex].progress = ta.value;
            saveToLocalStorage();
            const status = document.getElementById('progressSaveStatus');
            if (status) status.textContent = 'Saved ✓';
        };

        // ---------- Table columns: defaults, visibility, resizing ----------
        const COLUMNS = [
            { key: 'name',       label: 'Student Name',    hideable: false },
            { key: 'remaining',  label: 'Remaining',       hideable: false },
            { key: 'next',       label: 'Next Scheduled',  hideable: false },
            { key: 'status',     label: 'Status',          hideable: false },
            { key: 'actions',    label: 'Actions',         hideable: false }
        ];

        // The table's original (pre-resize) proportions, restored every time the
        // page loads so resizing never "sticks" across sessions.
        const DEFAULT_COL_WIDTHS = {
            name: '14%', level: '7%', modality: '7%', paid: '5%', used: '5%',
            remaining: '6%', rate: '5%', lastLesson: '8%', next: '10%',
            notes: '11%', status: '10%', actions: '12%'
        };

        const HIDDEN_COLS_KEY = 'englishStudents_hiddenCols';

        const originalRenderColumnSettings = renderColumnSettings;
renderColumnSettings = function() {
    originalRenderColumnSettings();
    document.getElementById('exchangeRateInput').value = exchangeRate;
    document.getElementById('yearlyGoalInput').value = yearlyGoal || '';
    updateCalStyleButton();
    renderBookingHoursGrid();
    const mS = document.getElementById('morningStartInput');
    const mE = document.getElementById('morningEndInput');
    const aS = document.getElementById('afternoonStartInput');
    const aE = document.getElementById('afternoonEndInput');
    if (mS) mS.value = bookingMorningStart;
    if (mE) mE.value = bookingMorningEnd;
    if (aS) aS.value = bookingAfternoonStart;
    if (aE) aE.value = bookingAfternoonEnd;
};

        let hiddenColumns = [];

        function loadHiddenColumns() {
            try {
                const saved = localStorage.getItem(HIDDEN_COLS_KEY);
                hiddenColumns = saved ? JSON.parse(saved) : [];
            } catch (e) {
                hiddenColumns = [];
            }
        }

        function saveHiddenColumns() {
            localStorage.setItem(HIDDEN_COLS_KEY, JSON.stringify(hiddenColumns));
        }

        function updateColumnVisibilityStyle() {
            const styleTag = document.getElementById('colVisibilityStyle');
            styleTag.textContent = hiddenColumns
                .map(key => `[data-col="${key}"] { display: none !important; }`)
                .join('\n');
        }

        window.toggleColumnVisibility = function(key, visible) {
            if (visible) {
                hiddenColumns = hiddenColumns.filter(k => k !== key);
            } else if (!hiddenColumns.includes(key)) {
                hiddenColumns.push(key);
            }
            saveHiddenColumns();
            updateColumnVisibilityStyle();
        };

        // New unified settings saver
        window.saveSettings = function() {
            const rate = parseFloat(document.getElementById('exchangeRateInput').value);
            const currency = document.getElementById('defaultCurrencySelect').value;
            const goalInput = parseFloat(document.getElementById('yearlyGoalInput').value);

            if (rate && rate > 0) exchangeRate = rate;
            if (currency) defaultCurrency = currency;
            if (goalInput && goalInput > 0) yearlyGoal = goalInput;

            const mS = document.getElementById('morningStartInput');
            const mE = document.getElementById('morningEndInput');
            const aS = document.getElementById('afternoonStartInput');
            const aE = document.getElementById('afternoonEndInput');
            if (mS && mS.value) bookingMorningStart = mS.value;
            if (mE && mE.value) bookingMorningEnd = mE.value;
            if (aS && aS.value) bookingAfternoonStart = aS.value;
            if (aE && aE.value) bookingAfternoonEnd = aE.value;

            saveToLocalStorage();
            publishAvailabilityNow(); // push the new hours to the booking page right away
            alert('Settings saved successfully!');
            renderTable();
            renderProgressView();
            renderDashboard();
        };

        window.toggleCalendarStyle = function() {
            calendarStyle = calendarStyle === 'grid' ? 'list' : 'grid';
            saveToLocalStorage();
            updateCalStyleButton();
            renderCalendar();
        };

        function updateWeekdayHeaders() {
            var container = document.getElementById('calendarWeekdays');
            if (hideWeekends) {
                container.style.gridTemplateColumns = 'repeat(5, 1fr)';
                container.innerHTML = '<div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div>';
            } else {
                container.style.gridTemplateColumns = '';
                container.innerHTML = '<div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>';
            }
        }

        window.toggleHideWeekends = function(enabled) {
            hideWeekends = enabled;
            saveToLocalStorage();
            renderCalendar();
        };

        window.toggleHideWeekendsBooking = function(enabled) {
            hideWeekendsBooking = !!enabled;
            saveToLocalStorage();
            // Publish immediately so the booking page reflects the change
            if (typeof window.cloudSync !== 'undefined' && window.cloudSync.publishAvailability) {
                window.cloudSync.publishAvailability(true);
            }
        };

        function updateCalStyleButton() {
            const btn = document.getElementById('calStyleToggle');
            if (btn) btn.textContent = calendarStyle === 'grid' ? '📋' : '📅';
        }

        // Privacy mode toggles instantly (like column visibility) rather than
        // waiting on "Save All Settings" — it's meant to be a quick screen-share switch.
        window.togglePrivacyMode = function(checked) {
            privacyMode = checked;
            saveToLocalStorage();
            renderTable();
            renderProgressView();
            renderCalendar();
            renderGraph();
        };

        function applyTheme() {
            document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
        }

        window.toggleDarkMode = function(checked) {
            darkMode = checked;
            applyTheme();
            saveToLocalStorage();
            renderGraph();
        };

        // Updated renderColumnSettings (now also loads goal + privacy mode)
        function renderColumnSettings() {
            const wrap = document.getElementById('columnSettingsList');
            wrap.innerHTML = COLUMNS.map(col => {
                const isHidden = hiddenColumns.includes(col.key);
                const locked = !col.hideable;
                return `
                    <label class="column-settings-item${locked ? ' locked' : ''}">
                        <input type="checkbox" ${isHidden ? '' : 'checked'} ${locked ? 'disabled' : ''}
                            onchange="toggleColumnVisibility('${col.key}', this.checked)">
                        ${col.label}${locked ? ' (always shown)' : ''}
                    </label>
                `;
            }).join('');

            document.getElementById('defaultCurrencySelect').value = defaultCurrency;
            document.getElementById('exchangeRateInput').value = exchangeRate;
            document.getElementById('yearlyGoalInput').value = yearlyGoal;
            document.getElementById('privacyModeToggle').checked = privacyMode;
            const dt = document.getElementById('darkModeToggle');
            if (dt) dt.checked = darkMode;
            // Hide weekends in calendar
            // Hide weekends in calendar
            const hideWeekendsToggle = document.getElementById('hideWeekendsToggle');
            if (hideWeekendsToggle) {
                hideWeekendsToggle.checked = hideWeekends;
            }

            // Hide weekends in booking page
            const hideWeekendsBookingToggle = document.getElementById('hideWeekendsBookingToggle');
            if (hideWeekendsBookingToggle) {
                hideWeekendsBookingToggle.checked = hideWeekendsBooking;
            }
        }

        function applyDefaultColumnWidths() {
            const table = document.getElementById('studentTable');
            COLUMNS.forEach(col => {
                const th = table.querySelector(`thead th[data-col="${col.key}"]`);
                if (th) th.style.width = DEFAULT_COL_WIDTHS[col.key] || '';
            });
        }

        function makeColumnsResizable() {
            const table = document.getElementById('studentTable');
            const ths = Array.from(table.querySelectorAll('thead th'));

            ths.forEach((th, colIndex) => {
                // The last column (Actions) has nothing to its right worth resizing into.
                if (colIndex === ths.length - 1) return;

                const resizer = document.createElement('div');
                resizer.className = 'col-resizer';
                th.appendChild(resizer);

                resizer.addEventListener('click', e => e.stopPropagation());

                resizer.addEventListener('mousedown', e => {
                    e.preventDefault();
                    e.stopPropagation();
                    const startX = e.pageX;
                    const startWidth = th.offsetWidth;
                    resizer.classList.add('resizing');
                    document.body.style.cursor = 'col-resize';
                    document.body.style.userSelect = 'none';

                    function onMouseMove(ev) {
                        const newWidth = Math.max(45, startWidth + (ev.pageX - startX));
                        th.style.width = newWidth + 'px';
                    }
                    function onMouseUp() {
                        resizer.classList.remove('resizing');
                        document.body.style.cursor = '';
                        document.body.style.userSelect = '';
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                    }
                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                });
            });
        }

        // ==================== INLINE EDITING ====================
        let currentEditingTd = null;

        function startInlineEdit(td, studentIndex, field) {
            if (currentEditingTd) finishInlineEdit(true); // cancel previous edit

            const student = students[studentIndex];
            if (!student) return;

            currentEditingTd = td;
            td.classList.add('inline-editing');
            const originalHTML = td.innerHTML;
            td.innerHTML = '';

            let input;

            if (field === 'level') {
                input = document.createElement('select');
                ['TBD', 'Beginner', 'Intermediate', 'Upper-Intermediate', 'Advanced'].forEach(val => {
                    const opt = document.createElement('option');
                    opt.value = val; opt.textContent = val;
                    if (val === (student.level || 'TBD')) opt.selected = true;
                    input.appendChild(opt);
                });
            } else if (field === 'modality') {
                input = document.createElement('select');
                ['Online', 'In Person', 'Both'].forEach(val => {
                    const opt = document.createElement('option');
                    opt.value = val; opt.textContent = val;
                    if (val === (student.modality || 'Online')) opt.selected = true;
                    input.appendChild(opt);
                });
            } else if (field === 'status') {
                input = document.createElement('select');
                ['Active', 'Paused', 'Contact Student'].forEach(val => {
                    const opt = document.createElement('option');
                    opt.value = val; opt.textContent = val;
                    if (val === (student.status || 'Active')) opt.selected = true;
                    input.appendChild(opt);
                });
            } else if (field === 'rate') {
                input = document.createElement('input');
                input.type = 'number';
                input.step = '0.5';
                input.value = student.rate || 15;
            } else if (field === 'lastLesson') {
                input = document.createElement('input');
                input.type = 'date';
                input.value = student[field] || '';
            } else if (field === 'next') {
                input = document.createElement('input');
                input.type = 'date';
                const nextSl = getNextScheduledLesson(student);
                input.value = nextSl ? nextSl.date : '';
            } else {
                // name, notes
                input = document.createElement('input');
                input.type = 'text';
                input.value = student[field] || '';
            }

            td.appendChild(input);
            input.focus();
            input.select();

            const saveEdit = () => {
                let newValue = input.value.trim();
                if (field === 'rate') newValue = Math.max(0, parseFloat(newValue) || 15);
                if (field === 'name' && !newValue) {
                    alert("Student name cannot be empty!");
                    return;
                }
                if (field === 'next') {
                    // Inline edit for "next scheduled": set/replace the first scheduled lesson
                    if (!Array.isArray(student.scheduledLessons)) student.scheduledLessons = [];
                    if (newValue) {
                        if (student.scheduledLessons.length === 0) {
                            student.scheduledLessons.push({ date: newValue, time: '' });
                        } else {
                            student.scheduledLessons[0].date = newValue;
                        }
                    } else {
                        student.scheduledLessons = [];
                    }
                } else {
                    student[field] = newValue;
                }
                saveToLocalStorage();
                renderTable();
            };

            const cancelEdit = () => renderTable();

            let saved = false;
            const safeSave = () => { if (!saved) { saved = true; saveEdit(); } };

            if (input.tagName === 'SELECT') {
                input.addEventListener('change', () => { safeSave(); });
            }

            input.onblur = function() { setTimeout(safeSave, 150); };
            input.onkeydown = function(e) {
                if (e.key === 'Enter') { e.preventDefault(); safeSave(); }
                if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
            };

            const outsideHandler = function(e) {
                if (!td.contains(e.target)) {
                    safeSave();
                    document.removeEventListener('mousedown', outsideHandler);
                }
            };
            setTimeout(() => document.addEventListener('mousedown', outsideHandler), 0);
        }

        function finishInlineEdit(cancel = false) {
            if (currentEditingTd) {
                currentEditingTd.classList.remove('inline-editing');
                currentEditingTd = null;
            }
            if (!cancel) renderTable();
        }

        let currentDetailEditSpan = null;

        window.startDetailInlineEdit = function(span, studentIndex, field) {
            if (currentDetailEditSpan) finishDetailInlineEdit(true);
            const student = students[studentIndex];
            if (!student) return;

            currentDetailEditSpan = span;
            span.classList.add('detail-editing');
            const originalHTML = span.innerHTML;
            span.innerHTML = '';

            let input;

            if (field === 'level') {
                input = document.createElement('select');
                ['TBD', 'Beginner', 'Intermediate', 'Upper-Intermediate', 'Advanced'].forEach(val => {
                    const opt = document.createElement('option');
                    opt.value = val; opt.textContent = val;
                    if (val === (student.level || 'TBD')) opt.selected = true;
                    input.appendChild(opt);
                });
            } else if (field === 'modality') {
                input = document.createElement('select');
                ['Online', 'In Person', 'Both'].forEach(val => {
                    const opt = document.createElement('option');
                    opt.value = val; opt.textContent = val;
                    if (val === (student.modality || 'Online')) opt.selected = true;
                    input.appendChild(opt);
                });
            } else if (field === 'rate') {
                input = document.createElement('input');
                input.type = 'number';
                input.step = '0.5';
                input.value = student.rate || 15;
            } else if (field === 'lastLesson') {
                input = document.createElement('input');
                input.type = 'date';
                input.value = student.lastLesson || '';
            } else {
                // whatsapp, age, address, notes
                input = document.createElement('input');
                input.type = 'text';
                input.value = student[field] || '';
            }

            span.appendChild(input);
            input.focus();
            if (input.tagName === 'SELECT') input.size = input.options.length; // expand on desktop

            let saved = false;
            const saveEdit = () => {
                if (saved) return;
                saved = true;
                let newValue = input.value.trim();
                if (field === 'rate') newValue = Math.max(0, parseFloat(newValue) || 15);
                student[field] = newValue;
                saveToLocalStorage();
                renderTable();
            };

            const cancelEdit = () => { if (!saved) renderTable(); };

            // Select: save on change (option picked) and on blur (clicking outside)
            if (input.tagName === 'SELECT') {
                input.addEventListener('change', () => { saveEdit(); });
            }

            input.onblur = function(e) {
                // Delay to allow click on another edit field to fire first
                setTimeout(saveEdit, 150);
            };

            input.onkeydown = function(e) {
                if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
                if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
            };

            // Save when clicking anywhere outside the input
            const outsideClickHandler = function(e) {
                if (!span.contains(e.target)) {
                    saveEdit();
                    document.removeEventListener('mousedown', outsideClickHandler);
                }
            };
            setTimeout(() => document.addEventListener('mousedown', outsideClickHandler), 0);
        };

        function finishDetailInlineEdit(cancel = false) {
            if (currentDetailEditSpan) {
                currentDetailEditSpan.classList.remove('detail-editing');
                currentDetailEditSpan = null;
            }
            if (!cancel) renderTable();
        }

        let loggingIndex = -1;

        window.showLessonModal = function(index) {
            const student = students[index];
            if (student.remaining <= 0) {
                alert("No remaining lessons. Record a payment to add more.");
                return;
            }
            loggingIndex = index;
            document.getElementById('lessonStudentLabel').textContent = `${student.name} — ${student.remaining} remaining`;
            document.getElementById('lessonDate').value = todayStr();
            document.getElementById('lessonHours').value = 1;
            document.getElementById('lessonModal').style.display = 'flex';
        };

        window.closeLessonModal = function() {
            document.getElementById('lessonModal').style.display = 'none';
            loggingIndex = -1;
        };

        window.confirmLesson = function() {
            if (loggingIndex < 0) return;
            const student = students[loggingIndex];
            const date = document.getElementById('lessonDate').value || todayStr();
            const hours = Math.max(0.5, parseFloat(document.getElementById('lessonHours').value) || 1);

            if (student.remaining <= 0) {
                alert("No remaining lessons. Record a payment to add more.");
                return;
            }

            // Subtract the actual hours inputted, not just 1
            student.remaining -= hours;
            
            // Only advance "Last Lesson" if this entry is the most recent one on record —
            // backfilling an earlier date shouldn't overwrite a more recent last-lesson date.
            if (!student.lastLesson || date >= student.lastLesson) {
                student.lastLesson = date;
            }
            // No revenue is added here — the money for this lesson was already counted
            // as revenue when the payment for it was recorded.
            student.lessonHistory.push({ date, hours });

            if (student.remaining <= 0 && student.status !== 'Paused') {
                student.status = 'Contact Student';
            }

            saveToLocalStorage();
            closeLessonModal();
            renderTable();
        };

        // Strips everything except digits and a leading + so numbers entered
        // as "+56 9 1234 5678" or "(56) 9-1234-5678" both work with wa.me links.
        function buildWhatsAppLink(rawNumber) {
            if (!rawNumber) return null;
            const digits = rawNumber.replace(/[^\d]/g, '');
            if (!digits) return null;
            return `https://wa.me/${digits}`;
        }

        window.contactStudent = function(index) {
            const student = students[index];
            let number = student.whatsapp;

            if (!number) {
                number = prompt(`No WhatsApp number saved for ${student.name}. Enter one now (with country code):`);
                if (!number) return;
                student.whatsapp = number.trim();
                saveToLocalStorage();
                renderTable();
            }

            const link = buildWhatsAppLink(student.whatsapp);
            if (!link) {
                alert("That doesn't look like a valid phone number. Edit the student to fix it.");
                return;
            }
            window.open(link, '_blank');
        };

        window.showAddModal = function() {
            editingIndex = -1;
            document.getElementById('modalTitle').textContent = 'Add New Student';
            document.getElementById('saveButton').textContent = 'Add Student';

            document.getElementById('editName').value = '';
            document.getElementById('editLevel').value = 'TBD';
            document.getElementById('editModality').value = 'Online';
            document.getElementById('editWhatsapp').value = '';
            document.getElementById('editAge').value = '';
            document.getElementById('editAddress').value = '';
            document.getElementById('editRate').value = '15';
            document.getElementById('editLastLesson').value = '';
            editScheduledLessonsBuffer = [];
            renderEditScheduledLessons();
            document.getElementById('editNotes').value = '';
            document.getElementById('editStatus').value = 'Active';

            document.getElementById('studentModal').style.display = 'flex';
        };

        window.editStudent = function(index) {
            editingIndex = index;
            const s = students[index];
            document.getElementById('modalTitle').textContent = 'Edit Student';
            document.getElementById('saveButton').textContent = 'Save Changes';

            document.getElementById('editName').value = s.name || '';
            document.getElementById('editLevel').value = s.level || 'TBD';
            document.getElementById('editModality').value = s.modality || 'Online';
            document.getElementById('editWhatsapp').value = s.whatsapp || '';
            document.getElementById('editAge').value = s.age || '';
            document.getElementById('editAddress').value = s.address || '';
            document.getElementById('editRate').value = s.rate || 15;
            document.getElementById('editLastLesson').value = s.lastLesson || '';
            editScheduledLessonsBuffer = JSON.parse(JSON.stringify(s.scheduledLessons || []));
            renderEditScheduledLessons();
            document.getElementById('editNotes').value = s.notes || '';
            document.getElementById('editStatus').value = s.status || 'Active';

            document.getElementById('studentModal').style.display = 'flex';
        };

        let editScheduledLessonsBuffer = [];

        function renderEditScheduledLessons() {
            const container = document.getElementById('editScheduledLessons');
            if (!container) return;
            if (editScheduledLessonsBuffer.length === 0) {
                container.innerHTML = '<p style="color:var(--color-text-hint); font-size:0.82rem; margin:4px 0;">No scheduled lessons.</p>';
                return;
            }
            container.innerHTML = editScheduledLessonsBuffer.map((sl, i) => `
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; font-size:0.85rem;">
                    <span>📅 ${formatDate(sl.date)}${sl.time ? ' · ' + formatTime(sl.time) : ''}</span>
                    <button class="btn btn-small btn-delete" type="button" onclick="removeScheduledLessonFromModal(${i})">×</button>
                </div>
            `).join('');
        }

        window.addScheduledLessonFromModal = function() {
            const dateInput = document.getElementById('editNewSchedDate');
            const timeInput = document.getElementById('editNewSchedTime');
            const date = dateInput.value;
            if (!date) { alert('Pick a date first.'); return; }
            editScheduledLessonsBuffer.push({ date, time: timeInput.value || '' });
            editScheduledLessonsBuffer.sort((a, b) => a.date.localeCompare(b.date) || (a.time || '00:00').localeCompare(b.time || '00:00'));
            dateInput.value = '';
            timeInput.value = '';
            renderEditScheduledLessons();
        };

        window.removeScheduledLessonFromModal = function(i) {
            editScheduledLessonsBuffer.splice(i, 1);
            renderEditScheduledLessons();
        };

        window.saveStudent = function() {
            const name = document.getElementById('editName').value.trim();
            if (!name) { alert("Student name is required!"); return; }

            const rate = Math.max(0, parseFloat(document.getElementById('editRate').value) || 0);
            const existing = editingIndex >= 0 ? students[editingIndex] : null;

            const newStudent = {
                name,
                level: document.getElementById('editLevel').value,
                modality: document.getElementById('editModality').value,
                whatsapp: document.getElementById('editWhatsapp').value.trim(),
                address: document.getElementById('editAddress') ? document.getElementById('editAddress').value.trim() : (existing ? existing.address || '' : ''),
                age: document.getElementById('editAge') ? document.getElementById('editAge').value.trim() : (existing ? existing.age || '' : ''),
                paid: existing ? existing.paid : 0,
                remaining: existing ? existing.remaining : 0,
                rate,
                lastLesson: document.getElementById('editLastLesson').value,
                scheduledLessons: existing ? JSON.parse(JSON.stringify(editScheduledLessonsBuffer)) : [],
                notes: document.getElementById('editNotes').value.trim(),
                status: document.getElementById('editStatus').value,
                lessonHistory: existing ? existing.lessonHistory : [],
                paymentHistory: existing ? existing.paymentHistory : [],
                progressEntries: existing ? existing.progressEntries : [],
                vocabulary: existing ? existing.vocabulary : []
            };

            if (editingIndex >= 0) {
                students[editingIndex] = newStudent;
            } else {
                students.push(newStudent);
            }

            saveToLocalStorage();
            closeModal();
            renderTable();

            if (editingIndex < 0) {
                // Nudge the workflow: a brand-new student has 0 paid lessons until
                // a payment is recorded for them.
                const idx = students.length - 1;
                if (confirm(`${name} added with 0 paid lessons. Record their first payment now?`)) {
                    showPaymentModal(idx);
                }
            }
        };

        window.deleteStudent = function(index) {
            if (confirm(`Delete ${students[index].name}? This can't be undone (export a backup first if unsure).`)) {
                students.splice(index, 1);
                saveToLocalStorage();
                publishAvailabilityNow();
                renderTable();
            }
        };

        window.closeModal = function() {
            document.getElementById('studentModal').style.display = 'none';
        };

        window.showPaymentModal = function(index) {
            payingIndex = index;
            const s = students[index];
            document.getElementById('paymentStudentLabel').textContent = `${s.name} — current rate ${formatRate(s.rate)}`;
            document.getElementById('paymentLessons').value = 4;
            document.getElementById('paymentAmount').value = 4 * (s.rate || 15);
            document.getElementById('paymentDate').value = todayStr();
            document.querySelector('input[name="paymentStatus"][value="received"]').checked = true;
            document.getElementById('paymentModal').style.display = 'flex';
        };

        // Keep amount in sync with lessons x rate unless the user edits amount manually
        document.addEventListener('DOMContentLoaded', () => {
            document.getElementById('paymentLessons').addEventListener('input', () => {
                if (payingIndex < 0) return;
                const rate = students[payingIndex].rate || 15;
                document.getElementById('paymentAmount').value = (parseFloat(document.getElementById('paymentLessons').value) || 0) * rate;
            });

            document.getElementById('dayEntryStudent').addEventListener('change', updateDayEntryAmount);
            document.getElementById('dayEntryLessons').addEventListener('input', updateDayEntryAmount);
        });

        window.closePaymentModal = function() {
            document.getElementById('paymentModal').style.display = 'none';
            payingIndex = -1;
        };

        window.confirmPayment = function() {
            if (payingIndex < 0) return;
            const lessons = Math.max(1, parseInt(document.getElementById('paymentLessons').value) || 0);
            const amount = Math.max(0, parseFloat(document.getElementById('paymentAmount').value) || 0);
            const date = document.getElementById('paymentDate').value || todayStr();
            const status = document.querySelector('input[name="paymentStatus"]:checked').value; // 'received' or 'pending'

            const s = students[payingIndex];
            s.paid = (s.paid || 0) + lessons;
            s.remaining = (s.remaining || 0) + lessons;
            s.paymentHistory.push({ date, amount, lessons, status });

            // A fresh payment means the student is continuing — clear any
            // "Contact Student" flag left over from running out of lessons.
            if (s.status === 'Contact Student') {
                s.status = 'Active';
            }

            saveToLocalStorage();
            closePaymentModal();
            renderTable();
        };

        window.showPendingPaymentsModal = function() {
            const list = document.getElementById('pendingPaymentsList');
            list.innerHTML = '';

            const pendingEntries = [];
            students.forEach((student, sIndex) => {
                (student.paymentHistory || []).forEach((p, pIndex) => {
                    if (p.status === 'pending') pendingEntries.push({ student, sIndex, p, pIndex });
                });
            });

            if (pendingEntries.length === 0) {
                list.innerHTML = '<p style="color:#94a3b8;">No pending payments — everything is up to date.</p>';
            } else {
                pendingEntries
                    .sort((a, b) => (a.p.date || '').localeCompare(b.p.date || ''))
                    .forEach(({ student, sIndex, p, pIndex }) => {
                        const row = document.createElement('div');
                        row.className = 'pending-list-item';
                        row.innerHTML = `
                            <div>
                                <strong>${student.name}</strong><br>
                                <span style="color:#64748b; font-size:0.85rem;">
                                    ${formatDate(p.date)} • ${p.lessons} lesson(s) • ${privacyMode ? '****' : '$' + Math.round(p.amount)}
                                </span>
                            </div>
                            <button class="btn btn-small btn-payment" onclick="markPaymentReceived(${sIndex}, ${pIndex})">Mark Received</button>
                        `;
                        list.appendChild(row);
                    });
            }

            document.getElementById('pendingPaymentsModal').style.display = 'flex';
        };

        window.closePendingPaymentsModal = function() {
            document.getElementById('pendingPaymentsModal').style.display = 'none';
        };

        window.markPaymentReceived = function(sIndex, pIndex) {
            students[sIndex].paymentHistory[pIndex].status = 'received';
            saveToLocalStorage();
            renderTable();
            showPendingPaymentsModal(); // refresh the list in place
        };

        window.disenrollStudent = function(index) {
            const student = students[index];
            if (!confirm(`Disenroll ${student.name}? They'll move to Student History and off the active list.`)) return;
            student.disenrolledDate = todayStr();
            disenrolled.push(student);
            students.splice(index, 1);
            saveToLocalStorage();
            renderTable();
        };

        window.showHistoryModal = function() {
            const list = document.getElementById('historyList');
            list.innerHTML = '';

            if (disenrolled.length === 0) {
                list.innerHTML = '<p style="color:#94a3b8;">No disenrolled students yet.</p>';
            } else {
                disenrolled
                    .map((s, i) => ({ s, i }))
                    .sort((a, b) => (b.s.disenrolledDate || '').localeCompare(a.s.disenrolledDate || ''))
                    .forEach(({ s, i }) => {
                        const row = document.createElement('div');
                        row.className = 'history-list-item';
                        row.innerHTML = `
                            <div>
                                <strong>${s.name}</strong><br>
                                <span style="color:#64748b; font-size:0.85rem;">
                                    Disenrolled ${formatDate(s.disenrolledDate)} • ${s.remaining || 0} lesson(s) were remaining
                                </span>
                            </div>
                            <div class="history-actions">
                                <button class="btn btn-small" onclick="reenrollStudent(${i})">Re-enroll</button>
                                <button class="btn btn-small btn-delete" onclick="deleteDisenrolledPermanently(${i})">Delete</button>
                            </div>
                        `;
                        list.appendChild(row);
                    });
            }

            document.getElementById('historyModal').style.display = 'flex';
        };

        window.closeHistoryModal = function() {
            document.getElementById('historyModal').style.display = 'none';
        };

        window.reenrollStudent = function(index) {
            const student = disenrolled[index];
            delete student.disenrolledDate;
            students.push(student);
            disenrolled.splice(index, 1);
            saveToLocalStorage();
            renderTable();
            showHistoryModal(); // refresh the list in place
        };

        window.deleteDisenrolledPermanently = function(index) {
            const student = disenrolled[index];
            if (!confirm(`Permanently delete ${student.name}'s history? This can't be undone.`)) return;
            disenrolled.splice(index, 1);
            saveToLocalStorage();
            showHistoryModal(); // refresh the list in place
        };

        // ===== Whiteboard =====
        let wbInitialized = false;
        let wbCanvas, wbCtx;
        let wbColor = '#111827';
        let wbSize = 4;
        let wbFontSize = 18;
        let wbTool = 'draw'; // 'draw' | 'eraser' | 'text' | 'line' | 'rect' | 'ellipse'
        let wbDrawing = false;
        let wbDark = false;
        let wbCurrentBoardId = 'general'; // 'general' or 'student:<name>'
        let wbUndoStack = [];
        let wbRedoStack = [];
        const WB_UNDO_LIMIT = 25;
        const WB_LAST_BOARD_KEY = 'studentTrackerWhiteboardLastBoard';
        const WB_LEGACY_KEY = 'studentTrackerWhiteboard_v1'; // pre-multi-board single key

        function wbStorageKeyFor(boardId) {
            return `studentTrackerWhiteboard_v2::${boardId}`;
        }

        function wbBoardLabel(boardId) {
            if (boardId === 'general') return 'General Board';
            if (boardId.startsWith('student:')) return boardId.slice(8);
            return boardId;
        }

        // One-time migration: if the old single-board key has data and the new
        // "general" board hasn't been saved yet, carry it over so nobody loses
        // what they'd already drawn before boards existed.
        function wbMigrateLegacyBoard() {
            try {
                const newKey = wbStorageKeyFor('general');
                if (!localStorage.getItem(newKey) && localStorage.getItem(WB_LEGACY_KEY)) {
                    localStorage.setItem(newKey, localStorage.getItem(WB_LEGACY_KEY));
                }
            } catch (e) { /* ignore */ }
        }

        function renderWbBoardOptions() {
            const sel = document.getElementById('wbBoardSelect');
            if (!sel) return;
            const options = ['general', ...students.map(s => `student:${s.name}`)];
            if (!options.includes(wbCurrentBoardId)) wbCurrentBoardId = 'general';
            sel.innerHTML = options.map(id => {
                const label = id === 'general' ? '📋 General Board' : `👤 ${wbBoardLabel(id)}`;
                return `<option value="${id}" ${id === wbCurrentBoardId ? 'selected' : ''}>${label}</option>`;
            }).join('');
        }

        window.switchWbBoard = function(boardId) {
            saveWhiteboardState(); // persist whatever's on the outgoing board first
            wbCurrentBoardId = boardId;
            localStorage.setItem(WB_LAST_BOARD_KEY, boardId);
            wbUndoStack = [];
            wbRedoStack = [];
            wbCtx.clearRect(0, 0, wbCanvas.width, wbCanvas.height);
            document.getElementById('wbTextLayer').innerHTML = '';
            wbDark = false;
            document.getElementById('wbBoard').classList.remove('wb-dark');
            document.getElementById('wbBgBtn').classList.remove('wb-eraser-active');
            loadWhiteboardState();
        };

        function wbPushUndoState() {
            if (!wbCanvas || !wbCtx) return;
            try {
                wbUndoStack.push(wbCtx.getImageData(0, 0, wbCanvas.width, wbCanvas.height));
                if (wbUndoStack.length > WB_UNDO_LIMIT) wbUndoStack.shift();
                wbRedoStack = [];
            } catch (e) { /* canvas read failed; skip this undo checkpoint */ }
        }

        window.wbUndo = function() {
            if (wbUndoStack.length === 0) return;
            const current = wbCtx.getImageData(0, 0, wbCanvas.width, wbCanvas.height);
            const prev = wbUndoStack.pop();
            wbRedoStack.push(current);
            wbCtx.putImageData(prev, 0, 0);
            wbSaveDebounced();
        };

        window.wbRedo = function() {
            if (wbRedoStack.length === 0) return;
            const current = wbCtx.getImageData(0, 0, wbCanvas.width, wbCanvas.height);
            const next = wbRedoStack.pop();
            wbUndoStack.push(current);
            wbCtx.putImageData(next, 0, 0);
            wbSaveDebounced();
        };

        function wbHandleKeydown(e) {
            if (document.getElementById('whiteboardView').style.display === 'none') return;
            const tag = (e.target.tagName || '').toLowerCase();
            if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return; // don't hijack typing
            const key = e.key.toLowerCase();
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && key === 'z') { e.preventDefault(); window.wbUndo(); }
            else if ((e.ctrlKey || e.metaKey) && (key === 'y' || (e.shiftKey && key === 'z'))) { e.preventDefault(); window.wbRedo(); }
        }

        function setActiveWbToolButton() {
            const map = { draw: 'wbDrawBtn', eraser: 'wbEraserBtn', text: 'wbTextBtn', line: 'wbLineBtn', rect: 'wbRectBtn', ellipse: 'wbEllipseBtn' };
            Object.values(map).forEach(id => {
                const btn = document.getElementById(id);
                if (btn) btn.classList.remove('wb-tool-active');
            });
            const activeBtn = document.getElementById(map[wbTool]);
            if (activeBtn) activeBtn.classList.add('wb-tool-active');
        }

        function wbSaveDebounced() {
            clearTimeout(window.__wbSaveTimer);
            window.__wbSaveTimer = setTimeout(saveWhiteboardState, 400);
        }

        function saveWhiteboardState() {
            try {
                const layer = document.getElementById('wbTextLayer');
                const texts = Array.from(layer.querySelectorAll('.wb-textbox')).map(box => {
                    const content = box.querySelector('.wb-textbox-content');
                    return {
                        leftPct: parseFloat(box.style.left) || 0,
                        topPct: parseFloat(box.style.top) || 0,
                        text: content.innerText,
                        color: content.style.color || wbColor,
                        fontSize: parseInt(content.style.fontSize) || 18
                    };
                });
                const images = Array.from(layer.querySelectorAll('.wb-imagebox')).map(box => {
                    return {
                        leftPct: parseFloat(box.style.left) || 0,
                        topPct: parseFloat(box.style.top) || 0,
                        widthPct: parseFloat(box.style.width) || 20,
                        heightPct: parseFloat(box.style.height) || 20,
                        src: box.querySelector('img').src
                    };
                });
                const state = {
                    image: wbCanvas.toDataURL('image/png'),
                    dark: wbDark,
                    texts,
                    images
                };
                localStorage.setItem(wbStorageKeyFor(wbCurrentBoardId), JSON.stringify(state));
                // Sync to cloud if signed in
                if (window.cloudSync && window.cloudSync.isSignedIn && window.cloudSync.saveWhiteboardToCloud) {
                    window.cloudSync.saveWhiteboardToCloud(wbCurrentBoardId, state);
                }
            } catch (e) {
                console.warn('Could not save whiteboard state', e);
            }
        }

        function wbResizeCanvas(preserve) {
            const board = document.getElementById('wbBoard');
            const rect = board.getBoundingClientRect();
            let prevImage = null;
            if (preserve && wbCanvas.width && wbCanvas.height) {
                prevImage = wbCanvas.toDataURL('image/png');
            }
            const ratio = window.devicePixelRatio || 1;
            wbCanvas.width = Math.max(1, Math.round(rect.width * ratio));
            wbCanvas.height = Math.max(1, Math.round(600 * ratio));
            wbCtx = wbCanvas.getContext('2d');
            wbCtx.lineCap = 'round';
            wbCtx.lineJoin = 'round';
            if (prevImage) {
                const img = new Image();
                img.onload = () => wbCtx.drawImage(img, 0, 0, wbCanvas.width, wbCanvas.height);
                img.src = prevImage;
            }
        }

        window.initWhiteboard = function() {
            if (!wbInitialized) {
                wbMigrateLegacyBoard();
                const lastBoard = localStorage.getItem(WB_LAST_BOARD_KEY);
                if (lastBoard) wbCurrentBoardId = lastBoard;
            }
            renderWbBoardOptions();
            if (wbInitialized) return;
            wbInitialized = true;
            wbCanvas = document.getElementById('wbCanvas');
            wbResizeCanvas(false);
            setActiveWbToolButton();

            let resizeTimer;
            window.addEventListener('resize', () => {
                if (document.getElementById('whiteboardView').style.display === 'none') return;
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => wbResizeCanvas(true), 250);
            });

            window.addEventListener('paste', wbHandlePaste);
            document.addEventListener('keydown', wbHandleKeydown);

            let wbShapeSnapshot = null;
            let wbShapeStart = null;

            wbCanvas.addEventListener('pointerdown', (e) => {
                if (wbTool === 'text') {
                    const board = document.getElementById('wbBoard');
                    const rect = board.getBoundingClientRect();
                    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
                    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
                    addWbTextBox(xPct, yPct, '');
                    return;
                }

                const pos = wbGetCanvasPos(e);
                wbPushUndoState();
                wbDrawing = true;
                wbCanvas.setPointerCapture(e.pointerId);

                if (wbTool === 'line' || wbTool === 'rect' || wbTool === 'ellipse') {
                    wbShapeSnapshot = wbCtx.getImageData(0, 0, wbCanvas.width, wbCanvas.height);
                    wbShapeStart = pos;
                    return;
                }

                wbCtx.beginPath();
                wbCtx.moveTo(pos.x, pos.y);
            });

            wbCanvas.addEventListener('pointermove', (e) => {
                if (!wbDrawing) return;
                const pos = wbGetCanvasPos(e);

                if (wbTool === 'line' || wbTool === 'rect' || wbTool === 'ellipse') {
                    wbCtx.putImageData(wbShapeSnapshot, 0, 0);
                    wbCtx.globalCompositeOperation = 'source-over';
                    wbCtx.strokeStyle = wbColor;
                    wbCtx.lineWidth = wbSize * (window.devicePixelRatio || 1);
                    wbCtx.beginPath();
                    if (wbTool === 'line') {
                        wbCtx.moveTo(wbShapeStart.x, wbShapeStart.y);
                        wbCtx.lineTo(pos.x, pos.y);
                    } else if (wbTool === 'rect') {
                        wbCtx.rect(
                            Math.min(wbShapeStart.x, pos.x),
                            Math.min(wbShapeStart.y, pos.y),
                            Math.abs(pos.x - wbShapeStart.x),
                            Math.abs(pos.y - wbShapeStart.y)
                        );
                    } else {
                        const cx = (wbShapeStart.x + pos.x) / 2;
                        const cy = (wbShapeStart.y + pos.y) / 2;
                        const rx = Math.abs(pos.x - wbShapeStart.x) / 2 || 0.01;
                        const ry = Math.abs(pos.y - wbShapeStart.y) / 2 || 0.01;
                        wbCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
                    }
                    wbCtx.stroke();
                    return;
                }

                wbCtx.globalCompositeOperation = wbTool === 'eraser' ? 'destination-out' : 'source-over';
                wbCtx.strokeStyle = wbColor;
                wbCtx.lineWidth = (wbTool === 'eraser' ? wbSize * 3 : wbSize) * (window.devicePixelRatio || 1);
                wbCtx.lineTo(pos.x, pos.y);
                wbCtx.stroke();
            });

            const wbStopDrawing = () => {
                if (!wbDrawing) return;
                wbDrawing = false;
                wbShapeSnapshot = null;
                wbShapeStart = null;
                wbSaveDebounced();
            };
            wbCanvas.addEventListener('pointerup', wbStopDrawing);
            wbCanvas.addEventListener('pointercancel', wbStopDrawing);
            wbCanvas.addEventListener('pointerleave', wbStopDrawing);

            loadWhiteboardState();
        };

        function wbGetCanvasPos(e) {
            const rect = wbCanvas.getBoundingClientRect();
            const scaleX = wbCanvas.width / rect.width;
            const scaleY = wbCanvas.height / rect.height;
            return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
        }

        function loadWhiteboardState() {
            let state = null;
            try {
                const raw = localStorage.getItem(wbStorageKeyFor(wbCurrentBoardId));
                if (raw) state = JSON.parse(raw);
            } catch (e) { /* ignore corrupt state */ }

            // If no local state and signed in, try loading from cloud
            if (!state && window.cloudSync && window.cloudSync.isSignedIn && window.cloudSync.loadWhiteboardFromCloud) {
                window.cloudSync.loadWhiteboardFromCloud(wbCurrentBoardId).then(function(cloudState) {
                    if (cloudState) {
                        applyWhiteboardState(cloudState);
                        // Also save to localStorage as cache
                        localStorage.setItem(wbStorageKeyFor(wbCurrentBoardId), JSON.stringify(cloudState));
                    }
                });
                return;
            }

            if (!state) return;
            applyWhiteboardState(state);
        }

        function applyWhiteboardState(state) {
            if (state.dark) {
                wbDark = true;
                document.getElementById('wbBoard').classList.add('wb-dark');
                document.getElementById('wbBgBtn').classList.add('wb-eraser-active');
            }
            if (state.image) {
                const img = new Image();
                img.onload = () => wbCtx.drawImage(img, 0, 0, wbCanvas.width, wbCanvas.height);
                img.src = state.image;
            }
            (state.texts || []).forEach(t => addWbTextBox(t.leftPct, t.topPct, t.text, t.color, t.fontSize));
            (state.images || []).forEach(im => addWbImageBox(im.leftPct, im.topPct, im.widthPct, im.heightPct, im.src));
        }
        

        window.setWbColor = function(color, el) {
            wbColor = color;
            if (wbTool === 'eraser') wbTool = 'draw';
            setActiveWbToolButton();
            document.querySelectorAll('.wb-color-swatch').forEach(s => s.classList.remove('active'));
            if (el) el.classList.add('active');
        };

        window.setWbSize = function(v) {
            wbSize = parseInt(v) || 4;
        };

        window.setWbFontSize = function(v) {
            wbFontSize = parseInt(v) || 18;
        };

        window.startWbDrawMode = function() {
            wbTool = 'draw';
            setActiveWbToolButton();
        };

        window.toggleWbEraser = function() {
            wbTool = wbTool === 'eraser' ? 'draw' : 'eraser';
            setActiveWbToolButton();
        };

        window.toggleWbTextMode = function() {
            wbTool = wbTool === 'text' ? 'draw' : 'text';
            setActiveWbToolButton();
        };

        window.setWbShapeTool = function(tool) {
            wbTool = wbTool === tool ? 'draw' : tool;
            setActiveWbToolButton();
        };

        window.toggleWbBackground = function() {
            wbDark = !wbDark;
            document.getElementById('wbBoard').classList.toggle('wb-dark', wbDark);
            document.getElementById('wbBgBtn').classList.toggle('wb-eraser-active', wbDark);
            wbSaveDebounced();
        };

        window.clearWhiteboard = function() {
            if (!confirm(`Clear the "${wbBoardLabel(wbCurrentBoardId)}" board? This removes all drawing and text boxes on this board only.`)) return;
            wbCtx.clearRect(0, 0, wbCanvas.width, wbCanvas.height);
            document.getElementById('wbTextLayer').innerHTML = '';
            wbUndoStack = [];
            wbRedoStack = [];
            try { localStorage.removeItem(wbStorageKeyFor(wbCurrentBoardId)); } catch (e) { /* ignore */ }
            // Also delete from cloud if signed in
            if (window.cloudSync && window.cloudSync.isSignedIn && window.cloudSync.deleteWhiteboardFromCloud) {
                window.cloudSync.deleteWhiteboardFromCloud(wbCurrentBoardId);
            }
        };

        function addWbTextBox(leftPct, topPct, text, color, fontSize) {
            const layer = document.getElementById('wbTextLayer');
            const box = document.createElement('div');
            box.className = 'wb-textbox';
            box.style.left = leftPct + '%';
            box.style.top = topPct + '%';

            const content = document.createElement('div');
            content.className = 'wb-textbox-content';
            content.contentEditable = 'true';
            content.style.color = color || wbColor;
            content.style.fontSize = (fontSize || wbFontSize) + 'px';
            content.innerText = text || '';
            content.addEventListener('input', wbSaveDebounced);
            content.addEventListener('blur', wbSaveDebounced);
            const handle = document.createElement('button');
            handle.className = 'wb-textbox-handle';
            handle.innerHTML = '⠿';
            handle.title = 'Drag to move';

            const removeBtn = document.createElement('button');
            removeBtn.className = 'wb-textbox-remove';
            removeBtn.innerHTML = '×';
            removeBtn.title = 'Remove';
            removeBtn.addEventListener('click', () => { box.remove(); wbSaveDebounced(); });

            box.appendChild(content);
            box.appendChild(handle);
            box.appendChild(removeBtn);
            layer.appendChild(box);

            let dragging = false, startClientX = 0, startClientY = 0, startLeftPct = 0, startTopPct = 0;
            handle.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                dragging = true;
                startClientX = e.clientX;
                startClientY = e.clientY;
                startLeftPct = parseFloat(box.style.left) || 0;
                startTopPct = parseFloat(box.style.top) || 0;
                handle.setPointerCapture(e.pointerId);
            });
            handle.addEventListener('pointermove', (e) => {
                if (!dragging) return;
                const board = document.getElementById('wbBoard');
                const rect = board.getBoundingClientRect();
                const dxPct = ((e.clientX - startClientX) / rect.width) * 100;
                const dyPct = ((e.clientY - startClientY) / rect.height) * 100;
                box.style.left = (startLeftPct + dxPct) + '%';
                box.style.top = (startTopPct + dyPct) + '%';
            });
            const stopDrag = () => { if (dragging) { dragging = false; wbSaveDebounced(); } };
            handle.addEventListener('pointerup', stopDrag);
            handle.addEventListener('pointercancel', stopDrag);

            if (!text) {
                setTimeout(() => content.focus(), 0);
            }
        }

        function wbHandlePaste(e) {
            if (document.getElementById('whiteboardView').style.display === 'none') return;
            const items = (e.clipboardData || window.clipboardData).items;
            if (!items) return;
            for (const item of items) {
                if (item.type.indexOf('image') === 0) {
                    e.preventDefault();
                    const blob = item.getAsFile();
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        const dataUrl = ev.target.result;
                        const tempImg = new Image();
                        tempImg.onload = () => {
                            const board = document.getElementById('wbBoard');
                            const rect = board.getBoundingClientRect();
                            const maxWidthPx = rect.width * 0.4;
                            const maxHeightPx = rect.height * 0.4;
                            const scale = Math.min(1, maxWidthPx / tempImg.naturalWidth, maxHeightPx / tempImg.naturalHeight);
                            const widthPct = (tempImg.naturalWidth * scale / rect.width) * 100;
                            const heightPct = (tempImg.naturalHeight * scale / rect.height) * 100;
                            addWbImageBox(30, 30, widthPct, heightPct, dataUrl);
                            wbSaveDebounced();
                        };
                        tempImg.src = dataUrl;
                    };
                    reader.readAsDataURL(blob);
                    break;
                }
            }
        }

        function addWbImageBox(leftPct, topPct, widthPct, heightPct, src) {
            const layer = document.getElementById('wbTextLayer');
            const box = document.createElement('div');
            box.className = 'wb-imagebox';
            box.style.left = leftPct + '%';
            box.style.top = topPct + '%';
            box.style.width = widthPct + '%';
            box.style.height = heightPct + '%';

            const img = document.createElement('img');
            img.src = src;
            img.draggable = false;

            const handle = document.createElement('button');
            handle.className = 'wb-textbox-handle';
            handle.innerHTML = '⠿';
            handle.title = 'Drag to move';

            const removeBtn = document.createElement('button');
            removeBtn.className = 'wb-textbox-remove';
            removeBtn.innerHTML = '×';
            removeBtn.title = 'Remove';
            removeBtn.addEventListener('click', () => { box.remove(); wbSaveDebounced(); });

            const resizeHandle = document.createElement('button');
            resizeHandle.className = 'wb-imagebox-resize';
            resizeHandle.innerHTML = '⤡';
            resizeHandle.title = 'Drag to resize';

            box.appendChild(img);
            box.appendChild(handle);
            box.appendChild(removeBtn);
            box.appendChild(resizeHandle);
            layer.appendChild(box);

            let dragging = false, startClientX = 0, startClientY = 0, startLeftPct = 0, startTopPct = 0;
            handle.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                dragging = true;
                startClientX = e.clientX;
                startClientY = e.clientY;
                startLeftPct = parseFloat(box.style.left) || 0;
                startTopPct = parseFloat(box.style.top) || 0;
                handle.setPointerCapture(e.pointerId);
            });
            handle.addEventListener('pointermove', (e) => {
                if (!dragging) return;
                const board = document.getElementById('wbBoard');
                const rect = board.getBoundingClientRect();
                const dxPct = ((e.clientX - startClientX) / rect.width) * 100;
                const dyPct = ((e.clientY - startClientY) / rect.height) * 100;
                box.style.left = (startLeftPct + dxPct) + '%';
                box.style.top = (startTopPct + dyPct) + '%';
            });
            const stopDrag = () => { if (dragging) { dragging = false; wbSaveDebounced(); } };
            handle.addEventListener('pointerup', stopDrag);
            handle.addEventListener('pointercancel', stopDrag);

            let resizing = false, resizeStartX = 0, resizeStartY = 0, startWidthPct = 0, startHeightPct = 0;
            resizeHandle.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                resizing = true;
                resizeStartX = e.clientX;
                resizeStartY = e.clientY;
                startWidthPct = parseFloat(box.style.width) || 20;
                startHeightPct = parseFloat(box.style.height) || 20;
                resizeHandle.setPointerCapture(e.pointerId);
            });
            resizeHandle.addEventListener('pointermove', (e) => {
                if (!resizing) return;
                const board = document.getElementById('wbBoard');
                const rect = board.getBoundingClientRect();
                const dxPct = ((e.clientX - resizeStartX) / rect.width) * 100;
                const dyPct = ((e.clientY - resizeStartY) / rect.height) * 100;
                box.style.width = Math.max(5, startWidthPct + dxPct) + '%';
                box.style.height = Math.max(5, startHeightPct + dyPct) + '%';
            });
            const stopResize = () => { if (resizing) { resizing = false; wbSaveDebounced(); } };
            resizeHandle.addEventListener('pointerup', stopResize);
            resizeHandle.addEventListener('pointercancel', stopResize);
        }

        // ---------- Public Booking Requests (from the student-facing booking page) ----------
        // Requests come from Firestore's `bookingRequests` collection (written by
        // booking.html, which anyone with the link can access without signing in).
        // They show up here as "pending" until the teacher confirms or rejects them.
        let pendingBookingRequests = [];

        function renderPendingBookingRequests() {
            const wrap = document.getElementById('pendingBookingRequestsWrap');
            const list = document.getElementById('pendingBookingRequestsList');
            if (!wrap || !list) return;

            if (!window.cloudSync || !window.cloudSync.isSignedIn || !window.cloudSync.getPendingBookingRequests) {
                wrap.style.display = 'none';
                return;
            }

            window.cloudSync.getPendingBookingRequests().then(function(requests) {
                pendingBookingRequests = requests || [];
                if (pendingBookingRequests.length === 0) {
                    wrap.style.display = 'none';
                    list.innerHTML = '';
                    return;
                }
                wrap.style.display = 'block';
                pendingBookingRequests.sort((a, b) => (a.date + ' ' + (a.time || '')).localeCompare(b.date + ' ' + (b.time || '')));
                list.innerHTML = pendingBookingRequests.map(function(r) {
                    const meta = [];
                    if (r.date) meta.push(formatDate(r.date) + (r.time ? ' · ' + formatTime(r.time) : ''));
                    if (r.contact) meta.push(escapeHtml(r.contact));
                    if (r.email) meta.push(escapeHtml(r.email));
                    if (r.modality) meta.push(escapeHtml(r.modality));
                    if (r.contactMethod) meta.push(escapeHtml(r.contactMethod));
                    return `
                        <div class="pending-list-item">
                            <div>
                                <strong>${escapeHtml(r.name || 'Unnamed')}</strong><br>
                                <span style="color:#64748b; font-size:0.85rem;">
                                    ${meta.join(' — ')}
                                </span>
                            </div>
                            <span class="history-actions">
                                <button class="btn btn-small btn-payment" onclick="confirmBookingRequest('${r.id}')" title="Add as a student with this scheduled lesson">✓ Confirm</button>
                                <button class="btn btn-small btn-delete" onclick="rejectBookingRequest('${r.id}')">✕ Reject</button>
                            </span>
                        </div>
                    `;
                }).join('');
            }).catch(function(error) {
                console.error('Error loading booking requests:', error);
            });
        }
        window.renderPendingBookingRequests = renderPendingBookingRequests;

        window.confirmBookingRequest = function(requestId) {
            const req = pendingBookingRequests.find(r => r.id === requestId);
            if (!req) return;
            if (!confirm(`Confirm booking for ${req.name} on ${formatDate(req.date)}${req.time ? ' at ' + formatTime(req.time) : ''}?\n\nThis adds them to your student list (or adds the slot to an existing student with the same name) with this lesson scheduled.`)) return;

            // Match an existing active student by name (case-insensitive); otherwise create a new one.
            let student = students.find(s => s.name.trim().toLowerCase() === (req.name || '').trim().toLowerCase());
            if (!student) {
                student = {
                    name: req.name || 'New Student',
                    level: 'TBD',
                    modality: req.modality || 'Online',
                    paid: 0,
                    remaining: 0,
                    rate: 15,
                    lastLesson: '',
                    scheduledLessons: [],
                    notes: req.email ? `Email: ${req.email}` : '',
                    whatsapp: req.contact || '',
                    address: '',
                    age: '',
                    status: 'Active',
                    lessonHistory: [],
                    paymentHistory: [],
                    progressEntries: [],
                    vocabulary: []
                };
                students.push(student);
            } else {
                if (!student.whatsapp && req.contact) student.whatsapp = req.contact;
            }

            if (!Array.isArray(student.scheduledLessons)) student.scheduledLessons = [];
            student.scheduledLessons.push({ date: req.date, time: req.time || '' });
            student.scheduledLessons.sort((a, b) => a.date.localeCompare(b.date) || (a.time || '00:00').localeCompare(b.time || '00:00'));

            saveToLocalStorage(); // also republishes availability to the booking page
            if (window.cloudSync && window.cloudSync.updateBookingRequestStatus) {
                window.cloudSync.updateBookingRequestStatus(requestId, 'confirmed');
            }
            pendingBookingRequests = pendingBookingRequests.filter(r => r.id !== requestId);
            renderTable();
            renderCalendar();
            renderDashboard();
            renderPendingBookingRequests();
        };

        window.rejectBookingRequest = function(requestId) {
            if (!confirm('Reject this booking request? The requested slot will remain open for other students.')) return;
            if (window.cloudSync && window.cloudSync.updateBookingRequestStatus) {
                window.cloudSync.updateBookingRequestStatus(requestId, 'rejected');
            }
            pendingBookingRequests = pendingBookingRequests.filter(r => r.id !== requestId);
            renderPendingBookingRequests();
        };

        window.copyBookingLink = function() {
            const input = document.getElementById('bookingLinkInput');
            if (!input) return;
            input.select();
            input.setSelectionRange(0, 99999);
            try {
                navigator.clipboard.writeText(input.value);
                alert('Booking page link copied to clipboard!');
            } catch (e) {
                document.execCommand('copy');
                alert('Booking page link copied to clipboard!');
            }
        };

        function initBookingLinkField() {
            const input = document.getElementById('bookingLinkInput');
            if (!input) return;
            input.value = new URL('./booking.html', window.location.href).toString();
        }

        // Initialize
        loadFromLocalStorage();
        loadHiddenColumns();
        renderTable();
        updateColumnVisibilityStyle();
        applyDefaultColumnWidths();
        updateCalStyleButton();

        document.getElementById('studentModal').addEventListener('click', function(e) {
            if (e.target === this) closeModal();
        });
        document.getElementById('paymentModal').addEventListener('click', function(e) {
            if (e.target === this) closePaymentModal();
        });
        document.getElementById('lessonModal').addEventListener('click', function(e) {
            if (e.target === this) closeLessonModal();
        });
        document.getElementById('pendingPaymentsModal').addEventListener('click', function(e) {
            if (e.target === this) closePendingPaymentsModal();
        });
        document.getElementById('historyModal').addEventListener('click', function(e) {
            if (e.target === this) closeHistoryModal();
        });
        document.getElementById('dayDetailsModal').addEventListener('click', function(e) {
            if (e.target === this) closeDayDetailsModal();
        });
        document.getElementById('dayEntryModal').addEventListener('click', function(e) {
            if (e.target === this) closeDayEntryModal();
        });

        makeColumnsResizable();
        initBookingLinkField();
        switchView('dashboard');

        // Live clock
        function updateClock() {
            const now = new Date();
            const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const date = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const el = document.getElementById('liveClock');
            if (el) el.innerHTML = `${time}<div class="live-clock-date">${date}</div>`;
        }
        updateClock();
        setInterval(updateClock, 1000);

        // Keep the Dashboard's "Next Up" date accurate even if the tab is left
        // open across midnight without any other interaction.
        setInterval(() => {
            const dash = document.getElementById('dashboardView');
            if (dash && dash.style.display !== 'none') renderDashboard();
        }, 60000);

        // Periodically check for new booking requests from the public booking
        // page, so they show up without the teacher needing to switch tabs.
        setInterval(() => {
            if (typeof renderPendingBookingRequests === 'function') renderPendingBookingRequests();
        }, 30000);
