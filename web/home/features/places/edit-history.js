/**
 * edit-history.js — Pure undo/redo stack, grid snapping, and comfort meter formatting
 * for the Home room editor. UMD module (window.EditHistory / module.exports).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.EditHistory = factory();
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  const MAX_HISTORY = 50;
  const VALID_KINDS = { place: true, remove: true, move: true, flip: true };

  function isNonEmptyString(val) {
    return typeof val === 'string' && val.length > 0;
  }

  function isFiniteNum(val) {
    return typeof val === 'number' && Number.isFinite(val);
  }

  function normalizeOp(op) {
    if (!op || typeof op !== 'object') return null;
    if (!VALID_KINDS[op.kind] || !isNonEmptyString(op.place)) return null;

    if (op.kind === 'place') {
      if (!isNonEmptyString(op.itemId) || !isFiniteNum(op.x) || !isFiniteNum(op.y)) return null;
      return {
        kind: 'place',
        place: op.place,
        itemId: op.itemId,
        x: op.x,
        y: op.y,
        uid: isNonEmptyString(op.uid) ? op.uid : null,
        _awaitingUid: !isNonEmptyString(op.uid),
        _needsFlipRestore: false
      };
    }

    if (op.kind === 'remove') {
      if (!isNonEmptyString(op.uid) || !isNonEmptyString(op.itemId) || !isFiniteNum(op.x) || !isFiniteNum(op.y)) {
        return null;
      }
      return {
        kind: 'remove',
        place: op.place,
        uid: op.uid,
        itemId: op.itemId,
        x: op.x,
        y: op.y,
        flip: Boolean(op.flip),
        _awaitingUid: false,
        _needsFlipRestore: false
      };
    }

    if (op.kind === 'move') {
      if (
        !isNonEmptyString(op.uid) ||
        !isFiniteNum(op.prevX) ||
        !isFiniteNum(op.prevY) ||
        !isFiniteNum(op.x) ||
        !isFiniteNum(op.y)
      ) {
        return null;
      }
      return {
        kind: 'move',
        place: op.place,
        uid: op.uid,
        prevX: op.prevX,
        prevY: op.prevY,
        x: op.x,
        y: op.y
      };
    }

    // flip
    if (!isNonEmptyString(op.uid)) return null;
    return {
      kind: 'flip',
      place: op.place,
      uid: op.uid
    };
  }

  function removeFromStack(stack, entry) {
    const idx = stack.lastIndexOf(entry);
    if (idx !== -1) {
      stack.splice(idx, 1);
      return true;
    }
    return false;
  }

  function create(opts) {
    const maxSteps = opts && isFiniteNum(opts.maxSteps) && opts.maxSteps > 0
      ? Math.floor(opts.maxSteps)
      : MAX_HISTORY;

    const undoStack = [];
    const redoStack = [];
    let _pending = null;

    function push(op) {
      const entry = normalizeOp(op);
      if (!entry) return false;
      undoStack.push(entry);
      redoStack.length = 0;
      _pending = null;
      while (undoStack.length > maxSteps) {
        undoStack.shift();
      }
      return true;
    }

    function matchPlacedEntry(entry, place, itemId, x, y) {
      return (
        entry._awaitingUid &&
        entry.place === place &&
        entry.itemId === itemId &&
        entry.x === x &&
        entry.y === y
      );
    }

    function resolvePlacedUid(place, itemId, x, y, uid) {
      if (!isNonEmptyString(place) || !isNonEmptyString(itemId) || !isFiniteNum(x) || !isFiniteNum(y) || !isNonEmptyString(uid)) {
        return [];
      }

      for (let i = undoStack.length - 1; i >= 0; i -= 1) {
        const entry = undoStack[i];
        if (entry.kind === 'place' && matchPlacedEntry(entry, place, itemId, x, y)) {
          entry.uid = uid;
          entry._awaitingUid = false;
          return [];
        }
      }

      for (let i = redoStack.length - 1; i >= 0; i -= 1) {
        const entry = redoStack[i];
        if (entry.kind === 'remove' && matchPlacedEntry(entry, place, itemId, x, y)) {
          entry.uid = uid;
          entry._awaitingUid = false;
          if (entry.flip === true && entry._needsFlipRestore) {
            entry._needsFlipRestore = false;
            return [{ type: 'room_flip', place: place, uid: uid }];
          }
          return [];
        }
      }

      return [];
    }

    function undo() {
      if (undoStack.length === 0) return [];
      const entry = undoStack[undoStack.length - 1];
      let msgs;

      if (entry.kind === 'place') {
        if (!isNonEmptyString(entry.uid)) return [];
        msgs = [{ type: 'room_remove', place: entry.place, uid: entry.uid }];
      } else if (entry.kind === 'remove') {
        msgs = [{ type: 'room_place', place: entry.place, itemId: entry.itemId, x: entry.x, y: entry.y }];
      } else if (entry.kind === 'move') {
        msgs = [{ type: 'room_move', place: entry.place, uid: entry.uid, x: entry.prevX, y: entry.prevY }];
      } else {
        msgs = [{ type: 'room_flip', place: entry.place, uid: entry.uid }];
      }

      undoStack.pop();
      redoStack.push(entry);

      const prevState = {
        uid: entry.uid,
        awaitingUid: entry._awaitingUid,
        needsFlipRestore: entry._needsFlipRestore
      };

      if (entry.kind === 'remove') {
        entry._awaitingUid = true;
        entry._needsFlipRestore = Boolean(entry.flip);
      }

      _pending = { dir: 'undo', entry: entry, prevState: prevState };
      return msgs;
    }

    function redo() {
      if (redoStack.length === 0) return [];
      const entry = redoStack[redoStack.length - 1];
      let msgs;

      if (entry.kind === 'place') {
        msgs = [{ type: 'room_place', place: entry.place, itemId: entry.itemId, x: entry.x, y: entry.y }];
      } else if (entry.kind === 'remove') {
        if (!isNonEmptyString(entry.uid)) return [];
        msgs = [{ type: 'room_remove', place: entry.place, uid: entry.uid }];
      } else if (entry.kind === 'move') {
        msgs = [{ type: 'room_move', place: entry.place, uid: entry.uid, x: entry.x, y: entry.y }];
      } else {
        msgs = [{ type: 'room_flip', place: entry.place, uid: entry.uid }];
      }

      redoStack.pop();
      undoStack.push(entry);

      const prevState = {
        uid: entry.uid,
        awaitingUid: entry._awaitingUid,
        needsFlipRestore: entry._needsFlipRestore
      };

      if (entry.kind === 'place') {
        entry.uid = null;
        entry._awaitingUid = true;
      }

      _pending = { dir: 'redo', entry: entry, prevState: prevState };
      return msgs;
    }

    function acknowledge() {
      _pending = null;
    }

    function rollbackPending(rollOpts) {
      if (!_pending) return false;
      const pending = _pending;
      _pending = null;
      const entry = pending.entry;

      entry.uid = pending.prevState.uid;
      entry._awaitingUid = Boolean(pending.prevState.awaitingUid);
      entry._needsFlipRestore = Boolean(pending.prevState.needsFlipRestore);

      if (pending.dir === 'undo') {
        removeFromStack(redoStack, entry);
        if (!rollOpts || rollOpts.drop !== true) {
          undoStack.push(entry);
        }
      } else {
        removeFromStack(undoStack, entry);
        if (!rollOpts || rollOpts.drop !== true) {
          redoStack.push(entry);
        }
      }
      return true;
    }

    function clear() {
      undoStack.length = 0;
      redoStack.length = 0;
      _pending = null;
    }

    function counts() {
      return {
        undo: undoStack.length,
        redo: redoStack.length,
        canUndo: undoStack.length > 0,
        canRedo: redoStack.length > 0
      };
    }

    return {
      push: push,
      resolvePlacedUid: resolvePlacedUid,
      undo: undo,
      redo: redo,
      acknowledge: acknowledge,
      rollbackPending: rollbackPending,
      clear: clear,
      counts: counts
    };
  }

  function snapCell(sceneKind, itemDef, px, py, metrics) {
    const m = metrics && typeof metrics === 'object' ? metrics : {};
    const cellSize = isFiniteNum(m.cellSize) && m.cellSize > 0 ? m.cellSize : 16;
    const floorY0 = isFiniteNum(m.floorY0) ? m.floorY0 : (isFiniteNum(m.y0) ? m.y0 : 32);
    const x0 = isFiniteNum(m.x0) ? m.x0 : 0;
    const cols = isFiniteNum(m.cols) && m.cols > 0 ? Math.floor(m.cols) : 16;

    const safePx = isFiniteNum(px) ? px : 0;
    const safePy = isFiniteNum(py) ? py : 0;

    const cw = (itemDef && itemDef.cells && isFiniteNum(itemDef.cells[0]) && itemDef.cells[0] > 0)
      ? itemDef.cells[0]
      : (itemDef && isFiniteNum(itemDef.w) && itemDef.w > 0 ? Math.max(1, Math.round(itemDef.w / cellSize)) : 1);
    const ch = (itemDef && isFiniteNum(itemDef.footH) && itemDef.footH > 0)
      ? itemDef.footH
      : ((itemDef && isFiniteNum(itemDef.foot_h) && itemDef.foot_h > 0)
        ? itemDef.foot_h
        : ((itemDef && itemDef.cells && isFiniteNum(itemDef.cells[1]) && itemDef.cells[1] > 0)
          ? itemDef.cells[1]
          : 1));

    if (sceneKind !== 'indoor') {
      const cxOut = Math.floor(safePx / cellSize);
      const cyOut = Math.floor(safePy / cellSize);
      return {
        x: Math.round((cxOut + cw / 2) * cellSize),
        y: Math.round((cyOut + 1) * cellSize),
        cx: cxOut,
        cy: cyOut,
        cw: cw,
        ch: ch,
        off: { x: 0, y: 0 }
      };
    }

    if (itemDef && itemDef.layer === 'wall') {
      const maxWallCx = Math.max(0, cols - cw);
      const cxW = Math.max(0, Math.min(maxWallCx, Math.floor(safePx / cellSize)));
      const cyW = Math.max(0, Math.floor(safePy / cellSize));
      return {
        x: Math.round((cxW + cw / 2) * cellSize),
        y: Math.min(floorY0, (cyW + 1) * cellSize),
        cx: cxW,
        cy: cyW,
        cw: cw,
        ch: ch,
        off: { x: 0, y: 0 }
      };
    }

    const cx = Math.floor((safePx - x0) / cellSize);
    const cy = Math.floor((safePy - floorY0) / cellSize);
    return {
      x: x0 + Math.round((cx + cw / 2) * cellSize),
      y: floorY0 + (cy + ch) * cellSize,
      cx: cx,
      cy: cy,
      cw: cw,
      ch: ch,
      off: { x: x0, y: floorY0 }
    };
  }

  function computeComfortDisplay(roomsState, sceneId) {
    const rawComfort = roomsState && typeof roomsState === 'object' ? roomsState.comfort : null;
    let entry = null;
    if (rawComfort && typeof rawComfort === 'object') {
      if (isNonEmptyString(sceneId) && rawComfort[sceneId] && typeof rawComfort[sceneId] === 'object') {
        entry = rawComfort[sceneId];
      } else if (
        isFiniteNum(rawComfort.score) ||
        isFiniteNum(rawComfort.cap) ||
        isFiniteNum(rawComfort.moodFactor)
      ) {
        entry = rawComfort;
      }
    }

    const cap = entry && isFiniteNum(entry.cap) && entry.cap > 0 ? entry.cap : 100;
    const rawScore = entry && isFiniteNum(entry.score) ? entry.score : 0;
    const score = Math.max(0, Math.min(cap, rawScore));
    const moodFactor = entry && isFiniteNum(entry.moodFactor) ? entry.moodFactor : 1;
    const rawPct = moodFactor <= 1 ? Math.round((1 - moodFactor) * 100) : Math.round(moodFactor);
    const moodPct = Math.max(0, rawPct);
    const ratio = cap > 0 ? Math.max(0, Math.min(1, score / cap)) : 0;

    return {
      score: score,
      cap: cap,
      moodFactor: moodFactor,
      moodPct: moodPct,
      ratio: ratio,
      text: 'Comfort ' + score + '/' + cap + ' - mood drops ' + moodPct + '% slower'
    };
  }

  return {
    MAX_HISTORY: MAX_HISTORY,
    create: create,
    snapCell: snapCell,
    computeComfortDisplay: computeComfortDisplay
  };
});
