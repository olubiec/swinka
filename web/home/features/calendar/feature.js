(() => {
  const demoState = {
    pigs: ["Pumpkin", "Oreo"],
    profiles: [
      { name: "Pumpkin", birthDate: "2025-05-10", adoptedDate: "2025-06-01", baselineGrams: 950 },
      { name: "Oreo", birthDate: "2025-08-15", adoptedDate: "2025-09-01", baselineGrams: 1000 }
    ],
    manualOptIn: false,
    tasks: [
      { id: "veggies", title: "Fresh veggies", text: "1 cup of mixed vegetables per pig.", schedule: "daily", time: "18:00", enabled: true, due: true, streak: 5, weightLog: false },
      { id: "weigh", title: "Weekly weigh-in", text: "Track their weight to spot health issues early.", schedule: "weekly", time: "10:00", weekday: 0, enabled: true, due: true, streak: 12, weightLog: true },
      { id: "spot_clean", title: "Spot clean", text: "Remove soiled bedding and old food.", schedule: "daily", time: "20:00", enabled: true, due: false, nextDue: "2026-10-25T20:00", streak: 3, weightLog: false }
    ],
    history: [
      { date: new Date().toISOString().split('T')[0], taskId: "spot_clean" },
      { date: new Date(Date.now() - 86400000).toISOString().split('T')[0], taskId: "veggies" },
      { date: new Date(Date.now() - 86400000).toISOString().split('T')[0], taskId: "spot_clean" }
    ],
    weights: [
      { date: "2026-10-01", pig: "Pumpkin", grams: 1050 },
      { date: "2026-10-08", pig: "Pumpkin", grams: 1040 },
      { date: "2026-10-15", pig: "Pumpkin", grams: 1020 },
      { date: "2026-10-22", pig: "Pumpkin", grams: 1000 },
      { date: "2026-10-01", pig: "Oreo", grams: 1100 },
      { date: "2026-10-22", pig: "Oreo", grams: 1120 }
    ],
    alerts: ["Pumpkin lost 50 g since 1 Oct. Watch her and see a vet if it continues."],
    snoozeMinutes: [15, 60, 180],
    cloversPerTask: 5,
    cloversToday: 10,
    cloversMaxToday: 30
  };

  // Register mock handlers and state initializer with CuyBridge for headless / browser testing
  if (typeof window !== 'undefined' && window.bridge) {
    if (typeof window.bridge.registerMockState === 'function') {
      window.bridge.registerMockState('calendar', (s) => {
        if (!s.calendar) {
          s.calendar = JSON.parse(JSON.stringify(demoState));
        } else {
          if (!s.calendar.profiles) {
            s.calendar.profiles = JSON.parse(JSON.stringify(demoState.profiles));
          }
          if (s.calendar.manualOptIn === undefined) {
            s.calendar.manualOptIn = false;
          }
        }
      });
    }

    if (typeof window.bridge.registerMockHandler === 'function') {
      window.bridge.registerMockHandler('calendar_done', (s, action) => {
        const cal = s.calendar;
        if (!cal || !cal.tasks) return;
        const task = cal.tasks.find(t => t.id === action.taskId);
        if (task) {
          task.due = false;
          task.streak = (task.streak || 0) + 1;
        }
        if (!cal.history) cal.history = [];
        cal.history.push({ date: new Date().toISOString().split('T')[0], taskId: action.taskId });
        if (cal.cloversToday !== undefined && cal.cloversPerTask) {
          cal.cloversToday = Math.min(cal.cloversMaxToday || 30, cal.cloversToday + cal.cloversPerTask);
        }
      });

      window.bridge.registerMockHandler('calendar_snooze', (s, action) => {
        const cal = s.calendar;
        if (!cal || !cal.tasks) return;
        const task = cal.tasks.find(t => t.id === action.taskId);
        if (task) {
          task.due = false;
        }
      });

      window.bridge.registerMockHandler('calendar_settings', (s, action) => {
        const cal = s.calendar;
        if (!cal) return;
        if (Array.isArray(action.pigs)) {
          cal.pigs = [...action.pigs];
        }
        if (Array.isArray(action.tasks) && Array.isArray(cal.tasks)) {
          action.tasks.forEach(ut => {
            const t = cal.tasks.find(item => item.id === ut.id);
            if (t) {
              if (ut.enabled !== undefined) {
                t.enabled = ut.enabled;
                t.optedIn = ut.enabled;
              }
              if (ut.time !== undefined) t.time = ut.time;
              if (ut.weekday !== undefined) t.weekday = ut.weekday;
              if (ut.everyDays !== undefined) t.everyDays = ut.everyDays;
            }
          });
        }
      });

      window.bridge.registerMockHandler('calendar_profile', (s, action) => {
        const cal = s.calendar;
        if (!cal) return;
        if (!cal.pigs) cal.pigs = [];
        if (!cal.profiles) cal.profiles = [];
        const pigName = action.pig || action.name;
        if (!pigName) return;
        if (!cal.pigs.includes(pigName)) {
          cal.pigs.push(pigName);
        }
        let prof = cal.profiles.find(p => p.name === pigName);
        if (!prof) {
          prof = { name: pigName };
          cal.profiles.push(prof);
        }
        if (action.birthDate !== undefined) prof.birthDate = action.birthDate;
        if (action.adoptedDate !== undefined) prof.adoptedDate = action.adoptedDate;
        if (action.baselineGrams !== undefined) prof.baselineGrams = action.baselineGrams;
      });

      window.bridge.registerMockHandler('calendar_weight', (s, action) => {
        const cal = s.calendar;
        const date = action.date || new Date().toISOString().split('T')[0];
        if (cal) {
          if (!cal.weights) cal.weights = [];
          cal.weights = cal.weights.filter(w => !(w.pig === action.pig && w.date === date));
          cal.weights.push({ pig: action.pig, grams: action.grams, date });
          if (Array.isArray(cal.tasks)) {
            cal.tasks.forEach(t => {
              if (t.id === 'weigh' || t.weightLog) {
                t.due = false;
                t.lastDone = date;
              }
            });
          }
        }
        if (!demoState.weights) demoState.weights = [];
        demoState.weights = demoState.weights.filter(w => !(w.pig === action.pig && w.date === date));
        demoState.weights.push({ pig: action.pig, grams: action.grams, date });
        demoState.tasks.forEach(t => {
          if (t.id === 'weigh' || t.weightLog) {
            t.due = false;
            t.lastDone = date;
          }
        });
      });

      window.bridge.registerMockHandler('calendar_weight_delete', (s, action) => {
        const cal = s.calendar;
        if (!cal || !cal.weights) return;
        cal.weights = cal.weights.filter(w => !(w.pig === action.pig && w.date === action.date));
      });
    }
  }

  let currentState = null;
  let activeTab = 'today';
  let containerNode = null;
  let featureApi = null;
  let monthOffset = 0; // 0 = current month, -1 = last month, -2 = 2 months ago

  function renderTabs() {
    const tabs = [
      { id: 'today', label: 'Today' },
      { id: 'month', label: 'Month' },
      { id: 'weight', label: 'Weight' },
      { id: 'settings', label: 'Settings' }
    ];

    let html = `<div class="fc-tabs">`;
    for (const t of tabs) {
      html += `<button class="fc-tab ${activeTab === t.id ? 'active' : ''}" data-tab="${t.id}">${t.label}</button>`;
    }
    html += `</div>`;
    return html;
  }

  function getIconClass(id) {
    const map = {
      'veggies': 'icon-bell-pepper',
      'water': 'icon-water-drop',
      'hay': 'icon-hay',
      'spot_clean': 'icon-broom',
      'weigh': 'icon-scale',
      'full_clean': 'icon-broom',
      'brush': 'icon-brush',
      'nails': 'icon-nail-clipper',
      'vet_check': 'icon-vet'
    };
    return map[id] || 'icon-calendar';
  }

  function renderTabContent() {
    if (activeTab === 'today') return renderToday();
    if (activeTab === 'month') return renderMonth();
    if (activeTab === 'weight') return renderWeight();
    if (activeTab === 'settings') return renderSettings();
    return '';
  }

  function renderToday() {
    const isMock = !currentState || !currentState.tasks;
    const state = isMock ? demoState : currentState;

    let html = `<div class="fc-content" id="fcContent">`;
    html += `<div class="fc-header">Clovers from care today: ${state.cloversToday || 0} / ${state.cloversMaxToday || 0}</div>`;

    const allTasks = state.tasks || [];
    // Filter tasks:
    // When weigh/weightLog task is not due, it disappears from Today.
    // Non-daily tasks that are not due are hidden from Today.
    const tasks = allTasks.filter(task => {
      if (!task.enabled) return false;
      if (task.weightLog || task.id === 'weigh') return !!task.due;
      if (task.due) return true;
      if (task.schedule && task.schedule !== 'daily') return false;
      return true;
    });

    // Sort: due first, then upcoming today (has time, not due), then later
    tasks.sort((a, b) => {
      if (a.due && !b.due) return -1;
      if (!a.due && b.due) return 1;
      if (!a.nextDue && b.nextDue) return 1;
      if (a.nextDue && !b.nextDue) return -1;
      if (a.nextDue && b.nextDue) {
        return new Date(a.nextDue).getTime() - new Date(b.nextDue).getTime();
      }
      return 0;
    });

    tasks.forEach(task => {
      const icon = getIconClass(task.id);
      let timeText = task.time;
      if (!task.due && task.nextDue) {
        const d = new Date(task.nextDue);
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        timeText = `Next: ${days[d.getDay()]} ${task.time}`;
      } else if (!task.due) {
        timeText = 'Later';
      }

      html += `
        <div class="fc-task ${task.due ? 'due' : ''}" data-id="${task.id}">
          <div class="fc-task-top">
            <span class="pixel-icon x1_5 ${icon}"></span>
            <div class="fc-task-info">
              <span class="fc-task-title">${task.title}</span>
              <span class="fc-task-time">${timeText}</span>
            </div>
            ${task.streak ? `<span class="fc-task-streak"><span class="pixel-icon icon-flame"></span> x${task.streak}</span>` : ''}
          </div>
          <div class="fc-task-text">${task.text || ''}</div>
          ${task.due ? `
          <div class="fc-task-actions">
            <button class="fc-btn fc-btn-primary fc-btn-done" data-id="${task.id}" data-weigh="${task.weightLog}">Done</button>
            <div class="fc-snooze-menu">
              <button class="fc-btn fc-btn-later">Later ▾</button>
              <div class="fc-snooze-dropdown">
                ${(state.snoozeMinutes || []).map(m => {
                  let label = `${m} min`;
                  if (m >= 60) label = `${m/60} h`;
                  return `<button class="fc-snooze-btn" data-id="${task.id}" data-min="${m}">${label}</button>`;
                }).join('')}
              </div>
            </div>
          </div>
          ` : ''}
        </div>
      `;
    });

    if (tasks.length === 0) {
      html += `<div style="text-align:center; color:#999; margin-top: 20px;">No tasks for today. Check Settings or Month tab!</div>`;
    }

    html += `</div>`;
    return html;
  }

  function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  function renderMonth() {
    const isMock = !currentState || !currentState.tasks;
    const state = isMock ? demoState : currentState;

    let html = `<div class="fc-content" id="fcContent">`;

    const now = new Date();
    const targetMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const year = targetMonth.getFullYear();
    const month = targetMonth.getMonth();

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    html += `
      <div class="fc-month-header">
        <button class="fc-btn" id="fcBtnPrevMonth" ${monthOffset <= -2 ? 'disabled' : ''}>&lt;</button>
        <span>${monthNames[month]} ${year}</span>
        <button class="fc-btn" id="fcBtnNextMonth" ${monthOffset >= 0 ? 'disabled' : ''}>&gt;</button>
      </div>
    `;

    html += `<div class="fc-month-grid">`;
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    weekdays.forEach(w => {
      html += `<div class="fc-weekday">${w}</div>`;
    });

    const firstDay = targetMonth.getDay();
    const totalDays = getDaysInMonth(year, month);

    for (let i = 0; i < firstDay; i++) {
      html += `<div class="fc-day empty"></div>`;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    for (let day = 1; day <= totalDays; day++) {
      const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayHistory = (state.history || []).filter(h => h.date === dayStr);
      const isToday = dayStr === todayStr;

      let dots = '';
      if (dayHistory.length > 0) {
        dots = `<div class="fc-day-dots">`;
        dayHistory.slice(0, 3).forEach(() => {
          dots += `<span class="fc-dot fc-dot-green"></span>`;
        });
        dots += `</div>`;
      }

      const hasWeight = (state.weights || []).some(w => w.date === dayStr);
      const weightBadge = hasWeight ? `<span class="fc-scale-mark pixel-icon icon-scale" style="transform: scale(0.6);"></span>` : '';

      html += `
        <div class="fc-day ${isToday ? 'today' : ''}" data-date="${dayStr}">
          <span class="fc-day-num">${day}</span>
          ${dots}
          ${weightBadge}
        </div>
      `;
    }

    const totalCells = firstDay + totalDays;
    const remaining = 7 - (totalCells % 7);
    if (remaining < 7) {
      for (let i = 0; i < remaining; i++) {
        html += `<div class="fc-day empty"></div>`;
      }
    }

    html += `</div>`; // end grid
    html += `<div id="fcMonthDetail" style="margin-top: 12px; display:none; background: var(--ui-linen-1); padding: 8px; border-radius: 6px;"></div>`;
    html += `</div>`; // end content
    return html;
  }

  function renderWeight() {
    const isMock = !currentState || !currentState.tasks;
    const state = isMock ? demoState : currentState;

    let html = `<div class="fc-content" id="fcContent" style="gap: 16px;">`;

    if (state.alerts && state.alerts.length > 0) {
      state.alerts.forEach(a => {
        html += `<div class="fc-alert"><span class="pixel-icon icon-warning"></span> ${a}</div>`;
      });
    }

    const pigs = state.pigs || [];
    if (pigs.length === 0) {
      html += `<div style="text-align:center; color:#999; margin-top: 20px;">Add your pigs in Settings to track their weight.</div>`;
    } else {
      pigs.forEach((pig, pIdx) => {
        const prof = (state.profiles || []).find(p => p.name === pig) || {};
        const baseline = prof.baselineGrams || null;

        // Collect all weights for this pig
        const allPigWeights = (state.weights || []).filter(w => w.pig === pig);
        const chronWeights = [...allPigWeights].sort((a, b) => a.date.localeCompare(b.date));
        const displayWeights = [...allPigWeights].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

        html += `
          <div class="fc-weight-pig-section" data-pig="${pig}">
            <div style="font-weight: 700; margin-bottom: 4px; display:flex; justify-content:space-between; align-items:center;">
              <span>${pig}</span>
              ${baseline ? `<span style="font-size:11px; font-weight:normal; color:var(--ui-wood-1);">(baseline: ${baseline} g)</span>` : ''}
            </div>

            <div class="fc-weight-form" style="margin-bottom: 8px;">
              <div class="fc-weight-inputs">
                <input type="number" id="fcWgGram_${pIdx}" class="fc-input fc-input-weight-grams" placeholder="Grams (50-3000)" min="50" max="3000">
                <input type="date" id="fcWgDate_${pIdx}" class="fc-input fc-input-weight-date" value="${new Date().toISOString().split('T')[0]}">
              </div>
              <button class="fc-btn fc-btn-primary fc-btn-save-weight" data-pig="${pig}" data-idx="${pIdx}">Save</button>
            </div>

            <div class="fc-chart-container" style="margin-bottom: 8px;">
              <canvas id="fcChart_${pIdx}" width="330" height="130" style="width: 100%; height: 100%; image-rendering: pixelated;"></canvas>
            </div>

            <div class="fc-weight-table-container">
              <table class="fc-weight-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Weight</th>
                    <th>vs Prev</th>
                    <th>vs Base</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  ${displayWeights.length === 0 ? `
                    <tr><td colspan="5" style="text-align:center; color:#999; padding:8px;">No weight entries yet.</td></tr>
                  ` : displayWeights.map(w => {
                    const cIdx = chronWeights.findIndex(item => item.date === w.date && item.grams === w.grams);
                    let diffPrevHtml = '-';
                    if (cIdx > 0) {
                      const prevGrams = chronWeights[cIdx - 1].grams;
                      const diffPrev = w.grams - prevGrams;
                      if (diffPrev > 0) diffPrevHtml = `<span class="fc-diff-plus">+${diffPrev} g</span>`;
                      else if (diffPrev < 0) diffPrevHtml = `<span class="fc-diff-minus">${diffPrev} g</span>`;
                      else diffPrevHtml = `<span class="fc-diff-zero">0 g</span>`;
                    }

                    let diffBaseHtml = '-';
                    if (baseline != null && baseline > 0) {
                      const diffBase = w.grams - baseline;
                      if (diffBase > 0) diffBaseHtml = `<span class="fc-diff-plus">+${diffBase} g</span>`;
                      else if (diffBase < 0) diffBaseHtml = `<span class="fc-diff-minus">${diffBase} g</span>`;
                      else diffBaseHtml = `<span class="fc-diff-zero">0 g</span>`;
                    }

                    return `
                      <tr class="fc-weight-row">
                        <td>${w.date}</td>
                        <td><strong>${w.grams} g</strong></td>
                        <td>${diffPrevHtml}</td>
                        <td>${diffBaseHtml}</td>
                        <td style="text-align:right;">
                          <button class="fc-btn fc-btn-delete-weight" data-pig="${pig}" data-date="${w.date}" style="padding: 1px 6px; font-size:10px;">Del</button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      });
    }

    html += `</div>`;
    return html;
  }

  function renderSettings() {
    const isMock = !currentState || !currentState.tasks;
    const state = isMock ? demoState : currentState;

    let html = `<div class="fc-content" id="fcContent" style="gap: 12px;">`;

    // 1. Pigs section: edit profiles
    html += `<div class="fc-section-title">Your Pigs</div>`;
    html += `<div class="fc-profiles-list" id="fcProfilesList">`;

    const pigs = state.pigs || [];
    pigs.forEach(pig => {
      const prof = (state.profiles || []).find(p => p.name === pig) || {};
      html += `
        <div class="fc-profile-card" data-pig="${pig}">
          <div class="fc-profile-card-top">
            <span>${pig}</span>
            <button class="fc-btn fc-btn-remove-pig" data-pig="${pig}" style="padding: 1px 6px; font-size:11px;">Remove</button>
          </div>
          <div class="fc-profile-grid">
            <div class="fc-profile-field">
              <label>Birth date</label>
              <input type="date" class="fc-input fc-pig-birth" value="${prof.birthDate || ''}">
            </div>
            <div class="fc-profile-field">
              <label>Adopted date</label>
              <input type="date" class="fc-input fc-pig-adopted" value="${prof.adoptedDate || ''}">
            </div>
            <div class="fc-profile-field" style="grid-column: 1 / -1;">
              <label>Initial weight (g)</label>
              <input type="number" class="fc-input fc-pig-baseline" placeholder="e.g. 950" min="50" max="3000" value="${prof.baselineGrams || ''}">
            </div>
          </div>
          <div style="text-align:right; margin-top: 4px;">
            <button class="fc-btn fc-btn-primary fc-btn-save-profile" data-pig="${pig}">Save Profile</button>
          </div>
        </div>
      `;
    });

    if (pigs.length < 6) {
      html += `
        <div class="fc-profile-card" style="border-style: dashed; background: var(--ui-linen-2);">
          <div class="fc-profile-card-top">
            <span>Add a new pig</span>
          </div>
          <div class="fc-profile-grid">
            <div class="fc-profile-field" style="grid-column: 1 / -1;">
              <label>Name</label>
              <input type="text" id="fcNewPigName" class="fc-input" placeholder="Pig name" maxlength="16">
            </div>
            <div class="fc-profile-field">
              <label>Birth date</label>
              <input type="date" id="fcNewPigBirth" class="fc-input">
            </div>
            <div class="fc-profile-field">
              <label>Adopted date</label>
              <input type="date" id="fcNewPigAdopted" class="fc-input">
            </div>
            <div class="fc-profile-field" style="grid-column: 1 / -1;">
              <label>Initial weight (g)</label>
              <input type="number" id="fcNewPigBaseline" class="fc-input" placeholder="e.g. 950" min="50" max="3000">
            </div>
          </div>
          <div style="text-align:right; margin-top: 4px;">
            <button class="fc-btn fc-btn-primary" id="fcBtnAddPig">Add Pig</button>
          </div>
        </div>
      `;
    }
    html += `</div>`; // end profiles list

    // 2. Tasks / Reminders section
    html += `<div class="fc-section-title">Reminders</div>`;
    (state.tasks || []).forEach(t => {
      // In manualOptIn mode, reminders default to unchecked unless explicitly enabled
      const isChecked = state.manualOptIn ? (t.enabled === true && t.optedIn !== false) : !!t.enabled;

      html += `<div class="fc-setting-row" data-id="${t.id}">`;
      html += `
        <div class="fc-setting-top">
          <span>${t.title}</span>
          <input type="checkbox" class="fc-toggle fc-task-enabled" ${isChecked ? 'checked' : ''}>
        </div>
      `;
      html += `<div class="fc-setting-controls">`;
      html += `<label>Time: <input type="time" class="fc-input fc-task-time" value="${t.time || '10:00'}" style="width: 90px;"></label>`;

      if (t.schedule === 'weekly') {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        html += `<select class="fc-input fc-task-weekday">`;
        days.forEach((d, i) => {
          html += `<option value="${i}" ${t.weekday === i ? 'selected' : ''}>${d}</option>`;
        });
        html += `</select>`;
      } else if (t.schedule === 'every_n_days') {
        html += `<label>Every <input type="number" class="fc-input fc-task-every" value="${t.everyDays || 1}" min="1" max="99" style="width: 50px;"> days</label>`;
      }
      html += `</div>`; // controls
      html += `</div>`; // row
    });

    html += `<button class="fc-btn fc-btn-primary" id="fcBtnSaveSettings" style="margin-top: 12px;">Save Reminders</button>`;
    html += `</div>`;
    return html;
  }

  function bindEvents() {
    const tabs = containerNode.querySelectorAll('.fc-tab');
    tabs.forEach(t => {
      t.addEventListener('click', (e) => {
        activeTab = e.target.dataset.tab;
        render();
      });
    });

    if (activeTab === 'today') {
      const content = containerNode.querySelector('#fcContent');
      if (!content) return;

      // Expand text on row tap
      content.querySelectorAll('.fc-task-top').forEach(el => {
        el.addEventListener('click', () => {
          const text = el.parentElement.querySelector('.fc-task-text');
          if (text) text.classList.toggle('open');
        });
      });

      // Done button
      content.querySelectorAll('.fc-btn-done').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          const isWeigh = btn.dataset.weigh === 'true';

          if (isWeigh) {
            activeTab = 'weight';
            render();
          } else {
            if (featureApi) featureApi.send({ type: 'calendar_done', taskId: id });
          }
        });
      });

      // Later button / Snooze Dropdown
      content.querySelectorAll('.fc-btn-later').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const dd = btn.nextElementSibling;
          content.querySelectorAll('.fc-snooze-dropdown.open').forEach(d => {
            if (d !== dd) d.classList.remove('open');
          });
          dd.classList.toggle('open');
        });
      });

      // Snooze minute option click
      content.querySelectorAll('.fc-snooze-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          const mins = parseInt(btn.dataset.min, 10);
          if (featureApi) featureApi.send({ type: 'calendar_snooze', taskId: id, minutes: mins });
          btn.parentElement.classList.remove('open');
        });
      });

      // Close dropdowns when clicking outside
      content.addEventListener('click', (e) => {
        if (!e.target.closest('.fc-snooze-menu')) {
          content.querySelectorAll('.fc-snooze-dropdown.open').forEach(d => d.classList.remove('open'));
        }
      });
    }

    if (activeTab === 'month') {
      const content = containerNode.querySelector('#fcContent');
      if (!content) return;

      const btnPrev = content.querySelector('#fcBtnPrevMonth');
      if (btnPrev) {
        btnPrev.addEventListener('click', () => {
          if (monthOffset > -2) { monthOffset--; render(); }
        });
      }

      const btnNext = content.querySelector('#fcBtnNextMonth');
      if (btnNext) {
        btnNext.addEventListener('click', () => {
          if (monthOffset < 0) { monthOffset++; render(); }
        });
      }

      content.querySelectorAll('.fc-day[data-date]').forEach(el => {
        el.addEventListener('click', () => {
          const d = el.dataset.date;
          const isMock = !currentState || !currentState.tasks;
          const state = isMock ? demoState : currentState;

          const hist = (state.history || []).filter(h => h.date === d);
          const detail = content.querySelector('#fcMonthDetail');
          if (hist.length > 0) {
            let txt = `<strong style="display:block; margin-bottom: 4px;">${d}</strong>`;
            txt += hist.map(h => {
              const t = (state.tasks || []).find(item => item.id === h.taskId);
              return `<div>- ${t ? t.title : h.taskId}</div>`;
            }).join('');
            detail.innerHTML = txt;
            detail.style.display = 'block';
          } else {
            detail.style.display = 'none';
          }
        });
      });
    }

    if (activeTab === 'settings') {
      const content = containerNode.querySelector('#fcContent');
      if (!content) return;
      const isMock = !currentState || !currentState.tasks;
      const state = isMock ? demoState : currentState;
      let currentPigs = [...(state.pigs || [])];

      // Save Profile buttons for existing pigs
      content.querySelectorAll('.fc-btn-save-profile').forEach(btn => {
        btn.addEventListener('click', () => {
          const pig = btn.dataset.pig;
          const card = content.querySelector(`.fc-profile-card[data-pig="${pig}"]`);
          if (!card) return;
          const birth = card.querySelector('.fc-pig-birth').value.trim() || null;
          const adopted = card.querySelector('.fc-pig-adopted').value.trim() || null;
          const baseRaw = card.querySelector('.fc-pig-baseline').value.trim();
          const baseline = baseRaw ? parseInt(baseRaw, 10) : null;

          if (featureApi) {
            featureApi.send({
              type: 'calendar_profile',
              pig: pig,
              birthDate: birth,
              adoptedDate: adopted,
              baselineGrams: baseline
            });
          }

          if (isMock) {
            if (!demoState.profiles) demoState.profiles = [];
            let p = demoState.profiles.find(item => item.name === pig);
            if (!p) {
              p = { name: pig };
              demoState.profiles.push(p);
            }
            p.birthDate = birth;
            p.adoptedDate = adopted;
            p.baselineGrams = baseline;
          }
        });
      });

      // Remove pig buttons
      content.querySelectorAll('.fc-btn-remove-pig').forEach(btn => {
        btn.addEventListener('click', () => {
          const pig = btn.dataset.pig;
          currentPigs = currentPigs.filter(p => p !== pig);
          if (featureApi) {
            featureApi.send({
              type: 'calendar_settings',
              pigs: currentPigs
            });
          }
          if (isMock) {
            demoState.pigs = currentPigs;
            render();
          }
        });
      });

      // Add Pig button
      const btnAddPig = content.querySelector('#fcBtnAddPig');
      if (btnAddPig) {
        btnAddPig.addEventListener('click', () => {
          const inputName = content.querySelector('#fcNewPigName');
          const inputBirth = content.querySelector('#fcNewPigBirth');
          const inputAdopted = content.querySelector('#fcNewPigAdopted');
          const inputBaseline = content.querySelector('#fcNewPigBaseline');

          const name = inputName ? inputName.value.trim() : '';
          if (name && name.length <= 16 && /^[a-zA-Z0-9\s]+$/.test(name)) {
            const birth = inputBirth && inputBirth.value.trim() ? inputBirth.value.trim() : null;
            const adopted = inputAdopted && inputAdopted.value.trim() ? inputAdopted.value.trim() : null;
            const baseRaw = inputBaseline ? inputBaseline.value.trim() : '';
            const baseline = baseRaw ? parseInt(baseRaw, 10) : null;

            if (!currentPigs.includes(name)) {
              currentPigs.push(name);
            }

            if (featureApi) {
              featureApi.send({
                type: 'calendar_profile',
                pig: name,
                birthDate: birth,
                adoptedDate: adopted,
                baselineGrams: baseline
              });
            }

            if (isMock) {
              demoState.pigs = currentPigs;
              if (!demoState.profiles) demoState.profiles = [];
              demoState.profiles = demoState.profiles.filter(p => p.name !== name);
              demoState.profiles.push({
                name: name,
                birthDate: birth,
                adoptedDate: adopted,
                baselineGrams: baseline
              });
              render();
            }
          }
        });
      }

      // Helper to gather and send reminder settings
      const saveReminders = () => {
        const newTasks = [];
        content.querySelectorAll('.fc-setting-row').forEach(row => {
          const id = row.dataset.id;
          const enabled = row.querySelector('.fc-task-enabled').checked;
          const timeInput = row.querySelector('.fc-task-time');
          const time = timeInput ? timeInput.value : undefined;
          const taskUpdate = { id, enabled };
          if (time) taskUpdate.time = time;

          const wd = row.querySelector('.fc-task-weekday');
          if (wd) taskUpdate.weekday = parseInt(wd.value, 10);

          const ed = row.querySelector('.fc-task-every');
          if (ed) taskUpdate.everyDays = parseInt(ed.value, 10);

          newTasks.push(taskUpdate);
        });

        if (featureApi) {
          featureApi.send({
            type: 'calendar_settings',
            pigs: currentPigs,
            tasks: newTasks
          });
        }

        if (isMock) {
          newTasks.forEach(nt => {
            const target = demoState.tasks.find(x => x.id === nt.id);
            if (target) {
              target.enabled = nt.enabled;
              target.optedIn = nt.enabled;
              if (nt.time) target.time = nt.time;
              if (nt.weekday !== undefined) target.weekday = nt.weekday;
              if (nt.everyDays !== undefined) target.everyDays = nt.everyDays;
            }
          });
        }
      };

      // Toggling any reminder switch triggers auto-send of calendar_settings
      content.querySelectorAll('.fc-task-enabled').forEach(toggle => {
        toggle.addEventListener('change', () => {
          saveReminders();
        });
      });

      // Explicit Save Reminders button
      const btnSaveSettings = content.querySelector('#fcBtnSaveSettings');
      if (btnSaveSettings) {
        btnSaveSettings.addEventListener('click', () => {
          saveReminders();
        });
      }
    }

    if (activeTab === 'weight') {
      const content = containerNode.querySelector('#fcContent');
      if (!content) return;
      const isMock = !currentState || !currentState.tasks;

      // Save Weight handler
      content.querySelectorAll('.fc-btn-save-weight').forEach(btn => {
        btn.addEventListener('click', () => {
          const pig = btn.dataset.pig;
          const idx = btn.dataset.idx;
          const gInput = content.querySelector(`#fcWgGram_${idx}`);
          const dInput = content.querySelector(`#fcWgDate_${idx}`);
          if (!gInput || !dInput) return;

          const valStr = gInput.value.trim();
          if (!valStr || !/^\d+$/.test(valStr)) return;

          const grams = parseInt(valStr, 10);
          const date = dInput.value;

          // Reject invalid grams (0, negative, outside 50..3000) or missing date
          if (Number.isInteger(grams) && grams >= 50 && grams <= 3000 && date) {
            if (currentState && Array.isArray(currentState.tasks)) {
              currentState.tasks.forEach(t => {
                if (t.id === 'weigh' || t.weightLog) {
                  t.due = false;
                  t.lastDone = date;
                }
              });
            }
            demoState.tasks.forEach(t => {
              if (t.id === 'weigh' || t.weightLog) {
                t.due = false;
                t.lastDone = date;
              }
            });

            if (featureApi) {
              featureApi.send({ type: 'calendar_weight', pig, grams, date });
            }

            if (isMock) {
              if (!demoState.weights) demoState.weights = [];
              demoState.weights = demoState.weights.filter(w => !(w.pig === pig && w.date === date));
              demoState.weights.push({ pig, grams, date });
              render();
            }
            gInput.value = '';
          }
        });
      });

      // Delete Weight handler
      content.querySelectorAll('.fc-btn-delete-weight').forEach(btn => {
        btn.addEventListener('click', () => {
          const pig = btn.dataset.pig;
          const date = btn.dataset.date;
          if (featureApi) {
            featureApi.send({ type: 'calendar_weight_delete', pig, date });
          }
          if (isMock) {
            demoState.weights = (demoState.weights || []).filter(w => !(w.pig === pig && w.date === date));
            render();
          }
        });
      });

      // Render charts for each pig
      const state = isMock ? demoState : currentState;
      const pigs = state.pigs || [];
      pigs.forEach((pig, pIdx) => {
        const canvas = content.querySelector(`#fcChart_${pIdx}`);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const wList = (state.weights || []).filter(w => w.pig === pig)
                                           .sort((a,b) => a.date.localeCompare(b.date))
                                           .slice(-12);

        if (wList.length === 0) return;

        const cw = canvas.width;
        const ch = canvas.height;

        ctx.clearRect(0, 0, cw, ch);

        const values = wList.map(w => w.grams);
        let minV = Math.min(...values);
        let maxV = Math.max(...values);

        if (minV === maxV) { minV -= 50; maxV += 50; }
        const pad = 20;
        minV = Math.max(0, minV - pad);
        maxV += pad;

        const paddingLeft = 40;
        const paddingRight = 10;
        const paddingTop = 10;
        const paddingBottom = 20;

        const graphW = cw - paddingLeft - paddingRight;
        const graphH = ch - paddingTop - paddingBottom;

        // Draw grid lines
        ctx.fillStyle = '#9c6636';
        ctx.font = '10px "Pixelify Sans", monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        const steps = 3;
        for (let i = 0; i <= steps; i++) {
          const v = minV + (maxV - minV) * (i / steps);
          const y = ch - paddingBottom - (graphH * (i / steps));

          ctx.fillText(Math.round(v), paddingLeft - 5, y);

          ctx.beginPath();
          ctx.moveTo(paddingLeft, y);
          ctx.lineTo(cw - paddingRight, y);
          ctx.strokeStyle = '#e4cfb5';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Draw line
        if (wList.length > 1) {
          ctx.beginPath();
          wList.forEach((w, i) => {
            const x = paddingLeft + (graphW / (wList.length - 1)) * i;
            const y = ch - paddingBottom - ((w.grams - minV) / (maxV - minV)) * graphH;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.strokeStyle = '#dc7445';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Draw points
        wList.forEach((w, i) => {
          const x = paddingLeft + (wList.length > 1 ? (graphW / (wList.length - 1)) * i : graphW / 2);
          const y = ch - paddingBottom - ((w.grams - minV) / (maxV - minV)) * graphH;

          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#dc7445';
          ctx.fill();
          ctx.strokeStyle = '#fffdf8';
          ctx.lineWidth = 1;
          ctx.stroke();

          if (i === 0 || i === wList.length - 1) {
            ctx.fillStyle = '#9c6636';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            const dStr = wList[i].date.substring(5);
            ctx.fillText(dStr, x, ch - paddingBottom + 5);
          }
        });
      });
    }
  }

  function render() {
    if (!containerNode) return;
    const isMock = !currentState || !currentState.tasks;

    let headerHtml = '';
    if (isMock) {
      headerHtml = `<div style="text-align:center; font-size:11px; color:#999; margin-bottom: 4px;">(demo)</div>`;
    }

    containerNode.innerHTML = headerHtml + renderTabs() + renderTabContent();
    bindEvents();
  }

  window.CuyHome.registerFeature({
    id: 'calendar',
    title: 'Care calendar',
    icon: 'icon-calendar',
    order: 10,
    open(container, api) {
      containerNode = container;
      featureApi = api;
      currentState = api.getState()?.calendar || null;
      activeTab = 'today';
      monthOffset = 0;
      render();
    },
    close() {
      containerNode = null;
      featureApi = null;
    },
    onState(state) {
      if (!containerNode) return;
      currentState = state?.calendar || null;

      const contentNode = containerNode.querySelector('#fcContent');
      if (!contentNode) {
        render();
        return;
      }

      if (activeTab === 'today') {
        contentNode.outerHTML = renderToday();
        bindEvents();
      } else if (activeTab === 'month') {
        contentNode.outerHTML = renderMonth();
        bindEvents();
      } else if (activeTab === 'weight') {
        contentNode.outerHTML = renderWeight();
        bindEvents();
      } else if (activeTab === 'settings') {
        const hasFocus = containerNode.querySelector('input:focus');
        if (!hasFocus) {
          contentNode.outerHTML = renderSettings();
          bindEvents();
        }
      }
    }
  });

})();
