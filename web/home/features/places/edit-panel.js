(function () {
  'use strict';

  let _isOpen = false;
  let _isCollapsed = false;
  let _lastState = null;
  let _currentSceneId = 'salon';

  let _dragState = null;
  let _domGhost = null;

  let _selectedUid = null;
  let _itemDragState = null;
  let _hoverTarget = null;
  let _filterState = { tab: 'All', query: '' };
  let _subpanelMode = null;

  let _history = (typeof window !== 'undefined' && window.EditHistory && typeof window.EditHistory.create === 'function')
    ? window.EditHistory.create()
    : null;
  let _showResidents = true;
  let _lastRoomsSig = null;
  let _lastDrawerSig = null;
  let _prevItemMap = null;
  let _historyPending = false;
  let _pendingDirectOp = null;
  const _awaitingResolutions = [];

  function ensureEditHistoryLoaded() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (window.EditHistory) {
      if (!_history && typeof window.EditHistory.create === 'function') {
        _history = window.EditHistory.create();
      }
      return;
    }
    if (!document.querySelector('script[src*="edit-history.js"]')) {
      const s = document.createElement('script');
      s.src = 'features/places/edit-history.js';
      s.onload = function () {
        if (!_history && window.EditHistory && typeof window.EditHistory.create === 'function') {
          _history = window.EditHistory.create();
        }
        updateHistoryButtons();
        if (_lastState) renderHeader(_lastState, getCurrentSceneId());
      };
      document.head.appendChild(s);
    }
  }

  function getHistory() {
    if (!_history && typeof window !== 'undefined' && window.EditHistory && typeof window.EditHistory.create === 'function') {
      _history = window.EditHistory.create();
    }
    return _history;
  }

  function getHistoryCounts() {
    const hist = getHistory();
    return hist && typeof hist.counts === 'function'
      ? hist.counts()
      : { undo: 0, redo: 0, canUndo: false, canRedo: false };
  }

  function playWorldSound(eventName) {
    if (typeof window !== 'undefined' && window.WorldSounds && typeof window.WorldSounds.play === 'function') {
      try {
        window.WorldSounds.play(eventName);
      } catch (e) {}
    }
  }

  function updateHistoryButtons() {
    if (typeof document === 'undefined') return;
    const counts = getHistoryCounts();
    const undoBtn = document.getElementById('editUndoBtn');
    const redoBtn = document.getElementById('editRedoBtn');
    if (undoBtn) {
      undoBtn.disabled = !counts.canUndo;
      undoBtn.setAttribute('aria-disabled', counts.canUndo ? 'false' : 'true');
    }
    if (redoBtn) {
      redoBtn.disabled = !counts.canRedo;
      redoBtn.setAttribute('aria-disabled', counts.canRedo ? 'false' : 'true');
    }
  }

  function updateResidentsButton() {
    if (typeof document === 'undefined') return;
    const btn = document.getElementById('editResidentsBtn');
    if (btn) {
      btn.setAttribute('aria-pressed', _showResidents ? 'true' : 'false');
    }
  }

  function getShowResidents() {
    return _showResidents;
  }

  function setShowResidents(val) {
    _showResidents = Boolean(val);
    updateResidentsButton();
    const inst = (window.CanvasPig && window.CanvasPig.instance) || (window.PigCanvas && window.PigCanvas.instance);
    if (inst && typeof inst.enforceFreePigs === 'function') {
      inst.enforceFreePigs(true);
    }
    return _showResidents;
  }

  function clearHistory() {
    const hist = getHistory();
    if (hist && typeof hist.clear === 'function') {
      hist.clear();
    }
    _historyPending = false;
    _pendingDirectOp = null;
    _awaitingResolutions.length = 0;
    updateHistoryButtons();
  }

  function pushHistoryOp(op) {
    const hist = getHistory();
    if (!hist || typeof hist.push !== 'function') return false;
    const ok = hist.push(op);
    if (ok) {
      _pendingDirectOp = {
        prevSig: _lastRoomsSig,
        op: op
      };
      if (op.kind === 'place') {
        _awaitingResolutions.push({
          place: op.place,
          itemId: op.itemId,
          x: op.x,
          y: op.y
        });
      }
      updateHistoryButtons();
    }
    return ok;
  }

  function performUndo() {
    const hist = getHistory();
    if (!hist || typeof hist.undo !== 'function') return false;
    const msgs = hist.undo();
    if (!msgs || msgs.length === 0) {
      updateHistoryButtons();
      return false;
    }
    _historyPending = true;
    _pendingDirectOp = null;
    msgs.forEach(function (msg) {
      if (msg && msg.type === 'room_place') {
        _awaitingResolutions.push({
          place: msg.place,
          itemId: msg.itemId,
          x: msg.x,
          y: msg.y
        });
      }
      sendBridge(msg);
    });
    updateHistoryButtons();
    playWorldSound('edit_undo');
    return true;
  }

  function performRedo() {
    const hist = getHistory();
    if (!hist || typeof hist.redo !== 'function') return false;
    const msgs = hist.redo();
    if (!msgs || msgs.length === 0) {
      updateHistoryButtons();
      return false;
    }
    _historyPending = true;
    _pendingDirectOp = null;
    msgs.forEach(function (msg) {
      if (msg && msg.type === 'room_place') {
        _awaitingResolutions.push({
          place: msg.place,
          itemId: msg.itemId,
          x: msg.x,
          y: msg.y
        });
      }
      sendBridge(msg);
    });
    updateHistoryButtons();
    playWorldSound('edit_redo');
    return true;
  }

  function dropRejectedDirectOp() {
    if (!_pendingDirectOp) return;
    const rejected = _pendingDirectOp;
    _pendingDirectOp = null;
    _awaitingResolutions.length = 0;
    const hist = getHistory();
    if (!hist) return;
    const op = rejected.op;
    if (op && op.kind === 'place' && typeof hist.resolvePlacedUid === 'function') {
      hist.resolvePlacedUid(op.place, op.itemId, op.x, op.y, '__rejected__');
    }
    if (typeof hist.undo === 'function' && typeof hist.rollbackPending === 'function') {
      const popped = hist.undo();
      if (popped && popped.length > 0) {
        hist.rollbackPending({ drop: true });
      }
    }
    updateHistoryButtons();
  }

  function getClovers(state) {
    const st = state || _lastState;
    if (!st) return 0;
    if (typeof st.clovers === 'number') return st.clovers;
    if (st.places && typeof st.places.clovers === 'number') return st.places.clovers;
    return 0;
  }

  function computeRoomsSig(roomsState, sceneId) {
    const layouts = roomsState && roomsState.layouts;
    const layout = layouts && sceneId ? layouts[sceneId] : null;
    if (!layout) return String(sceneId || '') + ':none';
    const items = Array.isArray(layout.items) ? layout.items : [];
    const itemsSig = items.map(function (it) {
      if (!it) return '';
      return [it.uid || it.id || '', it.itemId || '', it.x, it.y, it.flip ? 1 : 0, it.variant || ''].join(':');
    }).join('|');
    return [sceneId, layout.cols || 0, layout.rows || 0, layout.wallpaper || '', layout.floor || '', itemsSig].join('#');
  }

  function snapshotLayoutItems(state, sceneId) {
    const map = {};
    const layout = state && state.rooms && state.rooms.layouts && state.rooms.layouts[sceneId];
    const items = layout && Array.isArray(layout.items) ? layout.items : [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it && (it.uid || it.id)) {
        map[it.uid || it.id] = it;
      }
    }
    return map;
  }

  function layoutItemToLocalPx(layout, it) {
    if (!it) return { x: 0, y: 0 };
    if (it.isPixel) return { x: it.x || 0, y: it.y || 0 };
    const atlas = getAtlas();
    const itemId = it.itemId || it.id;
    const entry = (atlas && atlas.items) ? atlas.items[itemId] : null;
    const cw = (entry && entry.cells) ? entry.cells[0] : (it.w || 1);
    const ch = (entry && entry.cells) ? entry.cells[1] : (it.h || 1);
    const geom = (typeof window !== 'undefined' && (window.CuyRoomGeometry || window.CuyRoomGeom)) || null;
    if (geom && typeof geom.cellToPx === 'function') {
      return geom.cellToPx(layout, it.x || 0, it.y || 0, cw, ch);
    }
    return {
      x: Math.round((it.x || 0) * 16 + (cw * 16) / 2),
      y: Math.round(((it.y || 0) + ch) * 16)
    };
  }

  function resyncCanvasThings(state, curScene) {
    if (!state || typeof window === 'undefined') return;
    if (window.CuyScenes && typeof window.CuyScenes.placedThings === 'function' &&
        window.CanvasPig && typeof window.CanvasPig.setThings === 'function') {
      const things = window.CuyScenes.placedThings(state, curScene);
      window.CanvasPig.setThings(things, true);
    }
    refreshSceneLighting(curScene);
  }

  function resolveNewPlacedItems(state, curScene) {
    const hist = getHistory();
    if (!hist || typeof hist.resolvePlacedUid !== 'function') return;
    const layout = state && state.rooms && state.rooms.layouts && state.rooms.layouts[curScene];
    const items = layout && Array.isArray(layout.items) ? layout.items : [];
    const prevMap = _prevItemMap || {};

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it) continue;
      const uid = it.uid || it.id;
      const itemId = it.itemId || it.id;
      if (!uid || !itemId || prevMap[uid]) continue;

      const pxPt = layoutItemToLocalPx(layout, it);
      let followups = [];
      let resolved = false;

      for (let a = _awaitingResolutions.length - 1; a >= 0; a--) {
        const aw = _awaitingResolutions[a];
        if (aw.place === curScene && aw.itemId === itemId) {
          if (aw.x === pxPt.x && aw.y === pxPt.y) {
            followups = hist.resolvePlacedUid(curScene, itemId, pxPt.x, pxPt.y, uid);
            _awaitingResolutions.splice(a, 1);
            resolved = true;
            break;
          }
          if (aw.x === it.x && aw.y === it.y) {
            followups = hist.resolvePlacedUid(curScene, itemId, it.x, it.y, uid);
            _awaitingResolutions.splice(a, 1);
            resolved = true;
            break;
          }
        }
      }

      if (!resolved) {
        const awIdx = _awaitingResolutions.findIndex(function (aw) {
          return aw.place === curScene && aw.itemId === itemId;
        });
        if (awIdx !== -1) {
          const aw = _awaitingResolutions.splice(awIdx, 1)[0];
          followups = hist.resolvePlacedUid(curScene, itemId, aw.x, aw.y, uid);
          resolved = true;
        }
      }

      if (!resolved) {
        followups = hist.resolvePlacedUid(curScene, itemId, pxPt.x, pxPt.y, uid);
      }

      if (Array.isArray(followups) && followups.length > 0) {
        followups.forEach(function (msg) {
          sendBridge(msg);
        });
      }
    }
  }

  function isFixtureItem(thing) {
    if (!thing) return false;
    if (thing.fixture === true || thing.removable === false) return true;
    const uid = String(thing.uid || thing.id || '');
    return uid.indexOf('fx:') === 0;
  }

  function findPlacedThing(uid) {
    if (!uid) return null;
    const inst = (window.CanvasPig && window.CanvasPig.instance) || (window.PigCanvas && window.PigCanvas.instance);
    const things = (inst && inst.things) || [];
    return things.find(function (t) { return (t.id === uid || t.uid === uid); }) || null;
  }

  function showEditToast(text) {
    if (window.bridge && typeof window.bridge.dispatchMessage === 'function') {
      window.bridge.dispatchMessage({ type: 'toast', text: text });
    }
    if (typeof document !== 'undefined') {
      let toastEl = document.getElementById('globalToast');
      if (!toastEl) {
        toastEl = document.createElement('div');
        toastEl.id = 'globalToast';
        toastEl.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background-color:var(--ui-wood-0,#47281c);color:var(--ui-hay-1,#f2dc9b);padding:8px 16px;border:2px solid var(--ui-wood-1,#6f4328);font-family:var(--ui-font,"Pixelify Sans",monospace);font-size:14px;z-index:10000;pointer-events:none;opacity:0;';
        document.body.appendChild(toastEl);
      }
      toastEl.textContent = text;
      toastEl.style.opacity = '1';
      if (toastEl._timer) clearTimeout(toastEl._timer);
      toastEl._timer = setTimeout(function () { toastEl.style.opacity = '0'; }, 2500);
    }
  }

  function sendBridge(msg) {
    if (window.bridge && typeof window.bridge.send === 'function') {
      window.bridge.send(msg);
    }
  }

  function getCurrentSceneId() {
    return (window.CuyPlaces && typeof window.CuyPlaces.getCurrentPlace === 'function')
      ? window.CuyPlaces.getCurrentPlace()
      : _currentSceneId;
  }

  function getRoomGridMetrics(curScene) {
    const geom = (typeof window !== 'undefined' && (window.CuyRoomGeometry || window.CuyRoomGeom)) || null;
    const cellSize = (geom && geom.CELL) || 16;
    const inst = (window.CanvasPig && window.CanvasPig.instance) || (window.PigCanvas && window.PigCanvas.instance);
    const layout = _lastState && _lastState.rooms && _lastState.rooms.layouts && _lastState.rooms.layouts[curScene];
    const cols = (layout && layout.cols) || (inst && inst.roomSize && Math.round(inst.roomSize[0] / cellSize)) || 12;
    const rows = (layout && layout.rows) || (inst && inst.roomSize && Math.round(inst.roomSize[1] / cellSize)) || 7;
    let off = inst && inst.roomOffset;
    if (!off || typeof off.x !== 'number' || typeof off.y !== 'number') {
      off = (geom && typeof geom.stageOffset === 'function')
        ? geom.stageOffset(cols, rows)
        : { x: Math.floor((256 - cols * cellSize) / 2), y: Math.floor((144 - rows * cellSize) / 2) };
    }
    return { cols: cols, rows: rows, off: { x: off.x || 0, y: off.y || 0 }, layout: layout || { cols: cols, rows: rows }, geom: geom, cellSize: cellSize };
  }

  function getRoomFloorMetrics(curScene) {
    const inst = (window.CanvasPig && window.CanvasPig.instance) || (window.PigCanvas && window.PigCanvas.instance);
    const sceneW = (inst && inst.sceneWidth) || 256;
    const sceneH = (inst && inst.sceneHeight) || 144;
    const m = getRoomGridMetrics(curScene);
    const wallH = (inst && typeof inst.wallH === 'number') ? inst.wallH : 32;
    const floorY0 = Math.max(0, (m.off.y || 0) + wallH);
    const floorY1 = sceneH;
    const cs = m.cellSize || 16;
    const cols = Math.floor(sceneW / cs);
    const rows = Math.ceil(Math.max(0, floorY1 - floorY0) / cs);
    return { x0: 0, y0: floorY0, x1: sceneW, y1: floorY1, cols: cols, rows: rows, cellSize: cs, off: { x: 0, y: floorY0 } };
  }

  function snapToCell(curScene, itemId, px, py) {
    const inst = (window.CanvasPig && window.CanvasPig.instance) || (window.PigCanvas && window.PigCanvas.instance);
    const def = (itemId && inst && typeof inst.getItemDef === 'function') ? inst.getItemDef(itemId) : null;
    const sceneKind = getSceneKind(curScene);
    const eh = (typeof window !== 'undefined' && window.EditHistory) || null;
    if (eh && typeof eh.snapCell === 'function') {
      const fm = sceneKind === 'indoor' ? getRoomFloorMetrics(curScene) : { cellSize: 16, y0: 32, x0: 0, cols: 16 };
      return eh.snapCell(sceneKind, def, px, py, {
        cellSize: fm.cellSize,
        floorY0: fm.y0,
        x0: fm.x0,
        cols: fm.cols
      });
    }
    const cw = (def && def.cells && def.cells[0]) || (def && def.w ? Math.max(1, Math.round(def.w / 16)) : 1);
    const ch = (def && def.footH) || (def && def.foot_h) || (def && def.cells && def.cells[1]) || 1;
    if (sceneKind !== 'indoor') {
      const cxOut = Math.floor(px / 16);
      const cyOut = Math.floor(py / 16);
      return {
        x: Math.round((cxOut + cw / 2) * 16),
        y: Math.round((cyOut + 1) * 16),
        cx: cxOut,
        cy: cyOut,
        cw: cw,
        ch: ch,
        off: { x: 0, y: 0 }
      };
    }
    const fm = getRoomFloorMetrics(curScene);
    if (def && def.layer === 'wall') {
      const cxW = Math.max(0, Math.min(fm.cols - cw, Math.floor(px / fm.cellSize)));
      const cyW = Math.max(0, Math.floor(py / fm.cellSize));
      return {
        x: Math.round((cxW + cw / 2) * fm.cellSize),
        y: Math.min(fm.y0, (cyW + 1) * fm.cellSize),
        cx: cxW,
        cy: cyW,
        cw: cw,
        ch: ch,
        off: { x: 0, y: 0 }
      };
    }
    const cx = Math.floor((px - fm.x0) / fm.cellSize);
    const cy = Math.floor((py - fm.y0) / fm.cellSize);
    return {
      x: fm.x0 + Math.round((cx + cw / 2) * fm.cellSize),
      y: fm.y0 + (cy + ch) * fm.cellSize,
      cx: cx,
      cy: cy,
      cw: cw,
      ch: ch,
      off: fm.off
    };
  }

  function refreshSceneLighting(curScene) {
    if (typeof window === 'undefined' || !window.CuyLight || typeof window.CuyLight.build !== 'function') return;
    const inst = (window.CanvasPig && window.CanvasPig.instance) || (window.PigCanvas && window.PigCanvas.instance);
    const placed = (inst && Array.isArray(inst.things)) ? inst.things : undefined;
    const light = window.CuyLight.build(curScene || getCurrentSceneId(), placed);
    if (light) {
      if (inst && typeof inst.setLightScene === 'function') {
        inst.setLightScene(light);
      } else if (window.CanvasPig && typeof window.CanvasPig.setLightScene === 'function') {
        window.CanvasPig.setLightScene(light);
      }
    }
  }

  function toRoomLocalCoords(curScene, sx, sy) {
    if (getSceneKind(curScene) !== 'indoor') return { x: sx, y: sy };
    const m = getRoomGridMetrics(curScene);
    return { x: Math.max(0, sx - m.off.x), y: Math.max(0, sy - m.off.y) };
  }

  function getDomGhost() {
    if (!_domGhost && typeof document !== 'undefined') {
      _domGhost = document.createElement('div');
      _domGhost.id = 'editDragGhost';
      _domGhost.className = 'edit-drag-ghost';
      _domGhost.style.cssText = 'position:fixed;pointer-events:none;z-index:99999;width:32px;height:32px;image-rendering:pixelated;transform:translate(-50%,-50%);display:none;';
      _domGhost.innerHTML = '<img style="width:100%;height:100%;object-fit:contain;image-rendering:pixelated;" draggable="false" alt="">';
      document.body.appendChild(_domGhost);
    }
    return _domGhost;
  }

  function setSelection(uid) {
    _selectedUid = uid || null;
    const inst = (window.CanvasPig && window.CanvasPig.instance) || (window.PigCanvas && window.PigCanvas.instance);
    if (inst) {
      inst.selectedUid = _selectedUid;
    }
    attachCanvasPigSelection();
    ensureSelectionLayer();
    updateToolbar();
  }

  function getSelectedUid() {
    return _selectedUid;
  }

  function updateToolbar() {
    if (typeof document === 'undefined') return;
    const toolbar = document.getElementById('editItemToolbar');
    if (!toolbar) return;

    if (!_isOpen || !_selectedUid) {
      toolbar.style.display = 'none';
      return;
    }

    const inst = (window.CanvasPig && window.CanvasPig.instance) || (window.PigCanvas && window.PigCanvas.instance);
    const things = (inst && inst.things) || [];
    const thing = things.find(function (t) { return (t.id === _selectedUid || t.uid === _selectedUid); });
    if (!thing) {
      toolbar.style.display = 'none';
      return;
    }

    const def = (inst && typeof inst.getItemDef === 'function') ? inst.getItemDef(thing.itemId) : null;
    const img = thing.img || (thing.url && inst ? inst.loadCachedImage(thing.url) : null);
    const sw = thing.w || thing.width || (def && def.w) || (img && (img.naturalWidth || img.width)) || 32;
    const sh = thing.h || thing.height || (def && def.h) || (img && (img.naturalHeight || img.height)) || 32;
    const ax = thing.anchorX !== undefined ? thing.anchorX : (def && def.anchorX !== undefined ? def.anchorX : Math.round(sw / 2));
    const ay = thing.anchorY !== undefined ? thing.anchorY : (def && def.anchorY !== undefined ? def.anchorY : sh);

    const toClientFn = (inst && typeof inst.toClient === 'function')
      ? inst.toClient.bind(inst)
      : (window.CanvasPig && typeof window.CanvasPig.toClient === 'function' ? window.CanvasPig.toClient : null);

    const topPt = toClientFn ? toClientFn(thing.x, thing.y - ay) : { clientX: 0, clientY: 0 };

    toolbar.style.display = 'flex';
    toolbar.style.left = Math.round(topPt.clientX) + 'px';
    if (topPt.clientY < 40) {
      const bottomPt = toClientFn ? toClientFn(thing.x, thing.y - ay + sh) : { clientX: 0, clientY: 0 };
      toolbar.style.top = Math.round(bottomPt.clientY + 6) + 'px';
      toolbar.style.transform = 'translate(-50%, 0)';
    } else {
      toolbar.style.top = Math.round(topPt.clientY - 6) + 'px';
      toolbar.style.transform = 'translate(-50%, -100%)';
    }
  }

  function ensureSelectionLayer() {
    if (typeof window === 'undefined') return;
    if (window.CuyRoom && typeof window.CuyRoom.addLayer === 'function') {
      window.CuyRoom.addLayer('places_edit_grid', 8, function (ctx) {
        if (!_isOpen) return;
        const curScene = getCurrentSceneId();
        const inst = (window.CanvasPig && window.CanvasPig.instance) || (window.PigCanvas && window.PigCanvas.instance);
        const activeItemId = (_hoverTarget && _hoverTarget.isOverCanvas) ? _hoverTarget.itemId : null;
        const cellValidFn = (inst && typeof inst.cellValid === 'function')
          ? inst.cellValid.bind(inst)
          : (window.CanvasPig && typeof window.CanvasPig.cellValid === 'function' ? window.CanvasPig.cellValid : null);

        ctx.save();
        ctx.lineWidth = 1;

        if (getSceneKind(curScene) === 'indoor') {
          const fm = getRoomFloorMetrics(curScene);
          const cs = fm.cellSize;
          ctx.save();
          ctx.beginPath();
          ctx.rect(fm.x0, fm.y0, fm.x1 - fm.x0, fm.y1 - fm.y0);
          ctx.clip();
          for (let cy = 0; cy < fm.rows; cy++) {
            for (let cx = 0; cx < fm.cols; cx++) {
              const x0 = fm.x0 + cx * cs;
              const y0 = fm.y0 + cy * cs;
              let slotValid = true;
              if (activeItemId && cellValidFn) {
                const px = x0 + Math.round(cs * 0.5);
                const py = Math.min(fm.y1, y0 + cs);
                slotValid = !!cellValidFn(activeItemId, px, py);
              }
              ctx.fillStyle = slotValid ? 'rgba(18, 14, 10, 0.28)' : 'rgba(18, 14, 10, 0.14)';
              ctx.fillRect(x0 + 1, y0 + 1, cs - 2, cs - 2);
              ctx.strokeStyle = slotValid ? 'rgba(242, 220, 155, 0.35)' : 'rgba(242, 220, 155, 0.16)';
              ctx.strokeRect(x0 + 0.5, y0 + 0.5, cs - 1, cs - 1);
            }
          }
          ctx.restore();
        }

        if (_hoverTarget && _hoverTarget.isOverCanvas) {
          const cs = 16;
          const off = _hoverTarget.off || { x: 0, y: 0 };
          const hx = off.x + _hoverTarget.cx * cs;
          const hy = off.y + _hoverTarget.cy * cs;
          const hw = (_hoverTarget.cw || 1) * cs;
          const hh = (_hoverTarget.ch || 1) * cs;
          if (_hoverTarget.valid) {
            ctx.fillStyle = 'rgba(242, 220, 155, 0.22)';
            ctx.fillRect(hx + 1, hy + 1, hw - 2, hh - 2);
            ctx.strokeStyle = 'rgba(242, 220, 155, 0.85)';
            ctx.strokeRect(hx + 0.5, hy + 0.5, hw - 1, hh - 1);
          } else {
            ctx.fillStyle = 'rgba(210, 48, 48, 0.55)';
            ctx.fillRect(hx + 1, hy + 1, hw - 2, hh - 2);
            ctx.strokeStyle = 'rgba(255, 80, 80, 0.95)';
            ctx.strokeRect(hx + 0.5, hy + 0.5, hw - 1, hh - 1);
          }
        }

        ctx.restore();
      });

      window.CuyRoom.addLayer('places_edit_selection', 99, function (ctx) {
        if (!_isOpen) return;
        const inst = (window.CanvasPig && window.CanvasPig.instance) || (window.PigCanvas && window.PigCanvas.instance);
        if (!inst) return;

        if (_hoverTarget && _hoverTarget.isOverCanvas && !_hoverTarget.valid && _hoverTarget.itemId) {
          const gDef = (typeof inst.getItemDef === 'function') ? inst.getItemDef(_hoverTarget.itemId) : null;
          const gImg = (gDef && gDef.url) ? inst.loadCachedImage(gDef.url) : (gDef && gDef.img);
          const gSw = (gDef && gDef.w) || (gImg && (gImg.naturalWidth || gImg.width)) || 32;
          const gSh = (gDef && gDef.h) || (gImg && (gImg.naturalHeight || gImg.height)) || 32;
          const gAx = (gDef && gDef.anchorX !== undefined) ? gDef.anchorX : Math.round(gSw / 2);
          const gAy = (gDef && gDef.anchorY !== undefined) ? gDef.anchorY : gSh;
          const gDx = Math.round((_hoverTarget.x || 0) - gAx);
          const gDy = Math.round((_hoverTarget.y || 0) - gAy);

          ctx.save();
          ctx.fillStyle = 'rgba(210, 48, 48, 0.45)';
          ctx.fillRect(gDx, gDy, gSw, gSh);
          ctx.strokeStyle = 'rgba(255, 80, 80, 0.95)';
          ctx.lineWidth = 1;
          ctx.strokeRect(gDx + 0.5, gDy + 0.5, gSw - 1, gSh - 1);
          ctx.restore();
        }

        if (!_selectedUid) return;
        const things = inst.things || [];
        const thing = things.find(function (t) { return (t.id === _selectedUid || t.uid === _selectedUid); });
        if (!thing) return;

        const def = (typeof inst.getItemDef === 'function') ? inst.getItemDef(thing.itemId) : null;
        const img = thing.img || (thing.url ? inst.loadCachedImage(thing.url) : null);
        const sw = thing.w || thing.width || (def && def.w) || (img && (img.naturalWidth || img.width)) || 32;
        const sh = thing.h || thing.height || (def && def.h) || (img && (img.naturalHeight || img.height)) || 32;
        const ax = thing.anchorX !== undefined ? thing.anchorX : (def && def.anchorX !== undefined ? def.anchorX : Math.round(sw / 2));
        const ay = thing.anchorY !== undefined ? thing.anchorY : (def && def.anchorY !== undefined ? def.anchorY : sh);
        const dx = Math.round((thing.x || 0) - ax);
        const dy = Math.round((thing.y || 0) - ay);

        ctx.save();
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 1;
        ctx.strokeRect(dx + 0.5, dy + 0.5, sw - 1, sh - 1);
        ctx.restore();
      });
    }
  }

  function attachCanvasPigSelection() {
    if (typeof window === 'undefined') return;
    if (window.CanvasPig) {
      window.CanvasPig.setSelection = function (uid) {
        setSelection(uid);
      };
      if (!window.CanvasPig._origDebug) {
        window.CanvasPig._origDebug = window.CanvasPig.debug;
        window.CanvasPig.debug = function () {
          const res = window.CanvasPig._origDebug ? window.CanvasPig._origDebug.apply(this, arguments) : {};
          if (res && typeof res === 'object') {
            res.selected = _selectedUid;
            res.selectedUid = _selectedUid;
          }
          return res;
        };
      }
    }
    if (window.PigCanvas) {
      window.PigCanvas.setSelection = function (uid) {
        setSelection(uid);
      };
    }
    const inst = (window.CanvasPig && window.CanvasPig.instance) || (window.PigCanvas && window.PigCanvas.instance);
    if (inst) {
      inst.setSelection = function (uid) {
        setSelection(uid);
      };
    }
  }

  function onPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    if (e.target && e.target.closest('.edit-card-buy')) return;
    const card = e.target.closest('.edit-card');
    if (!card) return;

    const id = card.getAttribute('data-id');
    const ownedStr = card.getAttribute('data-owned');
    const owned = parseInt(ownedStr != null ? ownedStr : '1', 10);
    if (owned <= 0 || card.classList.contains('is-dimmed')) {
      return;
    }

    setSelection(null);
    e.preventDefault();

    const iconImg = card.querySelector('img.edit-card-icon');
    const iconSrc = iconImg ? iconImg.src : '';

    _dragState = {
      active: true,
      itemId: id,
      startX: e.clientX,
      startY: e.clientY
    };

    const ghost = getDomGhost();
    if (ghost) {
      const img = ghost.querySelector('img');
      if (img) img.src = iconSrc;
      ghost.style.left = e.clientX + 'px';
      ghost.style.top = e.clientY + 'px';
      ghost.style.display = 'block';
    }
  }

  function onCanvasPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    if (!_isOpen) return;

    if (e.target && (e.target.closest('#editDrawer') || e.target.closest('#editItemToolbar'))) {
      return;
    }

    const canvas = (window.CanvasPig && window.CanvasPig.instance && window.CanvasPig.instance.canvas)
      || (window.PigCanvas && window.PigCanvas.instance && window.PigCanvas.instance.canvas)
      || (typeof document !== 'undefined' ? document.getElementById('pigCanvas') : null);
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const isOver = (
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    );
    if (!isOver) return;

    const toSceneFn = (window.CanvasPig && typeof window.CanvasPig.toScene === 'function')
      ? window.CanvasPig.toScene
      : (window.CanvasPig && window.CanvasPig.instance && window.CanvasPig.instance.toScene.bind(window.CanvasPig.instance));
    const p = toSceneFn ? toSceneFn(e) : { x: e.clientX - rect.left, y: e.clientY - rect.top };

    const pickAtFn = (window.CanvasPig && typeof window.CanvasPig.pickAt === 'function')
      ? window.CanvasPig.pickAt
      : (window.CanvasPig && window.CanvasPig.instance && window.CanvasPig.instance.pickAt.bind(window.CanvasPig.instance));
    const picked = pickAtFn ? pickAtFn(p.x, p.y) : null;

    if (picked) {
      e.preventDefault();
      e.stopPropagation();
      const uid = picked.uid || picked.id;
      setSelection(uid);
      _itemDragState = {
        active: false,
        moved: false,
        uid: uid,
        itemId: picked.itemId,
        origX: picked.x,
        origY: picked.y,
        startX: e.clientX,
        startY: e.clientY,
        thing: picked,
        currentX: picked.x,
        currentY: picked.y,
        valid: true,
        isOverCanvas: true
      };
    } else {
      if (_selectedUid) {
        setSelection(null);
      }
    }
  }

  function onPointerMove(e) {
    if (_dragState && _dragState.active) {
      const canvas = (window.CanvasPig && window.CanvasPig.instance && window.CanvasPig.instance.canvas)
        || (window.PigCanvas && window.PigCanvas.instance && window.PigCanvas.instance.canvas)
        || (typeof document !== 'undefined' ? document.getElementById('pigCanvas') : null);

      let isOver = false;
      let snappedX = 0;
      let snappedY = 0;
      let valid = false;

      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        isOver = (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        );
        if (isOver) {
          const toSceneFn = (window.CanvasPig && typeof window.CanvasPig.toScene === 'function')
            ? window.CanvasPig.toScene
            : (window.CanvasPig && window.CanvasPig.instance && window.CanvasPig.instance.toScene.bind(window.CanvasPig.instance));
          const p = toSceneFn ? toSceneFn(e) : { x: e.clientX - rect.left, y: e.clientY - rect.top };
          const curScene = getCurrentSceneId();
          const snap = snapToCell(curScene, _dragState.itemId, p.x, p.y);
          snappedX = snap.x;
          snappedY = snap.y;

          const cellValidFn = (window.CanvasPig && typeof window.CanvasPig.cellValid === 'function')
            ? window.CanvasPig.cellValid
            : (window.CanvasPig && window.CanvasPig.instance && window.CanvasPig.instance.cellValid.bind(window.CanvasPig.instance));
          valid = cellValidFn ? cellValidFn(_dragState.itemId, snappedX, snappedY) : true;
          _hoverTarget = {
            cx: snap.cx,
            cy: snap.cy,
            cw: snap.cw,
            ch: snap.ch,
            off: snap.off,
            x: snappedX,
            y: snappedY,
            itemId: _dragState.itemId,
            valid: !!valid,
            isOverCanvas: true
          };
        } else {
          _hoverTarget = null;
        }
      }

      const domGhost = getDomGhost();
      if (isOver) {
        if (domGhost) domGhost.style.display = 'none';
        const setGhostFn = (window.CanvasPig && typeof window.CanvasPig.setGhost === 'function')
          ? window.CanvasPig.setGhost
          : (window.CanvasPig && window.CanvasPig.instance && window.CanvasPig.instance.setGhost.bind(window.CanvasPig.instance));
        if (setGhostFn) {
          setGhostFn({
            itemId: _dragState.itemId,
            x: snappedX,
            y: snappedY,
            valid: valid
          });
        }
      } else {
        if (domGhost) {
          domGhost.style.left = e.clientX + 'px';
          domGhost.style.top = e.clientY + 'px';
          domGhost.style.display = 'block';
        }
        const setGhostFn = (window.CanvasPig && typeof window.CanvasPig.setGhost === 'function')
          ? window.CanvasPig.setGhost
          : (window.CanvasPig && window.CanvasPig.instance && window.CanvasPig.instance.setGhost.bind(window.CanvasPig.instance));
        if (setGhostFn) {
          setGhostFn(null);
        }
      }
    }

    if (_itemDragState) {
      const dist = Math.abs(e.clientX - _itemDragState.startX) + Math.abs(e.clientY - _itemDragState.startY);
      if (!_itemDragState.moved && dist > 4) {
        _itemDragState.moved = true;
        _itemDragState.active = true;
        const toolbar = document.getElementById('editItemToolbar');
        if (toolbar) toolbar.style.display = 'none';

        const inst = (window.CanvasPig && window.CanvasPig.instance) || (window.PigCanvas && window.PigCanvas.instance);
        if (inst && Array.isArray(inst.things)) {
          const idx = inst.things.indexOf(_itemDragState.thing);
          if (idx !== -1) {
            inst.things.splice(idx, 1);
            if (typeof inst.rebuildGrid === 'function') inst.rebuildGrid();
          }
        }
      }

      if (_itemDragState.active) {
        const canvas = (window.CanvasPig && window.CanvasPig.instance && window.CanvasPig.instance.canvas)
          || (window.PigCanvas && window.PigCanvas.instance && window.PigCanvas.instance.canvas)
          || (typeof document !== 'undefined' ? document.getElementById('pigCanvas') : null);

        let isOver = false;
        let snappedX = _itemDragState.origX;
        let snappedY = _itemDragState.origY;
        let valid = false;

        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          isOver = (
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom
          );
          if (isOver) {
            const toSceneFn = (window.CanvasPig && typeof window.CanvasPig.toScene === 'function')
              ? window.CanvasPig.toScene
              : (window.CanvasPig && window.CanvasPig.instance && window.CanvasPig.instance.toScene.bind(window.CanvasPig.instance));
            const p = toSceneFn ? toSceneFn(e) : { x: e.clientX - rect.left, y: e.clientY - rect.top };
            const curScene = getCurrentSceneId();
            const snap = snapToCell(curScene, _itemDragState.itemId, p.x, p.y);
            snappedX = snap.x;
            snappedY = snap.y;

            const cellValidFn = (window.CanvasPig && typeof window.CanvasPig.cellValid === 'function')
              ? window.CanvasPig.cellValid
              : (window.CanvasPig && window.CanvasPig.instance && window.CanvasPig.instance.cellValid.bind(window.CanvasPig.instance));
            valid = cellValidFn ? cellValidFn(_itemDragState.itemId, snappedX, snappedY) : true;
            _hoverTarget = {
              cx: snap.cx,
              cy: snap.cy,
              cw: snap.cw,
              ch: snap.ch,
              off: snap.off,
              x: snappedX,
              y: snappedY,
              itemId: _itemDragState.itemId,
              valid: !!valid,
              isOverCanvas: true
            };
          } else {
            _hoverTarget = null;
          }
        }

        _itemDragState.currentX = snappedX;
        _itemDragState.currentY = snappedY;
        _itemDragState.valid = valid;
        _itemDragState.isOverCanvas = isOver;

        const setGhostFn = (window.CanvasPig && typeof window.CanvasPig.setGhost === 'function')
          ? window.CanvasPig.setGhost
          : (window.CanvasPig && window.CanvasPig.instance && window.CanvasPig.instance.setGhost.bind(window.CanvasPig.instance));

        if (isOver) {
          if (setGhostFn) {
            setGhostFn({
              itemId: _itemDragState.itemId,
              x: snappedX,
              y: snappedY,
              valid: valid
            });
          }
        } else {
          if (setGhostFn) {
            setGhostFn(null);
          }
        }
      }
    }

    if (_isOpen && !(_dragState && _dragState.active) && !(_itemDragState && _itemDragState.moved)) {
      const canvas = (window.CanvasPig && window.CanvasPig.instance && window.CanvasPig.instance.canvas)
        || (window.PigCanvas && window.PigCanvas.instance && window.PigCanvas.instance.canvas)
        || (typeof document !== 'undefined' ? document.getElementById('pigCanvas') : null);
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const isOver = (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        );
        if (isOver) {
          const toSceneFn = (window.CanvasPig && typeof window.CanvasPig.toScene === 'function')
            ? window.CanvasPig.toScene
            : (window.CanvasPig && window.CanvasPig.instance && window.CanvasPig.instance.toScene.bind(window.CanvasPig.instance));
          const p = toSceneFn ? toSceneFn(e) : { x: e.clientX - rect.left, y: e.clientY - rect.top };
          const pickAtFn = (window.CanvasPig && typeof window.CanvasPig.pickAt === 'function')
            ? window.CanvasPig.pickAt
            : (window.CanvasPig && window.CanvasPig.instance && window.CanvasPig.instance.pickAt.bind(window.CanvasPig.instance));
          const picked = pickAtFn ? pickAtFn(p.x, p.y) : null;
          canvas.style.cursor = picked ? 'grab' : '';
        } else {
          canvas.style.cursor = '';
        }
      }
    }
  }

  function onPointerUp(e) {
    if (_dragState && _dragState.active) {
      const activeDrag = _dragState;
      _dragState = null;
      _hoverTarget = null;

      const domGhost = getDomGhost();
      if (domGhost) domGhost.style.display = 'none';

      const setGhostFn = (window.CanvasPig && typeof window.CanvasPig.setGhost === 'function')
        ? window.CanvasPig.setGhost
        : (window.CanvasPig && window.CanvasPig.instance && window.CanvasPig.instance.setGhost.bind(window.CanvasPig.instance));
      if (setGhostFn) {
        setGhostFn(null);
      }

      const canvas = (window.CanvasPig && window.CanvasPig.instance && window.CanvasPig.instance.canvas)
        || (window.PigCanvas && window.PigCanvas.instance && window.PigCanvas.instance.canvas)
        || (typeof document !== 'undefined' ? document.getElementById('pigCanvas') : null);

      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const isOver = (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        );
        if (isOver) {
          const toSceneFn = (window.CanvasPig && typeof window.CanvasPig.toScene === 'function')
            ? window.CanvasPig.toScene
            : (window.CanvasPig && window.CanvasPig.instance && window.CanvasPig.instance.toScene.bind(window.CanvasPig.instance));
          const p = toSceneFn ? toSceneFn(e) : { x: e.clientX - rect.left, y: e.clientY - rect.top };
          const curScene = getCurrentSceneId();
          const snap = snapToCell(curScene, activeDrag.itemId, p.x, p.y);
          const snappedX = snap.x;
          const snappedY = snap.y;

          const cellValidFn = (window.CanvasPig && typeof window.CanvasPig.cellValid === 'function')
            ? window.CanvasPig.cellValid
            : (window.CanvasPig && window.CanvasPig.instance && window.CanvasPig.instance.cellValid.bind(window.CanvasPig.instance));
          const valid = cellValidFn ? cellValidFn(activeDrag.itemId, snappedX, snappedY) : false;

          if (valid) {
            const localPt = toRoomLocalCoords(curScene, snappedX, snappedY);
            pushHistoryOp({
              kind: 'place',
              place: curScene,
              itemId: activeDrag.itemId,
              x: localPt.x,
              y: localPt.y
            });
            sendBridge({
              type: 'room_place',
              place: curScene,
              itemId: activeDrag.itemId,
              x: localPt.x,
              y: localPt.y
            });
            playWorldSound('room_place');
            refreshSceneLighting(curScene);
          } else {
            playWorldSound('edit_error');
          }
        }
      }
    }

    if (_itemDragState) {
      const activeItemDrag = _itemDragState;
      _itemDragState = null;
      _hoverTarget = null;

      const setGhostFn = (window.CanvasPig && typeof window.CanvasPig.setGhost === 'function')
        ? window.CanvasPig.setGhost
        : (window.CanvasPig && window.CanvasPig.instance && window.CanvasPig.instance.setGhost.bind(window.CanvasPig.instance));
      if (setGhostFn) {
        setGhostFn(null);
      }

      const inst = (window.CanvasPig && window.CanvasPig.instance) || (window.PigCanvas && window.PigCanvas.instance);

      if (activeItemDrag.moved) {
        const drawer = document.getElementById('editDrawer');
        let isOverDrawer = false;
        if (drawer && !drawer.hidden) {
          const drect = drawer.getBoundingClientRect();
          isOverDrawer = (
            e.clientX >= drect.left &&
            e.clientX <= drect.right &&
            e.clientY >= drect.top &&
            e.clientY <= drect.bottom
          );
        }

        const curScene = (window.CuyPlaces && typeof window.CuyPlaces.getCurrentPlace === 'function')
          ? window.CuyPlaces.getCurrentPlace()
          : _currentSceneId;

        if (isOverDrawer) {
          if (isFixtureItem(activeItemDrag.thing)) {
            if (activeItemDrag.thing) {
              activeItemDrag.thing.x = activeItemDrag.origX;
              activeItemDrag.thing.y = activeItemDrag.origY;
              if (inst && Array.isArray(inst.things) && inst.things.indexOf(activeItemDrag.thing) === -1) {
                inst.things.push(activeItemDrag.thing);
                if (typeof inst.rebuildGrid === 'function') inst.rebuildGrid();
              }
            }
            showEditToast('You can move this fixture, not stash it.');
            playWorldSound('edit_error');
            setSelection(activeItemDrag.uid);
          } else {
            const origLocal = toRoomLocalCoords(curScene, activeItemDrag.origX, activeItemDrag.origY);
            const removedItemId = (activeItemDrag.thing && (activeItemDrag.thing.itemId || activeItemDrag.thing.id)) || activeItemDrag.itemId;
            pushHistoryOp({
              kind: 'remove',
              place: curScene,
              uid: activeItemDrag.uid,
              itemId: removedItemId,
              x: origLocal.x,
              y: origLocal.y,
              flip: Boolean(activeItemDrag.thing && activeItemDrag.thing.flip)
            });
            sendBridge({
              type: 'room_remove',
              place: curScene,
              uid: activeItemDrag.uid
            });
            playWorldSound('room_remove');
            refreshSceneLighting(curScene);
            setSelection(null);
          }
        } else if (activeItemDrag.isOverCanvas && activeItemDrag.valid) {
          const origLocal = toRoomLocalCoords(curScene, activeItemDrag.origX, activeItemDrag.origY);
          const localPt = toRoomLocalCoords(curScene, activeItemDrag.currentX, activeItemDrag.currentY);
          if (activeItemDrag.thing) {
            activeItemDrag.thing.x = activeItemDrag.currentX;
            activeItemDrag.thing.y = activeItemDrag.currentY;
            if (inst && Array.isArray(inst.things) && inst.things.indexOf(activeItemDrag.thing) === -1) {
              inst.things.push(activeItemDrag.thing);
              if (typeof inst.rebuildGrid === 'function') inst.rebuildGrid();
            }
          }
          if (localPt.x !== origLocal.x || localPt.y !== origLocal.y) {
            pushHistoryOp({
              kind: 'move',
              place: curScene,
              uid: activeItemDrag.uid,
              prevX: origLocal.x,
              prevY: origLocal.y,
              x: localPt.x,
              y: localPt.y
            });
            sendBridge({
              type: 'room_move',
              place: curScene,
              uid: activeItemDrag.uid,
              x: localPt.x,
              y: localPt.y
            });
            playWorldSound('room_move');
          }
          refreshSceneLighting(curScene);
          setSelection(activeItemDrag.uid);
        } else {
          if (activeItemDrag.thing) {
            activeItemDrag.thing.x = activeItemDrag.origX;
            activeItemDrag.thing.y = activeItemDrag.origY;
            if (inst && Array.isArray(inst.things) && inst.things.indexOf(activeItemDrag.thing) === -1) {
              inst.things.push(activeItemDrag.thing);
              if (typeof inst.rebuildGrid === 'function') inst.rebuildGrid();
            }
          }
          setSelection(activeItemDrag.uid);
        }
      } else {
        updateToolbar();
      }
    }
  }

  let _atlasData = null;
  let _worldItemsData = null;
  let _atlasPromise = null;
  let _worldItemsPromise = null;

  function getAssetUrl(rel) {
    if (!rel) return null;
    if (typeof window !== 'undefined') {
      if (window.CuyHome && window.CuyHome.api && typeof window.CuyHome.api.assetUrl === 'function') {
        return window.CuyHome.api.assetUrl(rel);
      }
      const isWebView = !!(window.chrome && window.chrome.webview);
      if (isWebView) {
        return 'https://cuy.assets/' + rel.replace(/^\/+/, '');
      }
      return '../../assets/' + rel.replace(/^\/+/, '');
    }
    return 'assets/' + rel.replace(/^\/+/, '');
  }

  function getAtlas() {
    if (_atlasData) return _atlasData;
    if (typeof window !== 'undefined' && window.CuyScenes && typeof window.CuyScenes.getAtlas === 'function') {
      const a = window.CuyScenes.getAtlas();
      if (a) {
        _atlasData = a;
        return _atlasData;
      }
    }
    if (typeof require !== 'undefined') {
      try {
        const fs = require('fs');
        const path = require('path');
        const candidates = [
          path.resolve(__dirname, '../../../assets/world/atlas.json'),
          path.resolve(__dirname, '../../../../assets/world/atlas.json'),
          path.resolve(process.cwd(), 'assets/world/atlas.json')
        ];
        for (const p of candidates) {
          if (fs.existsSync(p)) {
            _atlasData = JSON.parse(fs.readFileSync(p, 'utf8'));
            return _atlasData;
          }
        }
      } catch (e) {}
    }
    return _atlasData;
  }

  function loadAtlas() {
    if (_atlasData) return Promise.resolve(_atlasData);
    if (_atlasPromise) return _atlasPromise;
    const a = getAtlas();
    if (a) return Promise.resolve(a);
    if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
      const url = getAssetUrl('world/atlas.json');
      _atlasPromise = window.fetch(url)
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          if (data) {
            _atlasData = data;
            _lastDrawerSig = null;
            if (_isOpen && _lastState) render(_lastState);
          }
          return _atlasData;
        })
        .catch(function () { return null; });
      return _atlasPromise;
    }
    return Promise.resolve(null);
  }

  function getWorldItems() {
    if (_worldItemsData) return _worldItemsData;
    if (typeof require !== 'undefined') {
      try {
        const fs = require('fs');
        const path = require('path');
        const candidates = [
          path.resolve(__dirname, '../../../assets/data/world_items.json'),
          path.resolve(__dirname, '../../../../assets/data/world_items.json'),
          path.resolve(process.cwd(), 'assets/data/world_items.json')
        ];
        for (const p of candidates) {
          if (fs.existsSync(p)) {
            _worldItemsData = JSON.parse(fs.readFileSync(p, 'utf8'));
            return _worldItemsData;
          }
        }
      } catch (e) {}
    }
    return _worldItemsData;
  }

  function loadWorldItems() {
    if (_worldItemsData) return Promise.resolve(_worldItemsData);
    if (_worldItemsPromise) return _worldItemsPromise;
    const wi = getWorldItems();
    if (wi) return Promise.resolve(wi);
    if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
      const url = getAssetUrl('data/world_items.json');
      _worldItemsPromise = window.fetch(url)
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          if (data) {
            _worldItemsData = data;
            _lastDrawerSig = null;
            if (_isOpen && _lastState) render(_lastState);
          }
          return _worldItemsData;
        })
        .catch(function () { return null; });
      return _worldItemsPromise;
    }
    return Promise.resolve(null);
  }

  let _placesData = null;
  let _placesPromise = null;

  function getPlacesData() {
    if (_placesData) return _placesData;
    if (typeof require !== 'undefined') {
      try {
        const fs = require('fs');
        const path = require('path');
        const candidates = [
          path.resolve(__dirname, '../../../assets/data/places.json'),
          path.resolve(__dirname, '../../../../assets/data/places.json'),
          path.resolve(process.cwd(), 'assets/data/places.json')
        ];
        for (const p of candidates) {
          if (fs.existsSync(p)) {
            _placesData = JSON.parse(fs.readFileSync(p, 'utf8'));
            return _placesData;
          }
        }
      } catch (e) {}
    }
    return _placesData;
  }

  function loadPlacesData() {
    if (_placesData) return Promise.resolve(_placesData);
    if (_placesPromise) return _placesPromise;
    const pd = getPlacesData();
    if (pd) return Promise.resolve(pd);
    if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
      const url = getAssetUrl('data/places.json');
      _placesPromise = window.fetch(url)
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          if (data) _placesData = data;
          return _placesData;
        })
        .catch(function () { return null; });
      return _placesPromise;
    }
    return Promise.resolve(null);
  }

  function findPlaceDef(sceneId) {
    const pd = getPlacesData();
    if (!pd || !Array.isArray(pd.places)) return null;
    for (let i = 0; i < pd.places.length; i++) {
      const p = pd.places[i];
      if (p && p.id === sceneId) return p;
      if (p && Array.isArray(p.rooms)) {
        for (let j = 0; j < p.rooms.length; j++) {
          const r = p.rooms[j];
          if (r && r.id === sceneId) return r;
        }
      }
    }
    return null;
  }

  // Preload
  ensureEditHistoryLoaded();
  getAtlas();
  getWorldItems();
  getPlacesData();
  loadAtlas();
  loadWorldItems();
  loadPlacesData();
  attachCanvasPigSelection();

  function resolveItemIconUrl(item) {
    if (!item) return null;
    const atlas = getAtlas();
    const id = item.id;
    if (atlas && atlas.items) {
      if (atlas.items[id] && atlas.items[id].file) {
        return getAssetUrl('world/' + atlas.items[id].file);
      }
      const iconKey = item.icon ? String(item.icon).replace(/^icon-/, '').replace(/-/g, '_') : null;
      if (iconKey && atlas.items[iconKey] && atlas.items[iconKey].file) {
        return getAssetUrl('world/' + atlas.items[iconKey].file);
      }
    }
    return null;
  }

  function getItemKind(item) {
    if (!item) return 'indoor';
    if (item.kind === 'indoor' || item.kind === 'outdoor') return item.kind;
    const places = Array.isArray(item.place) ? item.place : (Array.isArray(item.places) ? item.places : []);
    if (places.includes('house') || places.includes('indoor') || places.some(function (p) {
      return typeof p === 'string' && (p.startsWith('pig:') || p === 'salon' || p === 'dorm');
    })) {
      return 'indoor';
    }
    if (places.includes('garden') || places.includes('park') || places.includes('farm') || places.includes('market') || places.includes('outdoor')) {
      return 'outdoor';
    }
    return 'indoor';
  }

  function getSceneKind(sceneId) {
    if (!sceneId) return 'indoor';
    if (['garden', 'park', 'farm', 'market'].includes(sceneId)) return 'outdoor';
    return 'indoor';
  }

  function itemsFor(state, sceneId) {
    if (!sceneId) {
      sceneId = (state && state.places && state.places.current)
        || (typeof window !== 'undefined' && window.CuyPlaces && typeof window.CuyPlaces.getCurrentPlace === 'function' ? window.CuyPlaces.getCurrentPlace() : 'salon');
    }

    if (state && state.edit && Array.isArray(state.edit.items)) {
      return state.edit.items;
    }
    if (state && Array.isArray(state.items)) {
      return state.items;
    }
    if (state && (state.emptyEdit || state.items === null)) {
      return [];
    }

    const sceneKind = getSceneKind(sceneId);

    let list = [];
    const wi = getWorldItems();
    if (wi && Array.isArray(wi.items)) {
      list = wi.items.slice();
    } else if (state && state.rooms && Array.isArray(state.rooms.catalog) && state.rooms.catalog.length > 0) {
      list = state.rooms.catalog.slice();
    }

    const filtered = list.filter(function (item) {
      return getItemKind(item) === sceneKind;
    });

    const placedCounts = {};
    if (state && state.rooms && state.rooms.layouts) {
      const layouts = state.rooms.layouts;
      const orphanKeys = {};
      const pigRooms = (state.rooms && Array.isArray(state.rooms.pigRooms)) ? state.rooms.pigRooms : [];
      const roster = (state && Array.isArray(state.roster)) ? state.roster : [];

      pigRooms.forEach(function (pr) {
        if (!pr) return;
        const canonical = pr.roomId || (pr.namedId ? ('pig:' + pr.namedId) : null);
        const guidRoom = (pr.pigGuid && ('pig:' + pr.pigGuid)) ||
                         (pr.guid && ('pig:' + pr.guid)) ||
                         (pr.pigId && canonical && ('pig:' + pr.pigId) !== canonical ? ('pig:' + pr.pigId) : null);
        if (canonical && guidRoom && layouts[canonical] && layouts[guidRoom]) {
          orphanKeys[guidRoom] = true;
        }

        if (roster.length > 0) {
          const pig = roster.find(function (p) {
            return p && (p.id === pr.pigId || p.namedId === pr.pigId || ('pig:' + p.namedId) === pr.roomId || ('pig:' + p.id) === pr.roomId);
          });
          if (pig && pig.id && pig.namedId && pig.id !== pig.namedId) {
            const cKey = 'pig:' + pig.namedId;
            const gKey = 'pig:' + pig.id;
            if (layouts[cKey] && layouts[gKey]) {
              orphanKeys[gKey] = true;
            }
          }
        }
      });

      roster.forEach(function (pig) {
        if (pig && pig.id && pig.namedId && pig.id !== pig.namedId) {
          const cKey = 'pig:' + pig.namedId;
          const gKey = 'pig:' + pig.id;
          if (layouts[cKey] && layouts[gKey]) {
            orphanKeys[gKey] = true;
          }
        }
      });

      Object.keys(layouts).forEach(function (k) {
        if (orphanKeys[k]) return;
        const lay = layouts[k];
        if (lay && Array.isArray(lay.items)) {
          lay.items.forEach(function (it) {
            if (it && (it.itemId || it.id)) {
              const id = it.itemId || it.id;
              placedCounts[id] = (placedCounts[id] || 0) + 1;
            }
          });
        }
      });
    }

    const INVENTORY_ALIASES = {
      cushion_big: ['bed'],
      hay_bar_wood: ['hay_rack'],
      cosy_nook: ['house', 'warm_house_bed'],
      toy_basket: ['ball', 'tunnel']
    };
    const ESSENTIAL_ORDER = {
      cushion_big: 1,
      hay_bar_wood: 2,
      cosy_nook: 3,
      toy_basket: 4
    };

    const mapped = filtered.map(function (item, idx) {
      const itemId = item.id || item.itemId;
      let owned = 0;
      if (typeof item.owned === 'number') owned = item.owned;
      else if (item.owned === true) owned = 1;

      if (state) {
        if (state.inventory && typeof state.inventory[itemId] === 'number') {
          owned = Math.max(owned, state.inventory[itemId]);
        }
        if (state.inventory && INVENTORY_ALIASES[itemId]) {
          let aliasSum = 0;
          const aliases = INVENTORY_ALIASES[itemId];
          for (let a = 0; a < aliases.length; a++) {
            const ak = aliases[a];
            if (typeof state.inventory[ak] === 'number' && state.inventory[ak] > 0) {
              aliasSum += state.inventory[ak];
            }
          }
          if (aliasSum > 0) {
            owned = Math.max(owned, aliasSum + (placedCounts[itemId] || 0));
          }
        }
        if (state.rooms) {
          if (state.rooms.owned && typeof state.rooms.owned[itemId] === 'number') {
            owned = Math.max(owned, state.rooms.owned[itemId]);
          }
          if (Array.isArray(state.rooms.catalog)) {
            const cat = state.rooms.catalog.find(function (c) { return c && (c.id === itemId || c.itemId === itemId); });
            if (cat) {
              if (typeof cat.owned === 'number') owned = Math.max(owned, cat.owned);
              else if (cat.owned === true) owned = Math.max(owned, 1);
              if (typeof cat.price === 'number') item = Object.assign({}, item, { price: cat.price });
            }
          }
        }
        if (state.world) {
          if (state.world.owned && typeof state.world.owned[itemId] === 'number') {
            owned = Math.max(owned, state.world.owned[itemId]);
          }
          if (state.world.ownedItems && typeof state.world.ownedItems[itemId] === 'number') {
            owned = Math.max(owned, state.world.ownedItems[itemId]);
          }
        }
      }

      const isRepeatable = !!(item.repeatable || (item.places && item.places.indexOf && item.places.indexOf('repeatable') >= 0));
      let available = owned;
      if (!isRepeatable && placedCounts[itemId]) {
        available = Math.max(0, owned - placedCounts[itemId]);
      }

      return {
        entry: Object.assign({}, item, {
          kind: getItemKind(item),
          owned: available
        }),
        idx: idx
      };
    });

    const ownedOnly = mapped.filter(function (m) {
      return m && m.entry && m.entry.owned > 0;
    });

    ownedOnly.sort(function (a, b) {
      const aEss = ESSENTIAL_ORDER[a.entry.id] || 999;
      const bEss = ESSENTIAL_ORDER[b.entry.id] || 999;
      if (aEss !== bEss) return aEss - bEss;
      return a.idx - b.idx;
    });

    return ownedOnly.map(function (m) { return m.entry; });
  }

  function getSceneTitle(sceneId, st) {
    if (!st) st = _lastState;
    if (st && st.places && Array.isArray(st.places.places)) {
      const p = st.places.places.find(function (x) { return x && x.id === sceneId; });
      if (p && p.name) return p.name;
    }
    if (st && st.places && Array.isArray(st.places.rooms)) {
      const r = st.places.rooms.find(function (x) { return x && x.id === sceneId; });
      if (r && r.name) return r.name;
    }
    if (st && st.places && Array.isArray(st.places.order)) {
      const ord = st.places.order.find(function (x) { return x && x.id === sceneId; });
      if (ord && ord.title) return ord.title;
    }
    if (st && st.rooms) {
      if (st.rooms.layouts && st.rooms.layouts[sceneId] && st.rooms.layouts[sceneId].name) {
        return st.rooms.layouts[sceneId].name;
      }
      if (Array.isArray(st.rooms.pigRooms)) {
        const pr = st.rooms.pigRooms.find(function (r) {
          return r && (r.roomId === sceneId || ('pig:' + r.pigId) === sceneId || r.id === sceneId);
        });
        if (pr && (pr.displayName || pr.name)) {
          return pr.displayName || pr.name;
        }
      }
    }
    if (typeof window !== 'undefined' && window.CuyScenes && typeof window.CuyScenes.def === 'function') {
      const d = window.CuyScenes.def(sceneId);
      if (d && d.title) return d.title;
    }
    const def = findPlaceDef(sceneId);
    if (def && def.name) return def.name;
    if (sceneId) {
      return sceneId.charAt(0).toUpperCase() + sceneId.slice(1);
    }
    return 'Scene';
  }

  function isSceneLocked(sceneId, st) {
    if (sceneId === 'salon' || (sceneId && String(sceneId).indexOf('pig:') === 0)) {
      return { locked: false, hint: '' };
    }
    if (!st) st = _lastState;
    if (st && st.places && Array.isArray(st.places.order)) {
      const entry = st.places.order.find(function (s) { return s && s.id === sceneId; });
      if (entry && typeof entry.locked === 'boolean') return { locked: entry.locked, hint: entry.unlockHint || '' };
    }
    if (st && st.places && Array.isArray(st.places.places)) {
      const p = st.places.places.find(function (x) { return x && x.id === sceneId; });
      if (p && typeof p.unlocked === 'boolean') return { locked: !p.unlocked, hint: '' };
    }
    if (st && st.places && Array.isArray(st.places.rooms)) {
      const r = st.places.rooms.find(function (x) { return x && x.id === sceneId; });
      if (r && typeof r.unlocked === 'boolean') return { locked: !r.unlocked, hint: '' };
    }
    if (st && st.world && st.world.places) {
      let wp = null;
      if (Array.isArray(st.world.places)) {
        wp = st.world.places.find(function (x) { return x && x.id === sceneId; });
      } else if (typeof st.world.places === 'object') {
        wp = st.world.places[sceneId];
      }
      if (wp && typeof wp.unlocked === 'boolean') return { locked: !wp.unlocked, hint: '' };
    }
    const hasStatePlaces = !!(st && (st.places || (st.world && st.world.places)));
    if (!hasStatePlaces) {
      const hintBar = typeof document !== 'undefined' ? document.getElementById('placesLockedHint') : null;
      const hintText = typeof document !== 'undefined' ? document.getElementById('placesHintText') : null;
      if (hintBar && !hintBar.hidden) {
        return { locked: true, hint: (hintText ? hintText.textContent : '') || 'Scene is locked' };
      }
    }
    return { locked: false, hint: '' };
  }

  function getPlaceInfo(sceneId, state) {
    if (!state) state = _lastState || {};

    let title = null;
    let level = 1;
    let maxLevel = null;
    let nextLevelCost = null;
    let unlockCost = 0;
    let isLocked = false;

    const clovers = (typeof state.clovers === 'number')
      ? state.clovers
      : ((state.places && typeof state.places.clovers === 'number') ? state.places.clovers : 0);

    // 1. Check state.places.order
    if (state.places && Array.isArray(state.places.order)) {
      const ord = state.places.order.find(function (s) { return s && s.id === sceneId; });
      if (ord) {
        if (ord.title) title = ord.title;
        if (typeof ord.locked === 'boolean') isLocked = ord.locked;
        if (typeof ord.level === 'number') level = ord.level;
        if (typeof ord.maxLevel === 'number') maxLevel = ord.maxLevel;
        if (ord.nextLevelCost !== undefined) nextLevelCost = ord.nextLevelCost;
        else if (ord.nextCost !== undefined) nextLevelCost = ord.nextCost;
        if (ord.unlockCost !== undefined) unlockCost = ord.unlockCost;
        else if (ord.cost !== undefined) unlockCost = ord.cost;
      }
    }

    // 2. Check state.places.places
    if (state.places && Array.isArray(state.places.places)) {
      const pl = state.places.places.find(function (p) { return p && p.id === sceneId; });
      if (pl) {
        if (pl.name) title = pl.name;
        if (typeof pl.unlocked === 'boolean') isLocked = !pl.unlocked;
        if (typeof pl.level === 'number') level = pl.level;
        if (typeof pl.maxLevel === 'number') maxLevel = pl.maxLevel;
        if (pl.nextLevelCost !== undefined) nextLevelCost = pl.nextLevelCost;
        else if (pl.nextCost !== undefined) nextLevelCost = pl.nextCost;
        if (pl.unlockCost !== undefined) unlockCost = pl.unlockCost;
        else if (pl.cost !== undefined) unlockCost = pl.cost;
      }
    }

    // 3. Check state.places.rooms
    if (state.places && Array.isArray(state.places.rooms)) {
      const rm = state.places.rooms.find(function (r) { return r && r.id === sceneId; });
      if (rm) {
        if (rm.name) title = rm.name;
        if (typeof rm.unlocked === 'boolean') isLocked = !rm.unlocked;
        if (typeof rm.level === 'number') level = rm.level;
        if (typeof rm.maxLevel === 'number') maxLevel = rm.maxLevel;
        if (rm.nextLevelCost !== undefined) nextLevelCost = rm.nextLevelCost;
        else if (rm.nextCost !== undefined) nextLevelCost = rm.nextCost;
        if (rm.unlockCost !== undefined) unlockCost = rm.unlockCost;
        else if (rm.cost !== undefined) unlockCost = rm.cost;
      }
    }

    // 4. Check state.world.places
    if (state.world && state.world.places) {
      let wp = null;
      if (Array.isArray(state.world.places)) {
        wp = state.world.places.find(function (p) { return p && p.id === sceneId; });
      } else if (typeof state.world.places === 'object') {
        wp = state.world.places[sceneId];
      }
      if (wp) {
        if (wp.name || wp.title) title = wp.name || wp.title;
        if (typeof wp.unlocked === 'boolean') isLocked = !wp.unlocked;
        if (typeof wp.level === 'number') level = wp.level;
        if (typeof wp.maxLevel === 'number') maxLevel = wp.maxLevel;
        if (wp.nextLevelCost !== undefined) nextLevelCost = wp.nextLevelCost;
        else if (wp.nextCost !== undefined) nextLevelCost = wp.nextCost;
        if (wp.unlockCost !== undefined) unlockCost = wp.unlockCost;
        else if (wp.cost !== undefined) unlockCost = wp.cost;
      }
    }

    // 5. Check state.rooms.pigRooms
    if (state.rooms && Array.isArray(state.rooms.pigRooms)) {
      const pr = state.rooms.pigRooms.find(function (r) {
        return r && (r.roomId === sceneId || ('pig:' + r.pigId) === sceneId || r.id === sceneId);
      });
      if (pr) {
        if (pr.displayName || pr.name) title = pr.displayName || pr.name;
        if (typeof pr.level === 'number') level = pr.level;
        if (typeof pr.maxLevel === 'number') maxLevel = pr.maxLevel;
        if (pr.nextLevelCost !== undefined) nextLevelCost = pr.nextLevelCost;
        else if (pr.nextCost !== undefined) nextLevelCost = pr.nextCost;
      }
    }

    // 6. Check state.dorm
    if (sceneId === 'dorm' && state.dorm) {
      if (typeof state.dorm.unlocked === 'boolean') isLocked = !state.dorm.unlocked;
      if (typeof state.dorm.level === 'number') level = state.dorm.level;
      if (state.dorm.nextLevelCost !== undefined) nextLevelCost = state.dorm.nextLevelCost;
      else if (state.dorm.nextCost !== undefined) nextLevelCost = state.dorm.nextCost;
      if (state.dorm.unlockCost !== undefined) unlockCost = state.dorm.unlockCost;
    }

    // 7. Check places.json def for defaults if not set in state
    const pdef = findPlaceDef(sceneId);
    if (pdef) {
      if (!title && pdef.name) title = pdef.name;
      if (!unlockCost && pdef.cost) unlockCost = pdef.cost;
      if (Array.isArray(pdef.levels)) {
        if (maxLevel == null) maxLevel = pdef.levels.length;
        if (nextLevelCost == null && level < pdef.levels.length) {
          nextLevelCost = pdef.levels[level].cost;
        }
      }
    }

    if (!title) {
      title = getSceneTitle(sceneId, state);
    }

    // Check lock helper for DOM/fallback
    const lockCheck = isSceneLocked(sceneId, state);
    if (lockCheck.locked) {
      isLocked = true;
    }
    if (sceneId === 'salon' || (sceneId && String(sceneId).indexOf('pig:') === 0)) {
      isLocked = false;
    }

    return {
      id: sceneId,
      title: title || sceneId,
      level: level,
      maxLevel: maxLevel,
      nextLevelCost: nextLevelCost,
      unlockCost: unlockCost,
      isLocked: isLocked,
      clovers: clovers
    };
  }

  function renderHeader(state, curScene) {
    if (typeof document === 'undefined') return;
    const titleEl = document.getElementById('editDrawerTitle');
    const levelEl = document.getElementById('editDrawerLevel');
    const upgradeBtn = document.getElementById('editDrawerUpgradeBtn');
    const unlockBtn = document.getElementById('editDrawerUnlockBtn');
    if (!titleEl || !levelEl || !upgradeBtn || !unlockBtn) return;

    const info = getPlaceInfo(curScene, state);

    titleEl.textContent = info.title;

    const meterEl = document.getElementById('editComfortMeter');
    if (meterEl) {
      const eh = (typeof window !== 'undefined' && window.EditHistory) || null;
      const comfort = (eh && typeof eh.computeComfortDisplay === 'function')
        ? eh.computeComfortDisplay(state && state.rooms, curScene)
        : { score: 0, cap: 100, moodPct: 0, ratio: 0, text: 'Comfort 0/100 - mood drops 0% slower' };
      const labelEl = meterEl.querySelector('.edit-comfort-label');
      const fillEl = meterEl.querySelector('.edit-comfort-fill');
      if (labelEl) labelEl.textContent = comfort.text;
      if (fillEl) fillEl.style.width = Math.round((comfort.ratio || 0) * 100) + '%';
      meterEl.setAttribute('data-score', String(comfort.score));
      meterEl.setAttribute('data-cap', String(comfort.cap));
      meterEl.setAttribute('aria-label', comfort.text);
      meterEl.title = comfort.text;
    }

    updateHistoryButtons();
    updateResidentsButton();

    const isIndoor = getSceneKind(curScene) === 'indoor';
    const skinsBtn = document.getElementById('editSkinsBtn');
    const templatesBtn = document.getElementById('editTemplatesBtn');
    const subpanel = document.getElementById('editDrawerSubpanel');
    if (skinsBtn) {
      skinsBtn.hidden = !isIndoor;
      skinsBtn.style.display = isIndoor ? '' : 'none';
      skinsBtn.setAttribute('aria-pressed', _subpanelMode === 'skins' ? 'true' : 'false');
    }
    if (templatesBtn) {
      templatesBtn.hidden = !isIndoor;
      templatesBtn.style.display = isIndoor ? '' : 'none';
      templatesBtn.setAttribute('aria-pressed', _subpanelMode === 'templates' ? 'true' : 'false');
    }
    if (!isIndoor && subpanel) {
      _subpanelMode = null;
      subpanel.hidden = true;
    }

    if (info.isLocked) {
      levelEl.textContent = info.level > 0 ? ('Level ' + info.level) : 'Locked';

      upgradeBtn.style.display = 'none';
      upgradeBtn.hidden = true;

      unlockBtn.style.display = 'inline-flex';
      unlockBtn.hidden = false;

      const cost = typeof info.unlockCost === 'number' ? info.unlockCost : 0;
      unlockBtn.innerHTML = 'Unlock (' + cost + ' <span class="pixel-icon icon-clover" aria-hidden="true"></span>)';

      if (info.clovers < cost) {
        unlockBtn.disabled = true;
        const missing = cost - info.clovers;
        unlockBtn.title = 'Need ' + missing + ' more clovers';
        unlockBtn.setAttribute('aria-label', 'Unlock for ' + cost + ' clovers (need ' + missing + ' more)');
      } else {
        unlockBtn.disabled = false;
        unlockBtn.removeAttribute('title');
        unlockBtn.setAttribute('aria-label', 'Unlock for ' + cost + ' clovers');
      }
    } else {
      unlockBtn.style.display = 'none';
      unlockBtn.hidden = true;

      const isMax = (info.nextLevelCost == null || info.nextLevelCost < 0) ||
                    (info.maxLevel != null && info.level >= info.maxLevel);

      levelEl.textContent = 'Level ' + info.level;

      if (isMax) {
        upgradeBtn.style.display = 'none';
        upgradeBtn.hidden = true;
      } else {
        upgradeBtn.style.display = 'inline-flex';
        upgradeBtn.hidden = false;

        const cost = info.nextLevelCost;
        upgradeBtn.innerHTML = 'Upgrade (' + cost + ' <span class="pixel-icon icon-clover" aria-hidden="true"></span>)';

        if (info.clovers < cost) {
          upgradeBtn.disabled = true;
          const missing = cost - info.clovers;
          upgradeBtn.title = 'Need ' + missing + ' more clovers';
          upgradeBtn.setAttribute('aria-label', 'Upgrade for ' + cost + ' clovers (need ' + missing + ' more)');
        } else {
          upgradeBtn.disabled = false;
          upgradeBtn.removeAttribute('title');
          upgradeBtn.setAttribute('aria-label', 'Upgrade for ' + cost + ' clovers');
        }
      }
    }
  }

  function esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderSubpanel(state, curScene) {
    if (typeof document === 'undefined') return;
    const subpanel = document.getElementById('editDrawerSubpanel');
    const skinsBtn = document.getElementById('editSkinsBtn');
    const templatesBtn = document.getElementById('editTemplatesBtn');
    const isIndoor = getSceneKind(curScene) === 'indoor';
    if (!subpanel) return;

    if (!isIndoor || !_subpanelMode || !_isOpen) {
      subpanel.hidden = true;
      if (skinsBtn) skinsBtn.setAttribute('aria-pressed', 'false');
      if (templatesBtn) templatesBtn.setAttribute('aria-pressed', 'false');
      return;
    }

    subpanel.hidden = false;
    if (skinsBtn) skinsBtn.setAttribute('aria-pressed', _subpanelMode === 'skins' ? 'true' : 'false');
    if (templatesBtn) templatesBtn.setAttribute('aria-pressed', _subpanelMode === 'templates' ? 'true' : 'false');

    if (_subpanelMode === 'skins' && window.EditSkins && typeof window.EditSkins.build === 'function') {
      window.EditSkins.build(subpanel, { state: state || _lastState || {}, roomId: curScene, send: sendBridge });
    } else if (_subpanelMode === 'templates' && window.EditTemplates && typeof window.EditTemplates.build === 'function') {
      window.EditTemplates.build(subpanel, { state: state || _lastState || {}, roomId: curScene, send: sendBridge });
    } else {
      subpanel.innerHTML = '';
    }
  }

  function syncEditOpenBodyClass(drawer) {
    if (typeof document === 'undefined' || !document.body) return;
    const isOpenNow = !!(drawer && !drawer.hidden);
    document.body.classList.toggle('cuy-edit-open', isOpenNow);
    document.body.classList.toggle('cuy-edit-collapsed', isOpenNow && !!_isCollapsed);
  }

  function setDrawerHidden(drawer, hidden) {
    if (!drawer) return;
    drawer.hidden = !!hidden;
    syncEditOpenBodyClass(drawer);
  }

  function observeDrawerHidden(drawer) {
    if (!drawer || drawer._cuyHiddenObserverBound || typeof MutationObserver === 'undefined') return;
    drawer._cuyHiddenObserverBound = true;
    const obs = new MutationObserver(function () {
      syncEditOpenBodyClass(drawer);
    });
    obs.observe(drawer, { attributes: true, attributeFilter: ['hidden'] });
  }

  function applyCollapsedState(drawer) {
    if (!drawer) return;
    drawer.classList.toggle('is-collapsed', !!_isCollapsed);
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.toggle('cuy-edit-collapsed', !drawer.hidden && !!_isCollapsed);
    }
    const collapseBtn = drawer.querySelector('#editDrawerCollapse');
    if (collapseBtn) {
      collapseBtn.setAttribute('aria-expanded', _isCollapsed ? 'false' : 'true');
      collapseBtn.textContent = _isCollapsed ? '\u25B4' : '\u25BE';
      const label = _isCollapsed ? 'Expand stash' : 'Collapse stash';
      collapseBtn.setAttribute('aria-label', label);
      collapseBtn.setAttribute('title', label);
    }
  }

  function bindCollapseButton(container) {
    if (!container) return;
    const collapseBtn = container.querySelector('#editDrawerCollapse');
    if (collapseBtn && !collapseBtn._cuyCollapseBound) {
      collapseBtn._cuyCollapseBound = true;
      collapseBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        _isCollapsed = !_isCollapsed;
        applyCollapsedState(document.getElementById('editDrawer'));
        positionDrawer();
      });
    }
  }

  function bindHeaderActions(container) {
    bindCollapseButton(container);

    const closeBtn = container.querySelector('#editDrawerClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        if (isOpen()) toggle();
      });
    }

    const upgradeBtn = container.querySelector('#editDrawerUpgradeBtn');
    if (upgradeBtn) {
      upgradeBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const curScene = (window.CuyPlaces && typeof window.CuyPlaces.getCurrentPlace === 'function')
          ? window.CuyPlaces.getCurrentPlace()
          : _currentSceneId;
        if (window.CuyPlaces && typeof window.CuyPlaces.upgrade === 'function') {
          window.CuyPlaces.upgrade(curScene);
        } else {
          sendBridge({ type: 'place_upgrade', id: curScene });
        }
      });
    }

    const unlockBtn = container.querySelector('#editDrawerUnlockBtn');
    if (unlockBtn) {
      unlockBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const curScene = (window.CuyPlaces && typeof window.CuyPlaces.getCurrentPlace === 'function')
          ? window.CuyPlaces.getCurrentPlace()
          : _currentSceneId;
        if (window.CuyPlaces && typeof window.CuyPlaces.unlock === 'function') {
          window.CuyPlaces.unlock(curScene);
        } else {
          sendBridge({ type: 'place_unlock', id: curScene });
        }
      });
    }

    const skinsBtn = container.querySelector('#editSkinsBtn');
    if (skinsBtn) {
      skinsBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        _subpanelMode = (_subpanelMode === 'skins') ? null : 'skins';
        const curScene = (window.CuyPlaces && typeof window.CuyPlaces.getCurrentPlace === 'function')
          ? window.CuyPlaces.getCurrentPlace()
          : _currentSceneId;
        renderSubpanel(_lastState, curScene);
      });
    }

    const templatesBtn = container.querySelector('#editTemplatesBtn');
    if (templatesBtn) {
      templatesBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        _subpanelMode = (_subpanelMode === 'templates') ? null : 'templates';
        const curScene = (window.CuyPlaces && typeof window.CuyPlaces.getCurrentPlace === 'function')
          ? window.CuyPlaces.getCurrentPlace()
          : _currentSceneId;
        renderSubpanel(_lastState, curScene);
      });
    }

    const undoBtn = container.querySelector('#editUndoBtn');
    if (undoBtn && !undoBtn._cuyBound) {
      undoBtn._cuyBound = true;
      undoBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        performUndo();
      });
    }

    const redoBtn = container.querySelector('#editRedoBtn');
    if (redoBtn && !redoBtn._cuyBound) {
      redoBtn._cuyBound = true;
      redoBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        performRedo();
      });
    }

    const residentsBtn = container.querySelector('#editResidentsBtn');
    if (residentsBtn && !residentsBtn._cuyBound) {
      residentsBtn._cuyBound = true;
      residentsBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        setShowResidents(!_showResidents);
      });
    }
  }

  function positionDrawer() {
    if (typeof document === 'undefined') return;
    const drawer = document.getElementById('editDrawer');
    if (!drawer || drawer.hidden) return;
    drawer.style.bottom = '0px';
    if (_isCollapsed) {
      drawer.style.maxHeight = '';
      return;
    }
    const vh = window.innerHeight || document.documentElement.clientHeight || 640;
    const canvas = document.getElementById('pigCanvas');
    const bar = document.getElementById('placesBar');
    let maxH = 360;
    if (canvas) {
      const cRect = canvas.getBoundingClientRect();
      if (cRect.height > 0 && cRect.bottom > 0) {
        maxH = Math.floor(vh - cRect.bottom - 4);
      }
    } else if (bar) {
      const bRect = bar.getBoundingClientRect();
      if (bRect.height > 0) {
        maxH = Math.floor(vh - bRect.bottom - 4);
      }
    }
    drawer.style.maxHeight = Math.max(120, maxH) + 'px';
  }

  function ensureDrawerInnerNodes(drawer) {
    const content = drawer.querySelector('#editDrawerContent');
    if (!content) return;
    if (!drawer.querySelector('#editHint')) {
      const hint = document.createElement('div');
      hint.className = 'edit-hint';
      hint.id = 'editHint';
      hint.hidden = !_isOpen;
      hint.textContent = 'Drag objects to move, or drag to drawer to stash';
      drawer.insertBefore(hint, content);
    }
    if (!drawer.querySelector('#editDrawerFilters')) {
      const filters = document.createElement('div');
      filters.className = 'edit-drawer-filters';
      filters.id = 'editDrawerFilters';
      drawer.insertBefore(filters, content);
    }
    if (!drawer.querySelector('#editDrawerSubpanel')) {
      const sub = document.createElement('div');
      sub.className = 'edit-drawer-subpanel';
      sub.id = 'editDrawerSubpanel';
      sub.hidden = true;
      drawer.insertBefore(sub, content);
    }
  }

  function ensureElements() {
    if (typeof document === 'undefined') return;

    const bar = document.getElementById('placesBar');
    if (bar && !document.getElementById('placesEditBtn')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'places-edit-btn ui-btn';
      btn.id = 'placesEditBtn';
      btn.textContent = 'Edit';
      btn.setAttribute('aria-label', 'Edit');
      btn.setAttribute('aria-pressed', 'false');
      btn.addEventListener('click', function () {
        toggle();
      });
      bar.appendChild(btn);
    }

    const actionsHtml =
      '<div class="edit-drawer-header-actions">' +
        '<button type="button" class="ui-btn edit-undo-btn" id="editUndoBtn" aria-label="Undo" title="Undo (Ctrl+Z)" disabled aria-disabled="true">Undo</button>' +
        '<button type="button" class="ui-btn edit-redo-btn" id="editRedoBtn" aria-label="Redo" title="Redo (Ctrl+Y)" disabled aria-disabled="true">Redo</button>' +
        '<button type="button" class="ui-btn edit-residents-btn" id="editResidentsBtn" aria-label="Toggle residents" title="Residents" aria-pressed="' + (_showResidents ? 'true' : 'false') + '">Residents</button>' +
        '<button type="button" class="ui-btn edit-skins-btn" id="editSkinsBtn" aria-label="Skins" title="Skins" aria-pressed="false">Skins</button>' +
        '<button type="button" class="ui-btn edit-templates-btn" id="editTemplatesBtn" aria-label="Themes" title="Themes" aria-pressed="false">Themes</button>' +
        '<button type="button" class="ui-btn edit-market-btn" id="editBuyMarketBtn" data-open-market="1" aria-label="Buy on Market" title="Buy on Market">Buy on Market</button>' +
        '<button type="button" class="ui-btn edit-upgrade-btn" id="editDrawerUpgradeBtn" aria-label="Upgrade place">' +
          'Upgrade (<span class="edit-upgrade-cost">0</span> <span class="pixel-icon icon-clover" aria-hidden="true"></span>)' +
        '</button>' +
        '<button type="button" class="ui-btn edit-unlock-btn" id="editDrawerUnlockBtn" aria-label="Unlock place" style="display:none;" hidden>' +
          'Unlock (<span class="edit-unlock-cost">0</span> <span class="pixel-icon icon-clover" aria-hidden="true"></span>)' +
        '</button>' +
        '<button type="button" class="edit-drawer-collapse" id="editDrawerCollapse" aria-label="Collapse stash" title="Collapse stash" aria-expanded="true">&#x25BE;</button>' +
        '<button type="button" class="ui-close edit-drawer-close" id="editDrawerClose" aria-label="Close stash"></button>' +
      '</div>';

    const leftHeaderHtml =
      '<div class="edit-drawer-header-left">' +
        '<span class="edit-drawer-title" id="editDrawerTitle">Stash</span>' +
        '<span class="edit-drawer-level" id="editDrawerLevel">Level 1</span>' +
        '<div class="edit-comfort-meter" id="editComfortMeter" role="status" aria-label="Comfort 0/100 - mood drops 0% slower">' +
          '<span class="edit-comfort-bar" aria-hidden="true"><span class="edit-comfort-fill" style="width:0%"></span></span>' +
          '<span class="edit-comfort-label">Comfort 0/100 - mood drops 0% slower</span>' +
        '</div>' +
      '</div>';

    const drawerHost = document.getElementById('gameDevice') || document.body;
    const existingDrawer = document.getElementById('editDrawer');
    if (existingDrawer) {
      if (existingDrawer.parentNode !== drawerHost) {
        drawerHost.appendChild(existingDrawer);
      }
      if (!existingDrawer.querySelector('#editDrawerUpgradeBtn') || !existingDrawer.querySelector('#editUndoBtn') || !existingDrawer.querySelector('#editComfortMeter')) {
        const header = existingDrawer.querySelector('.edit-drawer-header');
        if (header) {
          header.innerHTML = leftHeaderHtml + actionsHtml;
          bindHeaderActions(existingDrawer);
        }
        ensureDrawerInnerNodes(existingDrawer);
      } else if (!existingDrawer.querySelector('#editDrawerCollapse')) {
        const actionsEl = existingDrawer.querySelector('.edit-drawer-header-actions');
        const closeBtn = existingDrawer.querySelector('#editDrawerClose');
        if (actionsEl) {
          const colBtn = document.createElement('button');
          colBtn.type = 'button';
          colBtn.className = 'edit-drawer-collapse';
          colBtn.id = 'editDrawerCollapse';
          colBtn.setAttribute('aria-label', 'Collapse stash');
          colBtn.setAttribute('title', 'Collapse stash');
          colBtn.setAttribute('aria-expanded', 'true');
          colBtn.textContent = '\u25BE';
          if (closeBtn && closeBtn.parentNode === actionsEl) {
            actionsEl.insertBefore(colBtn, closeBtn);
          } else {
            actionsEl.appendChild(colBtn);
          }
          bindCollapseButton(existingDrawer);
        }
      }
      if (!existingDrawer._buyBound) {
        existingDrawer.addEventListener('click', function (e) {
          const marketBtn = e.target && e.target.closest('[data-open-market]');
          if (!marketBtn) return;
          e.preventDefault();
          e.stopPropagation();
          close();
          if (window.CuyHome && typeof window.CuyHome.openFeature === 'function') {
            window.CuyHome.openFeature('market', 'toys');
          } else if (window.CuyMarket && typeof window.CuyMarket.openPanel === 'function') {
            window.CuyMarket.openPanel('toys');
          }
        });
        existingDrawer._buyBound = true;
      }
      observeDrawerHidden(existingDrawer);
      applyCollapsedState(existingDrawer);
      syncEditOpenBodyClass(existingDrawer);
    }

    if (!document.getElementById('editDrawer')) {
      const drawer = document.createElement('aside');
      drawer.id = 'editDrawer';
      drawer.className = 'edit-drawer ui-panel-wood';
      drawer.setAttribute('role', 'region');
      drawer.setAttribute('aria-label', 'Item stash');
      drawer.setAttribute('data-allow-clip', 'true');
      setDrawerHidden(drawer, true);
      drawer.innerHTML =
        '<div class="edit-drawer-header">' +
          leftHeaderHtml +
          actionsHtml +
        '</div>' +
        '<div class="edit-hint" id="editHint" hidden>Drag objects to move, or drag to drawer to stash</div>' +
        '<div class="edit-drawer-filters" id="editDrawerFilters"></div>' +
        '<div class="edit-drawer-subpanel" id="editDrawerSubpanel" hidden></div>' +
        '<div class="edit-drawer-content" id="editDrawerContent" role="region" aria-label="Placeable items">' +
          '<div class="edit-drawer-strip" id="editDrawerStrip" role="list"></div>' +
        '</div>';
      drawerHost.appendChild(drawer);
      bindHeaderActions(drawer);
      observeDrawerHidden(drawer);
      applyCollapsedState(drawer);

      if (!drawer._dragBound) {
        drawer.addEventListener('pointerdown', onPointerDown);
        drawer._dragBound = true;
      }
      if (!drawer._buyBound) {
        drawer.addEventListener('click', function (e) {
          const marketBtn = e.target && e.target.closest('[data-open-market]');
          if (!marketBtn) return;
          e.preventDefault();
          e.stopPropagation();
          close();
          if (window.CuyHome && typeof window.CuyHome.openFeature === 'function') {
            window.CuyHome.openFeature('market', 'toys');
          } else if (window.CuyMarket && typeof window.CuyMarket.openPanel === 'function') {
            window.CuyMarket.openPanel('toys');
          }
        });
        drawer._buyBound = true;
      }
    }

    if (!document.getElementById('editItemToolbar')) {
      const toolbar = document.createElement('div');
      toolbar.id = 'editItemToolbar';
      toolbar.className = 'edit-item-toolbar ui-panel-wood';
      toolbar.setAttribute('role', 'toolbar');
      toolbar.setAttribute('aria-label', 'Item actions');
      toolbar.setAttribute('data-allow-clip', 'true');
      toolbar.style.cssText = 'position:fixed;z-index:10000;display:none;align-items:center;gap:4px;padding:4px 6px;pointer-events:auto;image-rendering:pixelated;user-select:none;';
      toolbar.innerHTML =
        '<button type="button" class="ui-btn edit-toolbar-btn edit-toolbar-flip" id="editItemFlipBtn" data-action="flip" aria-label="Flip" title="Flip" style="height:22px;min-height:22px;padding:0 6px;display:inline-flex;align-items:center;gap:4px;font-size:11px;cursor:pointer;">' +
          '<span class="pixel-icon icon-flip"></span> Flip' +
        '</button>' +
        '<button type="button" class="ui-btn edit-toolbar-btn edit-toolbar-remove" id="editItemRemoveBtn" data-action="remove" aria-label="Remove" title="Remove" style="height:22px;min-height:22px;padding:0 6px;display:inline-flex;align-items:center;gap:4px;font-size:11px;cursor:pointer;">' +
          '<span class="pixel-icon icon-trash"></span> Remove' +
        '</button>';
      document.body.appendChild(toolbar);

      toolbar.addEventListener('pointerdown', function (e) {
        e.stopPropagation();
      });

      const flipBtn = toolbar.querySelector('#editItemFlipBtn');
      if (flipBtn) {
        flipBtn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          if (!_selectedUid) return;
          const curScene = (window.CuyPlaces && typeof window.CuyPlaces.getCurrentPlace === 'function')
            ? window.CuyPlaces.getCurrentPlace()
            : _currentSceneId;
          const uid = _selectedUid;
          const inst = (window.CanvasPig && window.CanvasPig.instance) || (window.PigCanvas && window.PigCanvas.instance);
          const things = (inst && inst.things) || [];
          const thing = things.find(function (t) { return (t.id === uid || t.uid === uid); });
          if (thing) {
            thing.flip = !thing.flip;
          }
          pushHistoryOp({
            kind: 'flip',
            place: curScene,
            uid: uid
          });
          sendBridge({
            type: 'room_flip',
            place: curScene,
            uid: uid
          });
          playWorldSound('room_flip');
        });
      }

      const removeBtn = toolbar.querySelector('#editItemRemoveBtn');
      if (removeBtn) {
        removeBtn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          if (!_selectedUid) return;
          const thing = findPlacedThing(_selectedUid);
          if (isFixtureItem(thing)) {
            showEditToast('You can move this fixture, not stash it.');
            playWorldSound('edit_error');
            return;
          }
          const curScene = (window.CuyPlaces && typeof window.CuyPlaces.getCurrentPlace === 'function')
            ? window.CuyPlaces.getCurrentPlace()
            : _currentSceneId;
          const uid = _selectedUid;
          if (thing) {
            const origLocal = toRoomLocalCoords(curScene, thing.x || 0, thing.y || 0);
            pushHistoryOp({
              kind: 'remove',
              place: curScene,
              uid: uid,
              itemId: thing.itemId || thing.id,
              x: origLocal.x,
              y: origLocal.y,
              flip: Boolean(thing.flip)
            });
          }
          setSelection(null);
          sendBridge({
            type: 'room_remove',
            place: curScene,
            uid: uid
          });
          playWorldSound('room_remove');
        });
      }
    }
  }

  function renderStripItems(strip, allItems) {
    if (!strip) return;
    const prevScroll = strip.scrollLeft || 0;
    if (!allItems || allItems.length === 0) {
      strip.innerHTML =
        '<div class="edit-drawer-empty">' +
          '<span>Nothing to place yet </span>' +
          '<button type="button" class="ui-btn edit-market-btn" data-open-market="1">Buy on Market</button>' +
        '</div>';
      return;
    }

    let items = allItems;
    if (window.EditFilters && typeof window.EditFilters.filterItems === 'function') {
      const effectiveTab = _filterState.tab === 'Outdoor' ? 'All' : _filterState.tab;
      items = window.EditFilters.filterItems(allItems, { tab: effectiveTab, query: _filterState.query });
    }

    if (!items || items.length === 0) {
      const msg = (window.EditFilters && window.EditFilters.EMPTY_MESSAGE) || 'No items match your filter';
      strip.innerHTML = '<div class="edit-drawer-empty">' + esc(msg) + '</div>';
      return;
    }

    const html = items.map(function (item) {
      const owned = typeof item.owned === 'number' ? item.owned : (item.owned ? 1 : 0);
      const iconUrl = resolveItemIconUrl(item) || '';
      const footerHtml = '<div class="edit-card-owned">' + owned + ' owned</div>';
      return (
        '<div class="edit-card ui-panel-wood" data-id="' + esc(item.id) + '" data-owned="' + owned + '" role="listitem" tabindex="0">' +
          '<div class="edit-card-icon-wrap">' +
            '<img class="edit-card-icon" src="' + esc(iconUrl) + '" alt="' + esc(item.name || item.id) + '" draggable="false">' +
          '</div>' +
          '<div class="edit-card-name" title="' + esc(item.name || item.id) + '">' + esc(item.name || item.id) + '</div>' +
          footerHtml +
        '</div>'
      );
    }).join('');

    strip.innerHTML = html;
    if (prevScroll > 0) {
      strip.scrollLeft = prevScroll;
    }
  }

  function appendOutdoorTabIfNeeded(filtersEl, allItems, curScene) {
    if (!filtersEl || getSceneKind(curScene) !== 'outdoor') return;
    const tabsEl = filtersEl.querySelector('.edit-drawer-tabs');
    if (!tabsEl || tabsEl.querySelector('[data-tab="Outdoor"]')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'edit-drawer-tab';
    btn.setAttribute('role', 'tab');
    btn.setAttribute('data-tab', 'Outdoor');
    btn.setAttribute('aria-selected', _filterState.tab === 'Outdoor' ? 'true' : 'false');
    btn.textContent = 'Outdoor (' + allItems.length + ')';
    btn.addEventListener('click', function () {
      _filterState.tab = 'Outdoor';
      const allTabs = tabsEl.querySelectorAll('[role="tab"]');
      for (let i = 0; i < allTabs.length; i++) {
        allTabs[i].setAttribute('aria-selected', allTabs[i] === btn ? 'true' : 'false');
      }
      renderStripItems(document.getElementById('editDrawerStrip'), allItems);
    });
    tabsEl.appendChild(btn);
  }

  function renderDrawerContent(state, curScene) {
    const strip = document.getElementById('editDrawerStrip');
    if (!strip) return;

    const isOutdoor = getSceneKind(curScene) === 'outdoor';
    if (!isOutdoor && _filterState.tab === 'Outdoor') {
      _filterState.tab = 'All';
    }

    const allItems = itemsFor(state, curScene);
    const filtersEl = document.getElementById('editDrawerFilters');
    if (filtersEl && window.EditFilters && typeof window.EditFilters.build === 'function') {
      const searchEl = document.getElementById('editDrawerSearch');
      const searchFocused = searchEl && document.activeElement === searchEl;
      if (!searchFocused) {
        window.EditFilters.build(filtersEl, {
          items: allItems,
          tab: _filterState.tab === 'Outdoor' ? 'All' : _filterState.tab,
          query: _filterState.query,
          onChange: function (next) {
            _filterState = { tab: next.tab || 'All', query: next.query || '' };
            const outdoorTab = filtersEl.querySelector('[data-tab="Outdoor"]');
            if (outdoorTab) outdoorTab.setAttribute('aria-selected', 'false');
            renderStripItems(document.getElementById('editDrawerStrip'), allItems);
          }
        });
        appendOutdoorTabIfNeeded(filtersEl, allItems, curScene);
      }
    }

    renderStripItems(strip, allItems);
  }

  function ensurePointerListeners() {
    if (typeof document === 'undefined') return;
    if (!document._cuyEditDragBound) {
      document.addEventListener('pointerdown', onCanvasPointerDown, true);
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
      document.addEventListener('pointercancel', onPointerUp);
      document._cuyEditDragBound = true;
    }
  }

  function computeDrawerSig(state, curScene, currRoomsSig, lockInfo) {
    let allLayoutsSig = '';
    if (state && state.rooms && state.rooms.layouts) {
      const keys = Object.keys(state.rooms.layouts).sort();
      allLayoutsSig = keys.map(function (k) {
        const l = state.rooms.layouts[k];
        const len = l && Array.isArray(l.items) ? l.items.length : 0;
        return k + ':' + len;
      }).join(',');
    }
    let catalogSig = '';
    if (state && state.rooms && Array.isArray(state.rooms.catalog)) {
      catalogSig = state.rooms.catalog.map(function (c) {
        return c ? ((c.id || c.itemId || '') + ':' + (c.owned || 0) + ':' + (c.placed || 0)) : '';
      }).join(',');
    }
    let customItemsSig = '';
    if (state && state.edit && Array.isArray(state.edit.items)) {
      customItemsSig = JSON.stringify(state.edit.items);
    } else if (state && Array.isArray(state.items)) {
      customItemsSig = JSON.stringify(state.items);
    } else if (state && (state.emptyEdit || state.items === null)) {
      customItemsSig = 'empty';
    }
    return [
      curScene,
      _isOpen ? '1' : '0',
      (lockInfo && lockInfo.locked) ? 'L' : 'U',
      getClovers(state),
      currRoomsSig,
      allLayoutsSig,
      catalogSig,
      JSON.stringify((state && state.rooms && state.rooms.owned) || {}),
      JSON.stringify((state && state.inventory) || {}),
      JSON.stringify((state && state.world && (state.world.ownedItems || state.world.owned)) || {}),
      customItemsSig,
      (_worldItemsData && Array.isArray(_worldItemsData.items)) ? _worldItemsData.items.length : 0,
      (_atlasData && _atlasData.items) ? Object.keys(_atlasData.items).length : 0,
      _subpanelMode || ''
    ].join('|');
  }

  function render(state) {
    if (state) _lastState = state;
    else state = _lastState;

    if (typeof document === 'undefined') return;

    if ((_dragState && _dragState.active) || (_itemDragState && (_itemDragState.active || _itemDragState.moved))) {
      return;
    }

    ensureElements();
    ensurePointerListeners();
    attachCanvasPigSelection();
    ensureSelectionLayer();

    const curScene = (state && state.places && state.places.current)
      || (window.CuyPlaces && typeof window.CuyPlaces.getCurrentPlace === 'function' ? window.CuyPlaces.getCurrentPlace() : 'salon');

    if (_currentSceneId && _currentSceneId !== curScene) {
      clearHistory();
      _lastRoomsSig = null;
      _lastDrawerSig = null;
      _prevItemMap = null;
      _selectedUid = null;
    }
    _currentSceneId = curScene;

    const hist = getHistory();
    const currRoomsSig = computeRoomsSig(state && state.rooms, curScene);
    if (_lastRoomsSig === null) {
      _lastRoomsSig = currRoomsSig;
      _prevItemMap = snapshotLayoutItems(state, curScene);
    } else if (currRoomsSig !== _lastRoomsSig) {
      _pendingDirectOp = null;
      _historyPending = false;
      if (hist && typeof hist.acknowledge === 'function') {
        hist.acknowledge();
      }
      resolveNewPlacedItems(state, curScene);
      _lastRoomsSig = currRoomsSig;
      _prevItemMap = snapshotLayoutItems(state, curScene);
      if (_selectedUid && !_prevItemMap[_selectedUid]) {
        setSelection(null);
      }
      updateHistoryButtons();
    } else {
      if (_historyPending && hist && typeof hist.rollbackPending === 'function') {
        _historyPending = false;
        _awaitingResolutions.length = 0;
        hist.rollbackPending();
        resyncCanvasThings(state, curScene);
        updateHistoryButtons();
      } else if (_pendingDirectOp) {
        dropRejectedDirectOp();
        resyncCanvasThings(state, curScene);
      }
    }

    renderHeader(state, curScene);

    const lockInfo = isSceneLocked(curScene, state);
    const editBtn = document.getElementById('placesEditBtn');

    if (editBtn) {
      editBtn.disabled = false;
      editBtn.removeAttribute('title');
      editBtn.setAttribute('aria-pressed', _isOpen ? 'true' : 'false');
    }

    const drawer = document.getElementById('editDrawer');
    if (!drawer) return;

    setDrawerHidden(drawer, !_isOpen);
    applyCollapsedState(drawer);
    const hintEl = document.getElementById('editHint');
    if (hintEl) {
      hintEl.hidden = !_isOpen;
    }

    const drawerSig = computeDrawerSig(state, curScene, currRoomsSig, lockInfo);
    const strip = document.getElementById('editDrawerStrip');
    const stripEmpty = !strip || !strip.children || strip.children.length === 0;
    const needsDrawerRender = (drawerSig !== _lastDrawerSig) || (_isOpen && stripEmpty);

    if (_isOpen) {
      if (needsDrawerRender) {
        _lastDrawerSig = drawerSig;
        if (lockInfo.locked) {
          if (strip) {
            strip.innerHTML = '<div class="edit-drawer-empty">Unlock scene to place items</div>';
          }
        } else {
          renderDrawerContent(state, curScene);
        }
        renderSubpanel(state, curScene);
      }
      positionDrawer();
      updateToolbar();
    } else {
      _lastDrawerSig = drawerSig;
      renderSubpanel(state, curScene);
      updateToolbar();
    }
  }

  function close() {
    if (!_isOpen) return;
    _isOpen = false;
    _lastDrawerSig = null;
    _hoverTarget = null;
    setSelection(null);
    _subpanelMode = null;
    const canvas = (window.CanvasPig && window.CanvasPig.instance && window.CanvasPig.instance.canvas)
      || (window.PigCanvas && window.PigCanvas.instance && window.PigCanvas.instance.canvas)
      || (typeof document !== 'undefined' ? document.getElementById('pigCanvas') : null);
    if (canvas) canvas.style.cursor = '';
    render(_lastState);
  }

  function toggle() {
    _isOpen = !_isOpen;
    _lastDrawerSig = null;
    if (_isOpen) {
      if (window.CuyMarket && typeof window.CuyMarket.closePanel === 'function') {
        try { window.CuyMarket.closePanel(); } catch (e) {}
      }
    } else {
      _hoverTarget = null;
      setSelection(null);
      _subpanelMode = null;
      const canvas = (window.CanvasPig && window.CanvasPig.instance && window.CanvasPig.instance.canvas)
        || (window.PigCanvas && window.PigCanvas.instance && window.PigCanvas.instance.canvas)
        || (typeof document !== 'undefined' ? document.getElementById('pigCanvas') : null);
      if (canvas) canvas.style.cursor = '';
    }
    render(_lastState);
  }

  function isOpen() {
    return _isOpen;
  }

  function init() {
    if (typeof document === 'undefined') return;

    if (!document.querySelector('link[href*="edit-panel.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'features/places/edit-panel.css';
      document.head.appendChild(link);
    }

    ensureEditHistoryLoaded();
    ensureElements();
    ensurePointerListeners();
    attachCanvasPigSelection();
    ensureSelectionLayer();

    // Keydown listener for Ctrl+Z, Ctrl+Y, Escape, Delete, Backspace
    document.addEventListener('keydown', function (e) {
      if (!_isOpen) return;

      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) {
          return;
        }
        const key = (e.key || '').toLowerCase();
        if (key === 'z') {
          e.preventDefault();
          e.stopPropagation();
          if (e.shiftKey) {
            performRedo();
          } else {
            performUndo();
          }
          return;
        }
        if (key === 'y') {
          e.preventDefault();
          e.stopPropagation();
          performRedo();
          return;
        }
      }

      if (e.key === 'Escape') {
        if (_selectedUid) {
          e.preventDefault();
          e.stopPropagation();
          setSelection(null);
        } else {
          toggle();
        }
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (_selectedUid) {
          if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) {
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          const thing = findPlacedThing(_selectedUid);
          if (isFixtureItem(thing)) {
            showEditToast('You can move this fixture, not stash it.');
            playWorldSound('edit_error');
            return;
          }
          const curScene = (window.CuyPlaces && typeof window.CuyPlaces.getCurrentPlace === 'function')
            ? window.CuyPlaces.getCurrentPlace()
            : _currentSceneId;
          const uid = _selectedUid;
          if (thing) {
            const origLocal = toRoomLocalCoords(curScene, thing.x || 0, thing.y || 0);
            pushHistoryOp({
              kind: 'remove',
              place: curScene,
              uid: uid,
              itemId: thing.itemId || thing.id,
              x: origLocal.x,
              y: origLocal.y,
              flip: Boolean(thing.flip)
            });
          }
          setSelection(null);
          sendBridge({
            type: 'room_remove',
            place: curScene,
            uid: uid
          });
          playWorldSound('room_remove');
        }
      }
    });

    // Bridge onState listener
    if (window.bridge && typeof window.bridge.onState === 'function') {
      window.bridge.onState(function (st) {
        render(st);
      });
    }

    // Roll back pending undo/redo or direct op on Core rejection toast
    if (window.bridge && typeof window.bridge.onMessage === 'function') {
      window.bridge.onMessage('toast', function (msg) {
        const text = msg && typeof msg.text === 'string' ? msg.text : '';
        if (!text) return;
        const isReject = /not enough|no room|buy it first|not sold|taken|cannot|can't|locked|full|fixture|fail/i.test(text);
        if (!isReject) return;
        if (_historyPending) {
          const hist = getHistory();
          _historyPending = false;
          _awaitingResolutions.length = 0;
          if (hist && typeof hist.rollbackPending === 'function') {
            hist.rollbackPending();
          }
          resyncCanvasThings(_lastState, getCurrentSceneId());
          updateHistoryButtons();
          playWorldSound('edit_error');
        } else if (_pendingDirectOp) {
          dropRejectedDirectOp();
          resyncCanvasThings(_lastState, getCurrentSceneId());
          playWorldSound('edit_error');
        }
      });
    }

    // Wrap CuyPlaces.openPlace if already defined
    if (window.CuyPlaces && typeof window.CuyPlaces.openPlace === 'function') {
      const origOpen = window.CuyPlaces.openPlace;
      window.CuyPlaces.openPlace = function (id) {
        setSelection(null);
        if (id && id !== _currentSceneId) {
          clearHistory();
          _lastRoomsSig = null;
          _lastDrawerSig = null;
          _prevItemMap = null;
        }
        const res = origOpen.apply(this, arguments);
        try {
          _currentSceneId = id;
          const st = (window.bridge && typeof window.bridge.getState === 'function' ? window.bridge.getState() : (window.bridge && window.bridge.currentState)) || _lastState;
          render(st);
        } catch (err) {}
        return res;
      };
    }

    // Listen to scene navigation arrows
    document.addEventListener('click', function (e) {
      const navBtn = e.target && e.target.closest
        ? e.target.closest('#placesPrevBtn, #placesNextBtn, #placesPrev, #placesNext, #stageEdgeLeft, #stageEdgeRight')
        : (e.target && (e.target.id === 'placesPrevBtn' || e.target.id === 'placesNextBtn') ? e.target : null);
      if (navBtn) {
        setSelection(null);
        clearHistory();
        _lastRoomsSig = null;
        _lastDrawerSig = null;
        _prevItemMap = null;
        setTimeout(function () {
          const st = (window.bridge && typeof window.bridge.getState === 'function' ? window.bridge.getState() : (window.bridge && window.bridge.currentState)) || _lastState;
          render(st);
        }, 30);
      }
    });
  }

  if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  const CuyEdit = {
    toggle: toggle,
    close: close,
    isOpen: isOpen,
    render: render,
    itemsFor: itemsFor,
    loadAtlas: loadAtlas,
    loadWorldItems: loadWorldItems,
    loadPlacesData: loadPlacesData,
    getPlaceInfo: getPlaceInfo,
    setSelection: setSelection,
    getSelectedUid: getSelectedUid,
    getShowResidents: getShowResidents,
    setShowResidents: setShowResidents,
    undo: performUndo,
    redo: performRedo,
    clearHistory: clearHistory,
    getHistoryCounts: getHistoryCounts
  };

  if (typeof window !== 'undefined') {
    window.CuyEdit = CuyEdit;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CuyEdit;
  }
})();
