// ============================================================================
// booking.js — Public student-facing booking page
// ============================================================================
// This page is meant to be shared with potential students. It does NOT
// require sign-in. It reads a public, name-free "busy slots" list from
// Firestore (published by the teacher's app whenever their schedule changes)
// and lets visitors submit a booking request, which lands in the teacher's
// Dashboard as "Pending Booking Requests" for them to confirm or reject.
//
// See the comment block at the top of cloudSync.js for the Firestore
// security rules this page expects.
// ============================================================================

(function() {
    'use strict';

    // ---- Firebase Configuration (same project as the main app) ----
    var firebaseConfig = {
        apiKey: "AIzaSyDFSqHBKDKksROx4Lg5L3DqX6r5HsjzQvg",
        authDomain: "student-tracker-79d38.firebaseapp.com",
        projectId: "student-tracker-79d38",
        storageBucket: "student-tracker-79d38.firebasestorage.app",
        messagingSenderId: "905744546124",
        appId: "1:905744546124:web:d1f54d5d1027fa63ca37e9",
        measurementId: "G-FVQQ02HGL7"
    };

    firebase.initializeApp(firebaseConfig);
    var db = firebase.firestore();

    // ---- Translations ----
    var lang = localStorage.getItem('bookingLang') || 'en';

    var TRANS = {
        en: {
            title: '🏫🗽 Book an English Lesson',
            subtitle: 'Pick an open slot below and send a request \u2014 your teacher will confirm it shortly.',
            cta: '\uD83D\uDCC5 Book a Lesson',
            prevWeek: '\u2039 Previous Week',
            nextWeek: 'Next Week \u203A',
            thisWeek: 'This Week',
            jumpTo: 'Jump to date:',
            legendAvail: 'Available \u2014 click to request',
            legendUnavail: 'Unavailable',
            legendRequested: 'Just requested by you',
            legendPast: 'Past',
            errorBanner: '\u26A0\uFE0F Couldn\u2019t load current availability, so booking is temporarily paused (to avoid double-booking a slot that\u2019s actually taken).',
            retry: 'Retry',
            morning: '\uD83C\uDF05 Morning',
            afternoon: '\u2600\uFE0F Afternoon',
            openCount: function(n) { return n + ' open this week'; },
            notConfigured: 'Not configured',
            noTimeBlocks: 'No time blocks configured for this period yet.',
            modalTitle: 'Request This Lesson',
            labelName: 'Your name *',
            labelContact: 'Phone / WhatsApp *',
            labelEmail: 'Email (optional)',
            labelModality: 'Preferred Modality',
            labelContactMethod: 'Preferred Contact',
            modOnline: 'Online',
            modInPerson: 'In Person',
            modBoth: 'No preference',
            ctWhatsApp: 'WhatsApp',
            ctEmail: 'Email',
            ctPhone: 'Phone call',
            cancel: 'Cancel',
            confirm: 'Confirm Request',
            footer: 'Lessons are booked in 1-hour blocks, starting on the hour or half hour. Submitting a request does not guarantee the slot \u2014 your teacher will confirm it.',
            errName: 'Please enter your name.',
            errContact: 'Please enter a phone or WhatsApp number.',
            sending: 'Sending\u2026',
            successMsg: 'Request sent! Your teacher will confirm this lesson soon.',
            errorMsg: 'Something went wrong sending your request. Please try again.',
            loadError: 'Could not load current availability, so booking is temporarily paused. Please reload the page or contact your teacher directly.',
            tooltipAvail: function(d, t) { return d + ' at ' + t + ' \u2014 click to request'; },
            tooltipUnknown: function(d, t) { return d + ' at ' + t + ' \u2014 availability unknown, please reload'; },
            tooltipBlocked: function(d, t) { return d + ' at ' + t + ' \u2014 not offered'; },
            tooltipStatus: function(d, t, s) { return d + ' at ' + t + ' \u2014 ' + s; }
        },
        es: {
            title: '\uD83C\uDFEB\uD83C\uDDFA Reserva una Clase de Ingl\u00E9s',
            subtitle: 'Elige un horario disponible y env\u00EDa una solicitud \u2014 tu profesor la confirmar\u00E1 pronto.',
            cta: '\uD83D\uDCC5 Reservar una Clase',
            prevWeek: '\u2039 Semana Anterior',
            nextWeek: 'Siguiente Semana \u203A',
            thisWeek: 'Esta Semana',
            jumpTo: 'Ir a fecha:',
            legendAvail: 'Disponible \u2014 haz clic para solicitar',
            legendUnavail: 'No disponible',
            legendRequested: 'Reci\u00E9n solicitado por ti',
            legendPast: 'Pasado',
            errorBanner: '\u26A0\uFE0F No se pudo cargar la disponibilidad actual, la reserva est\u00E1 pausada temporalmente.',
            retry: 'Reintentar',
            morning: '\uD83C\uDF05 Ma\u00F1ana',
            afternoon: '\u2600\uFE0F Tarde',
            openCount: function(n) { return n + ' disponibles esta semana'; },
            notConfigured: 'No configurado',
            noTimeBlocks: 'No hay horarios configurados para este per\u00EDodo todav\u00EDa.',
            modalTitle: 'Solicitar Esta Clase',
            labelName: 'Tu nombre *',
            labelContact: 'Tel\u00E9fono / WhatsApp *',
            labelEmail: 'Correo (opcional)',
            labelModality: 'Modalidad Preferida',
            labelContactMethod: 'Contacto Preferido',
            modOnline: 'En l\u00EDnea',
            modInPerson: 'Presencial',
            modBoth: 'Sin preferencia',
            ctWhatsApp: 'WhatsApp',
            ctEmail: 'Correo',
            ctPhone: 'Llamada',
            cancel: 'Cancelar',
            confirm: 'Confirmar Solicitud',
            footer: 'Las clases se reservan en bloques de 1 hora, comenzando en la hora o media hora. Enviar una solicitud no garantiza el horario \u2014 tu profesor lo confirmar\u00E1.',
            errName: 'Por favor ingresa tu nombre.',
            errContact: 'Por favor ingresa un n\u00FAmero de tel\u00E9fono o WhatsApp.',
            sending: 'Enviando\u2026',
            successMsg: '\u00A1Solicitud enviada! Tu profesor confirmar\u00E1 esta clase pronto.',
            errorMsg: 'Algo sali\u00F3 mal al enviar tu solicitud. Por favor intenta de nuevo.',
            loadError: 'No se pudo cargar la disponibilidad actual. Por favor recarga la p\u00E1gina o contacta a tu profesor directamente.',
            tooltipAvail: function(d, t) { return d + ' a las ' + t + ' \u2014 haz clic para solicitar'; },
            tooltipUnknown: function(d, t) { return d + ' a las ' + t + ' \u2014 disponibilidad desconocida, recarga'; },
            tooltipBlocked: function(d, t) { return d + ' a las ' + t + ' \u2014 no disponible'; },
            tooltipStatus: function(d, t, s) { return d + ' a las ' + t + ' \u2014 ' + s; }
        }
    };

    function t(key) { return (TRANS[lang] || TRANS.en)[key] || key; }
    function tf(key) { return (TRANS[lang] || TRANS.en)[key]; }

    var DAY_NAMES_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    var MONTH_NAMES_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var MODALITY_OPTIONS = {
        en: ['Online', 'In Person', 'Both'],
        es: ['En l\u00EDnea', 'Presencial', 'Sin preferencia']
    };
    var CONTACT_OPTIONS = {
        en: ['WhatsApp', 'Email', 'Phone'],
        es: ['WhatsApp', 'Correo', 'Llamada']
    };
    var MODALITY_VALUES = ['Online', 'In Person', 'Both'];
    var CONTACT_VALUES = ['WhatsApp', 'Email', 'Phone'];

    // ---- Business hours: half-hour slots, each starting a bookable 1-hour block ----
    var START_HOUR = 8;
    var LAST_START_HOUR = 20;
    var LAST_START_MIN = 30;

    function buildSlotTimes() {
        var times = [];
        var h = START_HOUR, m = 0;
        while (h < LAST_START_HOUR || (h === LAST_START_HOUR && m <= LAST_START_MIN)) {
            times.push(String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'));
            m += 30;
            if (m >= 60) { m = 0; h += 1; }
        }
        return times;
    }
    var SLOT_TIMES = buildSlotTimes();

    // ---- Date helpers ----
    function toDateStr(d) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function mondayOf(date) {
        var d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        var dow = (d.getDay() + 6) % 7;
        d.setDate(d.getDate() - dow);
        return d;
    }

    function addDays(date, n) {
        var d = new Date(date);
        d.setDate(d.getDate() + n);
        return d;
    }

    function minutesOf(timeStr) {
        var parts = timeStr.split(':').map(Number);
        return parts[0] * 60 + parts[1];
    }

    function formatTimeLabel(timeStr) {
        var parts = timeStr.split(':').map(Number);
        var h = parts[0], m = parts[1];
        var ampm = h >= 12 ? 'PM' : 'AM';
        var h12 = h % 12;
        if (h12 === 0) h12 = 12;
        return h12 + ':' + String(m).padStart(2, '0') + ' ' + ampm;
    }

    function formatDateLabel(date) {
        return DAY_NAMES_SHORT[(date.getDay() + 6) % 7] + ', ' + MONTH_NAMES_SHORT[date.getMonth()] + ' ' + date.getDate();
    }

    // ---- State ----
    var currentWeekStart = mondayOf(new Date());
    var busySlots = [];
    var requestedThisSession = new Set();
    var pendingSlot = null;

    var weeklyAvailability = null;
    var morningStart = '08:00';
    var morningEnd = '13:00';
    var afternoonStart = '13:00';
    var afternoonEnd = '20:30';
    var hideWeekendsBooking = false;

    var morningExpanded = false;
    var afternoonExpanded = false;

    // ---- Language toggle ----
    window.toggleLang = function() {
        lang = (lang === 'en') ? 'es' : 'en';
        localStorage.setItem('bookingLang', lang);
        applyTranslations();
        renderGrid();
    };

    function applyTranslations() {
        var btn = document.getElementById('langToggleBtn');
        if (btn) btn.textContent = (lang === 'en') ? 'ES' : 'EN';

        setText('pageTitle', t('title'));
        setText('pageSubtitle', t('subtitle'));
        setText('ctaBtn', t('cta'));
        setText('prevWeekBtn', t('prevWeek'));
        setText('nextWeekBtn', t('nextWeek'));
        setText('thisWeekBtn', t('thisWeek'));
        setText('jumpLabel', t('jumpTo'));
        setText('legendAvailable', t('legendAvail'));
        setText('legendUnavailable', t('legendUnavail'));
        setText('legendRequested', t('legendRequested'));
        setText('legendPast', t('legendPast'));
        setText('errorBannerMsg', t('errorBanner'));
        setText('retryBtn', t('retry'));
        setText('bookingFooter', t('footer'));
        setText('modalTitle', t('modalTitle'));
        setText('labelName', t('labelName'));
        setText('labelContact', t('labelContact'));
        setText('labelEmail', t('labelEmail'));
        setText('labelModality', t('labelModality'));
        setText('labelContactMethod', t('labelContactMethod'));
        setText('cancelBtn', t('cancel'));

        var submitBtn = document.getElementById('bookingSubmitBtn');
        if (submitBtn && !submitBtn.disabled) submitBtn.textContent = t('confirm');

        var loadMsg = document.getElementById('loadingMsg');
        if (loadMsg) loadMsg.textContent = lang === 'es' ? 'Cargando disponibilidad\u2026' : 'Loading availability\u2026';

        // Update modality select options
        var modSel = document.getElementById('bookingModality');
        if (modSel) {
            var opts = MODALITY_OPTIONS[lang] || MODALITY_OPTIONS.en;
            for (var i = 0; i < modSel.options.length; i++) {
                modSel.options[i].textContent = opts[i] || MODALITY_VALUES[i];
            }
        }

        // Update contact method select options
        var ctSel = document.getElementById('bookingContactMethod');
        if (ctSel) {
            var copts = CONTACT_OPTIONS[lang] || CONTACT_OPTIONS.en;
            for (var j = 0; j < ctSel.options.length; j++) {
                ctSel.options[j].textContent = copts[j] || CONTACT_VALUES[j];
            }
        }

        // Update page lang attribute
        document.documentElement.lang = lang === 'es' ? 'es' : 'en';
    }

    function setText(id, val) {
        var el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    // ---- Load availability ----
    var availabilityLoadFailed = false;

    function loadAvailability() {
        return db.collection('publicAvailability').doc('busySlots').get().then(function(doc) {
            var data = doc.exists ? doc.data() : {};
            busySlots = Array.isArray(data.slots) ? data.slots : [];
            weeklyAvailability = (data.weeklyAvailability && typeof data.weeklyAvailability === 'object') ? data.weeklyAvailability : null;
            morningStart = data.morningStart || '08:00';
            morningEnd = data.morningEnd || '13:00';
            afternoonStart = data.afternoonStart || '13:00';
            afternoonEnd = data.afternoonEnd || '20:30';
            hideWeekendsBooking = !!data.hideWeekendsBooking;
            availabilityLoadFailed = false;
        }).catch(function(error) {
            console.error('Error loading availability:', error);
            busySlots = [];
            availabilityLoadFailed = true;
            showToast(t('loadError'), 'error');
        }).finally(function() {
            var banner = document.getElementById('availabilityErrorBanner');
            if (banner) banner.style.display = availabilityLoadFailed ? 'flex' : 'none';
        });
    }

    window.retryLoadAvailability = function() {
        document.getElementById('loadingMsg').style.display = 'block';
        document.getElementById('bookingGrid').style.display = 'none';
        loadAvailability().then(renderGrid);
    };

    function isBusy(dateStr, timeStr) {
        var slotStart = minutesOf(timeStr);
        var slotEnd = slotStart + 30;
        return busySlots.some(function(b) {
            if (b.date !== dateStr || !b.time) return false;
            var busyStart = minutesOf(b.time);
            var busyEnd = busyStart + 60;
            return slotStart < busyEnd && slotEnd > busyStart;
        });
    }

    function isOfferedForBooking(dayIdx, timeStr) {
        if (!weeklyAvailability) return true;
        var dayMap = weeklyAvailability[dayIdx];
        if (!dayMap || !(timeStr in dayMap)) return true;
        return !!dayMap[timeStr];
    }

    function computeSlotStatus(dateStr, timeStr, dayIdx, now) {
        var slotDateTime = new Date(dateStr + 'T' + timeStr + ':00');
        var key = dateStr + '|' + timeStr;
        if (slotDateTime < now) return 'past';
        if (requestedThisSession.has(key)) return 'requested';
        if (availabilityLoadFailed) return 'unknown';
        if (!isOfferedForBooking(dayIdx, timeStr)) return 'blocked';
        if (isBusy(dateStr, timeStr)) return 'unavailable';
        return 'available';
    }

    // ---- Rendering ----
    function renderWeekLabel() {
        var weekEnd = addDays(currentWeekStart, 6);
        var label = MONTH_NAMES_SHORT[currentWeekStart.getMonth()] + ' ' + currentWeekStart.getDate() + ' \u2013 ' +
            MONTH_NAMES_SHORT[weekEnd.getMonth()] + ' ' + weekEnd.getDate() + ', ' + weekEnd.getFullYear();
        document.getElementById('weekLabel').textContent = label;
    }

    function renderGrid() {
        renderWeekLabel();
        var container = document.getElementById('bookingGrid');
        container.innerHTML = '';

        var todayStrVal = toDateStr(new Date());
        var now = new Date();

        var dayDates = [];
        for (var i = 0; i < 7; i++) {
            dayDates.push(addDays(currentWeekStart, i));
        }

        if (hideWeekendsBooking) {
            dayDates = dayDates.filter(function(d, idx) { return idx < 5; });
        }

        var morningTimes = SLOT_TIMES.filter(function(t) {
            return minutesOf(t) >= minutesOf(morningStart) && minutesOf(t) < minutesOf(morningEnd);
        });
        var afternoonTimes = SLOT_TIMES.filter(function(t) {
            return minutesOf(t) >= minutesOf(afternoonStart) && minutesOf(t) < minutesOf(afternoonEnd);
        });

        container.appendChild(buildAccordionSection(
            'morning', t('morning'),
            formatTimeLabel(morningStart) + ' \u2013 ' + formatTimeLabel(morningEnd),
            morningTimes, dayDates, todayStrVal, now, morningExpanded
        ));
        container.appendChild(buildAccordionSection(
            'afternoon', t('afternoon'),
            formatTimeLabel(afternoonStart) + ' \u2013 ' + formatTimeLabel(afternoonEnd),
            afternoonTimes, dayDates, todayStrVal, now, afternoonExpanded
        ));

        document.getElementById('loadingMsg').style.display = 'none';
        container.style.display = 'block';
    }

    function buildAccordionSection(id, title, rangeLabel, times, dayDates, todayStrVal, now, expanded) {
        var section = document.createElement('div');
        section.className = 'booking-accordion-section';

        var availableCount = 0;
        times.forEach(function(tp) {
            dayDates.forEach(function(d, dayIdx) {
                if (computeSlotStatus(toDateStr(d), tp, dayIdx, now) === 'available') availableCount++;
            });
        });

        var header = document.createElement('button');
        header.type = 'button';
        header.className = 'booking-accordion-header';

        var countText = times.length === 0 ? t('notConfigured') : tf('openCount')(availableCount);
        header.innerHTML =
            '<span class="booking-accordion-arrow' + (expanded ? ' open' : '') + '">\u25B6</span>' +
            '<span class="booking-accordion-title">' + title + '</span>' +
            '<span class="booking-accordion-range">' + rangeLabel + '</span>' +
            '<span class="booking-accordion-count">' + countText + '</span>';
        header.addEventListener('click', function() { toggleAccordionSection(id); });
        section.appendChild(header);

        var content = document.createElement('div');
        content.className = 'booking-accordion-content';
        content.style.display = expanded ? 'block' : 'none';

        if (times.length === 0) {
            var empty = document.createElement('p');
            empty.className = 'booking-accordion-empty';
            empty.textContent = t('noTimeBlocks');
            content.appendChild(empty);
        } else {
            content.appendChild(buildSectionGrid(times, dayDates, todayStrVal, now));
        }

        section.appendChild(content);
        return section;
    }

    function buildSectionGrid(times, dayDates, todayStrVal, now) {
        var grid = document.createElement('div');
        grid.className = 'booking-grid';
        grid.style.gridTemplateColumns = '90px repeat(' + dayDates.length + ', 1fr)';

        var corner = document.createElement('div');
        corner.className = 'booking-corner';
        grid.appendChild(corner);

        dayDates.forEach(function(d, i) {
            var header = document.createElement('div');
            header.className = 'booking-day-header' + (toDateStr(d) === todayStrVal ? ' is-today' : '');
            header.innerHTML = DAY_NAMES_SHORT[i] + '<span class="booking-day-date">' + MONTH_NAMES_SHORT[d.getMonth()] + ' ' + d.getDate() + '</span>';
            grid.appendChild(header);
        });

        times.forEach(function(timeStr) {
            var isHourBoundary = timeStr.endsWith(':00');

            var timeCell = document.createElement('div');
            timeCell.className = 'booking-time-cell' + (isHourBoundary ? ' hour-boundary' : '');
            timeCell.textContent = isHourBoundary ? formatTimeLabel(timeStr) : '';
            grid.appendChild(timeCell);

            dayDates.forEach(function(d, dayIdx) {
                var dateStr = toDateStr(d);
                var status = computeSlotStatus(dateStr, timeStr, dayIdx % 7, now);
                var fDate = formatDateLabel(d);
                var fTime = formatTimeLabel(timeStr);

                var cell = document.createElement('div');
                cell.className = 'booking-slot' + (isHourBoundary ? ' hour-boundary' : '') + ' ' + status;

                if (status === 'available') {
                    cell.title = tf('tooltipAvail')(fDate, fTime);
                    cell.addEventListener('click', function() {
                        openBookingModal(dateStr, timeStr, d);
                    });
                } else if (status === 'unknown') {
                    cell.title = tf('tooltipUnknown')(fDate, fTime);
                } else if (status === 'blocked') {
                    cell.title = tf('tooltipBlocked')(fDate, fTime);
                } else {
                    cell.title = tf('tooltipStatus')(fDate, fTime, status);
                }

                grid.appendChild(cell);
            });
        });

        return grid;
    }

    window.toggleAccordionSection = function(id) {
        if (id === 'morning') morningExpanded = !morningExpanded;
        if (id === 'afternoon') afternoonExpanded = !afternoonExpanded;
        renderGrid();
    };

    // ---- Week navigation ----
    window.changeWeek = function(delta) {
        currentWeekStart = addDays(currentWeekStart, delta * 7);
        renderGrid();
    };

    window.goToCurrentWeek = function() {
        currentWeekStart = mondayOf(new Date());
        renderGrid();
    };

    window.jumpToDate = function(dateValue) {
        if (!dateValue) return;
        var parts = dateValue.split('-').map(Number);
        var d = new Date(parts[0], parts[1] - 1, parts[2]);
        currentWeekStart = mondayOf(d);
        renderGrid();
    };

    // ---- Booking modal ----
    window.openBookingModal = function(dateStr, timeStr, dateObj) {
        pendingSlot = { date: dateStr, time: timeStr };
        document.getElementById('bookingSlotLabel').textContent = formatDateLabel(dateObj) + ' at ' + formatTimeLabel(timeStr);
        document.getElementById('bookingName').value = '';
        document.getElementById('bookingContact').value = '';
        document.getElementById('bookingEmail').value = '';
        document.getElementById('bookingModality').selectedIndex = 0;
        document.getElementById('bookingContactMethod').selectedIndex = 0;
        document.getElementById('bookingModal').style.display = 'flex';
        document.getElementById('bookingSubmitBtn').disabled = false;
        document.getElementById('bookingSubmitBtn').textContent = t('confirm');
    };

    window.closeBookingModal = function() {
        document.getElementById('bookingModal').style.display = 'none';
        pendingSlot = null;
    };

    window.submitBookingRequest = function() {
        if (!pendingSlot) return;
        var name = document.getElementById('bookingName').value.trim();
        var contact = document.getElementById('bookingContact').value.trim();
        var email = document.getElementById('bookingEmail').value.trim();
        var modality = document.getElementById('bookingModality').value;
        var contactMethod = document.getElementById('bookingContactMethod').value;

        if (!name) { showToast(t('errName'), 'error'); return; }
        if (!contact) { showToast(t('errContact'), 'error'); return; }

        var btn = document.getElementById('bookingSubmitBtn');
        btn.disabled = true;
        btn.textContent = t('sending');

        db.collection('bookingRequests').add({
            name: name,
            contact: contact,
            email: email || '',
            modality: modality,
            contactMethod: contactMethod,
            date: pendingSlot.date,
            time: pendingSlot.time,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(function() {
            requestedThisSession.add(pendingSlot.date + '|' + pendingSlot.time);
            closeBookingModal();
            renderGrid();
            showToast(t('successMsg'), 'success');
        }).catch(function(error) {
            console.error('Error submitting booking request:', error);
            showToast(t('errorMsg'), 'error');
        }).finally(function() {
            btn.disabled = false;
            btn.textContent = t('confirm');
        });
    };

    document.getElementById('bookingModal').addEventListener('click', function(e) {
        if (e.target === this) closeBookingModal();
    });

    // ---- Toast ----
    var toastTimer = null;
    function showToast(message, type) {
        var toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = 'booking-toast ' + (type || '');
        toast.style.display = 'block';
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function() { toast.style.display = 'none'; }, 5000);
    }

    // ---- Init ----
    // Auto-advance to next week if today is Saturday or Sunday
    var todayDow = (new Date().getDay() + 6) % 7; // 0=Mon..6=Sun
    if (todayDow >= 5) {
        currentWeekStart = addDays(mondayOf(new Date()), 7);
    }

    applyTranslations();
    loadAvailability().then(renderGrid);

    setInterval(function() {
        loadAvailability().then(renderGrid);
    }, 60000);
})();
