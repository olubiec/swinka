(() => {
  const demoState = {
    pigs: ["Pumpkin", "Oreo"],
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

    const tasks = [...(state.tasks || [])];

    // Sort: due first, then upcoming today (has time, not due), then later
    tasks.sort((a, b) => {
      if (a.due && !b.due) return -1;
      if (!a.due && b.due) return 1;
      // If neither is due, the one without nextDue goes later
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
          timeText = "Later";
      }

      html += `
        <div class="fc-task ${task.due ? 'due' : ''}" data-id="${task.id}">
          <div class="fc-task-top">
            <span class="pixel-icon x1_5 ${icon}"></span>
            <div class="fc-task-info">
              <span class="fc-task-title">${task.title}</span>
              <span class="fc-task-time">${timeText}</span>
            </div>
            ${task.streak ? `<span class="fc-task-streak">🔥 x${task.streak}</span>` : ''}
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
      html += `<div style="text-align:center; color:#999; margin-top: 20px;">No tasks. Add some in Settings!</div>`;
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
    // Calculate the target month
    let targetMonth = now.getMonth() + monthOffset;
    let targetYear = now.getFullYear();
    while (targetMonth < 0) {
        targetMonth += 12;
        targetYear -= 1;
    }

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    html += `
      <div class="fc-month-header">
        <button class="fc-btn" id="fcBtnPrevMonth" ${monthOffset <= -2 ? 'disabled' : ''}>&lt;</button>
        <span>${monthNames[targetMonth]} ${targetYear}</span>
        <button class="fc-btn" id="fcBtnNextMonth" ${monthOffset >= 0 ? 'disabled' : ''}>&gt;</button>
      </div>
    `;

    html += `<div class="fc-month-grid">`;
    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    weekdays.forEach(wd => {
        html += `<div class="fc-weekday">${wd}</div>`;
    });

    const firstDay = new Date(targetYear, targetMonth, 1);
    // getDay() is 0 (Sun) to 6 (Sat). We want Mon=0 to Sun=6.
    let startDayIdx = firstDay.getDay() - 1;
    if (startDayIdx < 0) startDayIdx = 6;

    const numDays = getDaysInMonth(targetYear, targetMonth);
    const todayStr = now.toISOString().split('T')[0];

    // Count expected daily tasks
    const dailyTaskIds = new Set((state.tasks || []).filter(t => t.schedule === 'daily' && t.enabled).map(t => t.id));
    const totalDaily = dailyTaskIds.size;

    // Process history
    const historyByDate = {};
    (state.history || []).forEach(h => {
        if (!historyByDate[h.date]) historyByDate[h.date] = new Set();
        historyByDate[h.date].add(h.taskId);
    });

    // Process weights
    const weightsByDate = new Set((state.weights || []).map(w => w.date));

    // Pad beginning
    for (let i = 0; i < startDayIdx; i++) {
        html += `<div class="fc-day empty"></div>`;
    }

    // Days
    for (let d = 1; d <= numDays; d++) {
        const dateObj = new Date(targetYear, targetMonth, d);
        // JS Date pads correctly when offset is handled, but let's format it manually:
        const yStr = targetYear;
        const mStr = String(targetMonth + 1).padStart(2, '0');
        const dStr = String(d).padStart(2, '0');
        const isoDate = `${yStr}-${mStr}-${dStr}`;

        let dotHtml = '';
        const isFuture = isoDate > todayStr;

        if (!isFuture) {
            const doneSet = historyByDate[isoDate] || new Set();
            let dailyDone = 0;
            doneSet.forEach(tid => {
                if (dailyTaskIds.has(tid)) dailyDone++;
            });

            if (totalDaily > 0) {
                if (dailyDone >= totalDaily) {
                    dotHtml = `<div class="fc-dot fc-dot-green"></div>`;
                } else if (dailyDone > 0) {
                    dotHtml = `<div class="fc-dot fc-dot-yellow"></div>`;
                }
            } else if (doneSet.size > 0) {
                 // Fallback if no expected daily tasks but something was done
                 dotHtml = `<div class="fc-dot fc-dot-green"></div>`;
            }
        }

        let scaleHtml = '';
        if (weightsByDate.has(isoDate)) {
            scaleHtml = `<span class="pixel-icon icon-scale fc-scale-mark" style="transform:scale(0.5); transform-origin: top right;"></span>`;
        }

        const isToday = isoDate === todayStr;
        const bgStyle = isToday ? 'style="background: #fff8e1; border-color: var(--c-orange-dark);"' : '';

        html += `
          <div class="fc-day" data-date="${isoDate}" ${bgStyle}>
            ${scaleHtml}
            <span class="fc-day-num">${d}</span>
            <div class="fc-day-dots">${dotHtml}</div>
          </div>
        `;
    }

    // Pad end (optional, grid handles it, but let's complete the row)
    const totalCells = startDayIdx + numDays;
    const remainder = totalCells % 7;
    if (remainder !== 0) {
        for (let i = 0; i < (7 - remainder); i++) {
            html += `<div class="fc-day empty"></div>`;
        }
    }

    html += `</div>`; // end grid

    // Detail view section
    html += `<div id="fcMonthDetail" style="margin-top: 12px; display:none; background: var(--c-cream-dark); padding: 8px; border-radius: 6px;"></div>`;

    html += `</div>`; // end content
    return html;
  }
  function renderWeight() {
    const isMock = !currentState || !currentState.tasks;
    const state = isMock ? demoState : currentState;

    let html = `<div class="fc-content" id="fcContent" style="gap: 16px;">`;

    if (state.alerts && state.alerts.length > 0) {
        state.alerts.forEach(a => {
            html += `<div class="fc-alert">⚠️ ${a}</div>`;
        });
    }

    const pigs = state.pigs || [];
    if (pigs.length === 0) {
        html += `<div style="text-align:center; color:#999; margin-top: 20px;">Add your pigs in Settings to track their weight.</div>`;
    } else {
        pigs.forEach((pig, pIdx) => {
            html += `
              <div>
                <div style="font-weight: 700; margin-bottom: 8px;">${pig}</div>
                <div class="fc-weight-form" style="margin-bottom: 8px;">
                  <div class="fc-weight-inputs">
                    <input type="number" id="fcWgGram_${pIdx}" class="fc-input" placeholder="Grams (100-3000)" min="100" max="3000">
                    <input type="date" id="fcWgDate_${pIdx}" class="fc-input" value="${new Date().toISOString().split('T')[0]}">
                  </div>
                  <button class="fc-btn fc-btn-primary fc-btn-save-weight" data-pig="${pig}" data-idx="${pIdx}">Save</button>
                </div>

                <div class="fc-chart-container" style="margin-bottom: 8px;">
                  <canvas id="fcChart_${pIdx}" width="330" height="130" style="width: 100%; height: 100%; image-rendering: pixelated;"></canvas>
                </div>

                <div class="fc-history-list">
                  ${(state.weights || []).filter(w => w.pig === pig).sort((a,b) => b.date.localeCompare(a.date)).slice(0, 5).map(w => `
                    <div class="fc-history-item">
                      <span>${w.date}: ${w.grams} g</span>
                      <button class="fc-btn fc-btn-delete-weight" data-pig="${pig}" data-date="${w.date}" style="padding: 2px 6px; font-size:10px;">Delete</button>
                    </div>
                  `).join('')}
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

    let html = `<div class="fc-content" id="fcContent" style="gap: 8px;">`;

    // Pigs section
    html += `<div class="fc-section-title">Your Pigs</div>`;
    html += `<div class="fc-pig-chips" id="fcPigChips">`;
    (state.pigs || []).forEach(p => {
        html += `<div class="fc-pig-chip">${p} <button class="fc-btn-remove-pig" data-pig="${p}">×</button></div>`;
    });
    if ((state.pigs || []).length < 6) {
        html += `<div style="display:flex; gap: 4px;">
                   <input type="text" id="fcNewPigName" class="fc-input" placeholder="Name" maxlength="16" style="width: 80px;">
                   <button class="fc-btn" id="fcBtnAddPig">Add</button>
                 </div>`;
    }
    html += `</div>`;

    // Tasks section
    html += `<div class="fc-section-title">Tasks</div>`;
    (state.tasks || []).forEach(t => {
        html += `<div class="fc-setting-row" data-id="${t.id}">`;

        html += `
          <div class="fc-setting-top">
            <span>${t.title}</span>
            <input type="checkbox" class="fc-toggle fc-task-enabled" ${t.enabled ? 'checked' : ''}>
          </div>
        `;

        html += `<div class="fc-setting-controls">`;
        html += `<label>Time: <input type="time" class="fc-input fc-task-time" value="${t.time}" style="width: 90px;"></label>`;

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

    html += `<button class="fc-btn fc-btn-primary" id="fcBtnSaveSettings" style="margin-top: 12px;">Save Settings</button>`;

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

      // Expand text on row tap
      content.querySelectorAll('.fc-task-top').forEach(el => {
        el.addEventListener('click', (e) => {
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
          // Close others
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
                      const t = (state.tasks || []).find(t => t.id === h.taskId);
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
      const isMock = !currentState || !currentState.tasks;
      const state = isMock ? demoState : currentState;
      let currentPigs = [...(state.pigs || [])];

      const renderChips = () => {
          const chipsNode = content.querySelector('#fcPigChips');
          if (!chipsNode) return;
          let html = '';
          currentPigs.forEach(p => {
              html += `<div class="fc-pig-chip">${p} <button class="fc-btn-remove-pig" data-pig="${p}">×</button></div>`;
          });
          if (currentPigs.length < 6) {
              html += `<div style="display:flex; gap: 4px;">
                         <input type="text" id="fcNewPigName" class="fc-input" placeholder="Name" maxlength="16" style="width: 80px;">
                         <button class="fc-btn" id="fcBtnAddPig">Add</button>
                       </div>`;
          }
          chipsNode.innerHTML = html;

          chipsNode.querySelectorAll('.fc-btn-remove-pig').forEach(btn => {
              btn.addEventListener('click', () => {
                  currentPigs = currentPigs.filter(p => p !== btn.dataset.pig);
                  renderChips();
              });
          });

          const btnAdd = chipsNode.querySelector('#fcBtnAddPig');
          const inputAdd = chipsNode.querySelector('#fcNewPigName');
          if (btnAdd && inputAdd) {
              btnAdd.addEventListener('click', () => {
                  const val = inputAdd.value.trim();
                  // regex: letters, digits, spaces, max 16
                  if (val && val.length <= 16 && /^[a-zA-Z0-9\s]+$/.test(val)) {
                      if (!currentPigs.includes(val)) {
                          currentPigs.push(val);
                          renderChips();
                      }
                  }
              });
          }
      };

      renderChips(); // Bind initially

      const btnSave = content.querySelector('#fcBtnSaveSettings');
      if (btnSave) {
          btnSave.addEventListener('click', () => {
              const newTasks = [];
              content.querySelectorAll('.fc-setting-row').forEach(row => {
                  const id = row.dataset.id;
                  const enabled = row.querySelector('.fc-task-enabled').checked;
                  const time = row.querySelector('.fc-task-time').value;
                  const taskUpdate = { id, enabled, time };

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
                  // just to simulate updating in mock
                  demoState.pigs = currentPigs;
                  demoState.tasks.forEach(t => {
                      const upd = newTasks.find(u => u.id === t.id);
                      if (upd) {
                          t.enabled = upd.enabled;
                          t.time = upd.time;
                          if (upd.weekday !== undefined) t.weekday = upd.weekday;
                          if (upd.everyDays !== undefined) t.everyDays = upd.everyDays;
                      }
                  });
              }
          });
      }
    }

    if (activeTab === 'weight') {
      const content = containerNode.querySelector('#fcContent');
      const isMock = !currentState || !currentState.tasks;
      const state = isMock ? demoState : currentState;

      content.querySelectorAll('.fc-btn-save-weight').forEach(btn => {
          btn.addEventListener('click', () => {
              const pig = btn.dataset.pig;
              const idx = btn.dataset.idx;
              const gInput = content.querySelector(`#fcWgGram_${idx}`);
              const dInput = content.querySelector(`#fcWgDate_${idx}`);
              if (!gInput || !dInput) return;
              const grams = parseInt(gInput.value, 10);
              const date = dInput.value;
              if (grams >= 100 && grams <= 3000) {
                  if (featureApi) featureApi.send({ type: 'calendar_weight', pig, grams, date });
                  // clear input
                  gInput.value = '';
              }
          });
      });

      content.querySelectorAll('.fc-btn-delete-weight').forEach(btn => {
          btn.addEventListener('click', () => {
              const pig = btn.dataset.pig;
              const date = btn.dataset.date;
              if (featureApi) featureApi.send({ type: 'calendar_weight_delete', pig, date });
          });
      });

      // Render charts
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

          // Clear
          ctx.clearRect(0, 0, cw, ch);

          // Find min/max
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

          // Draw grid and labels
          ctx.fillStyle = '#9c6636';
          ctx.font = '10px "Pixelify Sans", monospace';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';

          const steps = 3;
          for (let i=0; i<=steps; i++) {
              const v = minV + (maxV - minV) * (i/steps);
              const y = ch - paddingBottom - (graphH * (i/steps));

              ctx.fillText(Math.round(v), paddingLeft - 5, y);

              ctx.beginPath();
              ctx.moveTo(paddingLeft, y);
              ctx.lineTo(cw - paddingRight, y);
              ctx.strokeStyle = '#e4cfb5'; // cream-dark
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
              ctx.strokeStyle = '#dc7445'; // rust
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
              ctx.strokeStyle = '#fffdf8'; // white
              ctx.lineWidth = 1;
              ctx.stroke();

              // Draw date on x axis for first and last
              if (i === 0 || i === wList.length - 1) {
                  ctx.fillStyle = '#9c6636';
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'top';
                  const dStr = wList[i].date.substring(5); // MM-DD
                  ctx.fillText(dStr, x, ch - paddingBottom + 5);
              }
          });
      });
    }
  }

  function render() {
    if (!containerNode) return;
    const isMock = !currentState || !currentState.tasks;
    const state = isMock ? demoState : currentState;

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
    onState(state) {
      if (!containerNode) return; // ignore if closed
      currentState = state?.calendar || null;

      const contentNode = containerNode.querySelector('#fcContent');
      if (!contentNode) {
          render();
          return;
      }

      if (activeTab === 'today') {
          // the entire Today tab is a list, so we can re-render it,
          // but just to be safe, we could replace outerHTML. Since there are no inputs, focus loss isn't critical.
          contentNode.outerHTML = renderToday();
          bindEvents();
      } else if (activeTab === 'month') {
          contentNode.outerHTML = renderMonth();
          bindEvents();
      } else if (activeTab === 'weight') {
          // Only re-render the history list and charts to keep input focus
          const s = currentState || demoState;

          const pigs = s.pigs || [];
          pigs.forEach((pig, pIdx) => {
              const listNode = contentNode.querySelectorAll('.fc-history-list')[pIdx];
              if (listNode) {
                  listNode.innerHTML = (s.weights || []).filter(w => w.pig === pig).sort((a,b) => b.date.localeCompare(a.date)).slice(0, 5).map(w => `
                    <div class="fc-history-item">
                      <span>${w.date}: ${w.grams} g</span>
                      <button class="fc-btn fc-btn-delete-weight" data-pig="${pig}" data-date="${w.date}" style="padding: 2px 6px; font-size:10px;">Delete</button>
                    </div>
                  `).join('');

                  // Rebind delete buttons for this list
                  listNode.querySelectorAll('.fc-btn-delete-weight').forEach(btn => {
                      btn.addEventListener('click', () => {
                          const pig = btn.dataset.pig;
                          const date = btn.dataset.date;
                          if (featureApi) featureApi.send({ type: 'calendar_weight_delete', pig, date });
                      });
                  });
              }
          });

          // Re-trigger chart render by calling the block that draws charts
          bindEvents(); // bindEvents will redraw the canvas charts since it's the weight tab
      } else if (activeTab === 'settings') {
          // For settings, only re-render the chips list to preserve input focus
          // But settings task rows also have inputs. However, we assume state pushes to settings
          // are rare or mostly affect pigs. If we must, we can avoid re-rendering entirely onState,
          // or just update chips.
          bindEvents(); // the chips rendering is inside bindEvents and will read the new state
      }
    }
  });

})();