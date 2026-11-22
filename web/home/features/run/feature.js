(function () {
  'use strict';

  var CELL_PX = 16;
  var OVERLAY_ID = 'run_overlay';
  var lastState = null;
  var lastRun = null;
  var entryBtn = null;
  var backdrop = null;
  var panelOpen = false;
  var layerMounted = false;

  function currentPlace() {
    if (window.CuyPlaces && typeof window.CuyPlaces.getCurrentPlace === 'function') {
      return window.CuyPlaces.getCurrentPlace();
    }
    return lastState && lastState.place ? lastState.place : 'salon';
  }

  function isGardenActive() {
    return currentPlace() === 'garden';
  }

  function ensureEntryButton() {
    if (entryBtn && entryBtn.isConnected) return entryBtn;
    var host = document.querySelector('.stage-viewport') || document.body;
    entryBtn = document.getElementById('runEntryBtn');
    if (!entryBtn) {
      entryBtn = document.createElement('button');
      entryBtn.id = 'runEntryBtn';
      entryBtn.type = 'button';
      entryBtn.className = 'run-entry-btn';
      entryBtn.innerHTML = '<span class="pixel-icon icon-fence-wood"></span><span class="run-entry-label">Run</span>';
      entryBtn.addEventListener('click', function () {
        openPanel();
      });
      host.appendChild(entryBtn);
    }
    return entryBtn;
  }

  function ensurePanel() {
    if (backdrop && backdrop.isConnected) return backdrop;
    backdrop = document.createElement('div');
    backdrop.className = 'run-panel-backdrop';
    backdrop.hidden = true;
    backdrop.innerHTML =
      '<div class="run-panel" role="dialog" aria-modal="true" aria-label="Garden Run">' +
        '<div class="run-panel-header">' +
          '<div class="run-panel-title"><span class="pixel-icon icon-fence-wood"></span><span>Garden Run</span></div>' +
          '<button type="button" class="run-close-btn" aria-label="Close">Close</button>' +
        '</div>' +
        '<div class="run-status-box"></div>' +
        '<div class="run-verdict-bar" hidden></div>' +
        '<div class="run-candidate-list"></div>' +
      '</div>';

    backdrop.querySelector('.run-close-btn').addEventListener('click', closePanel);
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) closePanel();
    });
    document.body.appendChild(backdrop);
    return backdrop;
  }

  function sendBridge(type, pigId) {
    if (window.bridge && typeof window.bridge.send === 'function') {
      window.bridge.send({ type: type, pigId: pigId });
    }
  }

  function renderPanel() {
    var bd = ensurePanel();
    var run = lastRun || {
      available: false,
      valid: false,
      reason: 'no_fence',
      cells: [],
      capacity: 0,
      out: [],
      candidates: [],
      verdict: { ok: true, code: 'Ok', message: '' }
    };

    var statusEl = bd.querySelector('.run-status-box');
    if (run.valid) {
      var nCells = Array.isArray(run.cells) ? run.cells.length : 0;
      statusEl.textContent = 'Run: ' + nCells + ' cells, room for ' + (run.capacity || 0) + ' pigs';
    } else {
      statusEl.textContent = 'Close a fence line with a gate to make a run (' + (run.reason || 'no_fence') + ')';
    }

    var verdictEl = bd.querySelector('.run-verdict-bar');
    if (run.verdict && run.verdict.ok === false && run.verdict.message) {
      verdictEl.hidden = false;
      verdictEl.textContent = run.verdict.message;
    } else {
      verdictEl.hidden = true;
      verdictEl.textContent = '';
    }

    var listEl = bd.querySelector('.run-candidate-list');
    listEl.innerHTML = '';
    var outCount = Array.isArray(run.out) ? run.out.length : 0;
    var atCapacity = run.capacity > 0 ? outCount >= run.capacity : true;
    var canLetOut = Boolean(run.valid) && (!run.verdict || run.verdict.ok !== false) && !atCapacity;

    var cands = Array.isArray(run.candidates) ? run.candidates : [];
    cands.forEach(function (c) {
      if (!c || !c.pigId) return;
      var row = document.createElement('div');
      row.className = 'run-candidate-row';

      var nameEl = document.createElement('span');
      nameEl.className = 'run-candidate-name';
      nameEl.textContent = c.name || c.pigId;

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'run-assign-btn' + (c.out ? ' is-out' : '');
      btn.setAttribute('data-pig-id', c.pigId);

      if (c.out) {
        btn.textContent = 'Bring in';
        btn.disabled = false;
        btn.addEventListener('click', function () {
          sendBridge('run.in', c.pigId);
        });
      } else {
        btn.textContent = 'Let out';
        btn.disabled = Boolean(c.memorial) || !canLetOut;
        btn.addEventListener('click', function () {
          sendBridge('run.out', c.pigId);
        });
      }

      row.appendChild(nameEl);
      row.appendChild(btn);
      listEl.appendChild(row);
    });
  }

  function drawRunLayer(ctx) {
    if (!ctx || !lastRun || !lastRun.valid || !Array.isArray(lastRun.cells)) return;
    ctx.save();
    ctx.fillStyle = 'rgba(151, 165, 105, 0.25)';
    for (var i = 0; i < lastRun.cells.length; i++) {
      var cell = lastRun.cells[i];
      if (!Array.isArray(cell) || cell.length < 2) continue;
      ctx.fillRect(cell[0] * CELL_PX, cell[1] * CELL_PX, CELL_PX, CELL_PX);
    }

    var outList = Array.isArray(lastRun.out) ? lastRun.out : [];
    for (var j = 0; j < outList.length && j < lastRun.cells.length; j++) {
      var target = lastRun.cells[j];
      ctx.fillStyle = '#ff9f45';
      ctx.fillRect(target[0] * CELL_PX + 5, target[1] * CELL_PX + 5, 6, 6);
    }
    ctx.restore();
  }

  function syncSceneOverlayAndEntry() {
    var btn = ensureEntryButton();
    var inGarden = isGardenActive();
    btn.hidden = !inGarden;

    if (inGarden && lastRun && lastRun.valid) {
      var outCount = Array.isArray(lastRun.out) ? lastRun.out.length : 0;
      var label = btn.querySelector('.run-entry-label');
      if (label) label.textContent = 'Run (' + outCount + '/' + (lastRun.capacity || 0) + ')';
    } else {
      var labelDef = btn.querySelector('.run-entry-label');
      if (labelDef) labelDef.textContent = 'Run';
    }

    if (window.CuyRoom) {
      if (inGarden && typeof window.CuyRoom.addLayer === 'function') {
        if (!layerMounted) {
          window.CuyRoom.addLayer(OVERLAY_ID, 6, drawRunLayer);
          layerMounted = true;
        }
      } else if (!inGarden && typeof window.CuyRoom.removeLayer === 'function') {
        if (layerMounted) {
          window.CuyRoom.removeLayer(OVERLAY_ID);
          layerMounted = false;
        }
      }
    }
  }

  function openPanel() {
    panelOpen = true;
    var bd = ensurePanel();
    renderPanel();
    bd.hidden = false;
  }

  function closePanel() {
    panelOpen = false;
    if (backdrop) backdrop.hidden = true;
  }

  function onState(st) {
    if (st) {
      lastState = st;
      if (st.run) lastRun = st.run;
    }
    syncSceneOverlayAndEntry();
    if (panelOpen) renderPanel();
  }

  var api = {
    id: 'run',
    title: 'Garden Run',
    icon: 'icon-fence-wood',
    order: 52,
    alwaysOnState: true,
    open: function () { openPanel(); },
    close: function () { closePanel(); },
    onState: onState
  };

  window.CuyRun = api;
  if (window.CuyHome && typeof window.CuyHome.registerFeature === 'function') {
    window.CuyHome.registerFeature(api);
  }
})();
