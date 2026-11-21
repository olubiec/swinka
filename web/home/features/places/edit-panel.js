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
  let _filterState = { tab: 'All', query: '' };
  let _subpanelMode = null;

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

  function toRoomLocalCoords(curScene, sx, sy) {
    if (getSceneKind(curScene) !== 'indoor') return { x: sx, y: sy };
    const inst = (window.CanvasPig && window.CanvasPig.instance) || (window.PigCanvas && window.PigCanvas.instance);
    let off = inst && inst.roomOffset;
    if (!off || typeof off.x !== 'number' || typeof off.y !== 'number') {
      const layout = _lastState && _lastState.rooms && _lastState.rooms.layouts && _lastState.rooms.layouts[curScene];
      const cols = (layout && layout.cols) || 12;
      const rows = (layout && layout.rows) || 7;
      off = (window.CuyRoomGeometry && typeof window.CuyRoomGeometry.stageOffset === 'function')
        ? window.CuyRoomGeometry.stageOffset(cols, rows)
        : { x: Math.floor((256 - cols * 16) / 2), y: Math.floor((144 - rows * 16) / 2) };
    }
    return { x: sx - (off.x || 0), y: sy - (off.y || 0) };
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
      window.CuyRoom.addLayer('places_edit_selection', 99, function (ctx) {
        if (!_isOpen || !_selectedUid) return;
        const inst = (window.CanvasPig && window.CanvasPig.instance) || (window.PigCanvas && window.PigCanvas.instance);
        if (!inst) return;
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
          snappedX = Math.round(p.x / 4) * 4;
          snappedY = Math.round(p.y / 4) * 4;

          const cellValidFn = (window.CanvasPig && typeof window.CanvasPig.cellValid === 'function')
            ? window.CanvasPig.cellValid
            : (window.CanvasPig && window.CanvasPig.instance && window.CanvasPig.instance.cellValid.bind(window.CanvasPig.instance));
          valid = cellValidFn ? cellValidFn(_dragState.itemId, snappedX, snappedY) : true;
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
            snappedX = Math.round(p.x / 4) * 4;
            snappedY = Math.round(p.y / 4) * 4;

            const cellValidFn = (window.CanvasPig && typeof window.CanvasPig.cellValid === 'function')
              ? window.CanvasPig.cellValid
              : (window.CanvasPig && window.CanvasPig.instance && window.CanvasPig.instance.cellValid.bind(window.CanvasPig.instance));
            valid = cellValidFn ? cellValidFn(_itemDragState.itemId, snappedX, snappedY) : true;
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
          const snappedX = Math.round(p.x / 4) * 4;
          const snappedY = Math.round(p.y / 4) * 4;

          const cellValidFn = (window.CanvasPig && typeof window.CanvasPig.cellValid === 'function')
            ? window.CanvasPig.cellValid
            : (window.CanvasPig && window.CanvasPig.instance && window.CanvasPig.instance.cellValid.bind(window.CanvasPig.instance));
          const valid = cellValidFn ? cellValidFn(_dragState.itemId, snappedX, snappedY) : false;

          if (valid) {
            const curScene = (window.CuyPlaces && typeof window.CuyPlaces.getCurrentPlace === 'function')
              ? window.CuyPlaces.getCurrentPlace()
              : _currentSceneId;
            const localPt = toRoomLocalCoords(curScene, snappedX, snappedY);
            sendBridge({
              type: 'room_place',
              place: curScene,
              itemId: _dragState.itemId,
              x: localPt.x,
              y: localPt.y
            });
          }
        }
      }

      _dragState = null;
    }

    if (_itemDragState) {
      const setGhostFn = (window.CanvasPig && typeof window.CanvasPig.setGhost === 'function')
        ? window.CanvasPig.setGhost
        : (window.CanvasPig && window.CanvasPig.instance && window.CanvasPig.instance.setGhost.bind(window.CanvasPig.instance));
      if (setGhostFn) {
        setGhostFn(null);
      }

      const inst = (window.CanvasPig && window.CanvasPig.instance) || (window.PigCanvas && window.PigCanvas.instance);

      if (_itemDragState.moved) {
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
          if (isFixtureItem(_itemDragState.thing)) {
            if (_itemDragState.thing) {
              _itemDragState.thing.x = _itemDragState.origX;
              _itemDragState.thing.y = _itemDragState.origY;
              if (inst && Array.isArray(inst.things) && inst.things.indexOf(_itemDragState.thing) === -1) {
                inst.things.push(_itemDragState.thing);
                if (typeof inst.rebuildGrid === 'function') inst.rebuildGrid();
              }
            }
            showEditToast('You can move this fixture, not stash it.');
            setSelection(_itemDragState.uid);
          } else {
            sendBridge({
              type: 'room_remove',
              place: curScene,
              uid: _itemDragState.uid
            });
            setSelection(null);
          }
        } else if (_itemDragState.isOverCanvas && _itemDragState.valid) {
          const localPt = toRoomLocalCoords(curScene, _itemDragState.currentX, _itemDragState.currentY);
          sendBridge({
            type: 'room_move',
            place: curScene,
            uid: _itemDragState.uid,
            x: localPt.x,
            y: localPt.y
          });
          if (_itemDragState.thing) {
            _itemDragState.thing.x = _itemDragState.currentX;
            _itemDragState.thing.y = _itemDragState.currentY;
            if (inst && Array.isArray(inst.things) && inst.things.indexOf(_itemDragState.thing) === -1) {
              inst.things.push(_itemDragState.thing);
              if (typeof inst.rebuildGrid === 'function') inst.rebuildGrid();
            }
          }
          setSelection(_itemDragState.uid);
        } else {
          if (_itemDragState.thing) {
            _itemDragState.thing.x = _itemDragState.origX;
            _itemDragState.thing.y = _itemDragState.origY;
            if (inst && Array.isArray(inst.things) && inst.things.indexOf(_itemDragState.thing) === -1) {
              inst.things.push(_itemDragState.thing);
              if (typeof inst.rebuildGrid === 'function') inst.rebuildGrid();
            }
          }
          setSelection(_itemDragState.uid);
        }
      } else {
        updateToolbar();
      }

      _itemDragState = null;
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
          if (data) _atlasData = data;
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
          if (data) _worldItemsData = data;
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

    return filtered.map(function (item) {
      const itemId = item.id || item.itemId;
      let owned = 0;
      if (typeof item.owned === 'number') owned = item.owned;
      else if (item.owned === true) owned = 1;

      if (state) {
        if (state.inventory && typeof state.inventory[itemId] === 'number') {
          owned = Math.max(owned, state.inventory[itemId]);
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

      return Object.assign({}, item, {
        kind: getItemKind(item),
        owned: available
      });
    });
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
        wp = state.world.places.find(function (x) { return x && x.id === sceneId; });
      } else if (typeof st.world.places === 'object') {
        wp = st.world.places[sceneId];
      }
      if (wp && typeof wp.unlocked === 'boolean') return { locked: !wp.unlocked, hint: '' };
    }
    const hintBar = typeof document !== 'undefined' ? document.getElementById('placesLockedHint') : null;
    const hintText = typeof document !== 'undefined' ? document.getElementById('placesHintText') : null;
    if (hintBar && !hintBar.hidden) {
      return { locked: true, hint: (hintText ? hintText.textContent : '') || 'Scene is locked' };
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
    let maxH = 240;
    if (canvas) {
      const cRect = canvas.getBoundingClientRect();
      if (cRect.height > 0 && cRect.bottom > 0) {
        maxH = Math.min(maxH, Math.floor(vh - cRect.bottom - 4));
      }
    } else if (bar) {
      const bRect = bar.getBoundingClientRect();
      if (bRect.height > 0) {
        maxH = Math.min(maxH, Math.floor(vh - bRect.bottom - 4));
      }
    }
    drawer.style.maxHeight = Math.max(100, maxH) + 'px';
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
        '<button type="button" class="ui-btn edit-skins-btn" id="editSkinsBtn" aria-label="Skins" title="Skins" aria-pressed="false">Skins</button>' +
        '<button type="button" class="ui-btn edit-templates-btn" id="editTemplatesBtn" aria-label="Themes" title="Themes" aria-pressed="false">Themes</button>' +
        '<button type="button" class="ui-btn edit-upgrade-btn" id="editDrawerUpgradeBtn" aria-label="Upgrade place">' +
          'Upgrade (<span class="edit-upgrade-cost">0</span> <span class="pixel-icon icon-clover" aria-hidden="true"></span>)' +
        '</button>' +
        '<button type="button" class="ui-btn edit-unlock-btn" id="editDrawerUnlockBtn" aria-label="Unlock place" style="display:none;" hidden>' +
          'Unlock (<span class="edit-unlock-cost">0</span> <span class="pixel-icon icon-clover" aria-hidden="true"></span>)' +
        '</button>' +
        '<button type="button" class="edit-drawer-collapse" id="editDrawerCollapse" aria-label="Collapse stash" title="Collapse stash" aria-expanded="true">&#x25BE;</button>' +
        '<button type="button" class="ui-close edit-drawer-close" id="editDrawerClose" aria-label="Close stash"></button>' +
      '</div>';

    const existingDrawer = document.getElementById('editDrawer');
    if (existingDrawer) {
      if (!existingDrawer.querySelector('#editDrawerUpgradeBtn')) {
        const header = existingDrawer.querySelector('.edit-drawer-header');
        if (header) {
          header.innerHTML =
            '<div class="edit-drawer-header-left">' +
              '<span class="edit-drawer-title" id="editDrawerTitle">Stash</span>' +
              '<span class="edit-drawer-level" id="editDrawerLevel">Level 1</span>' +
            '</div>' +
            actionsHtml;
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
          '<div class="edit-drawer-header-left">' +
            '<span class="edit-drawer-title" id="editDrawerTitle">Stash</span>' +
            '<span class="edit-drawer-level" id="editDrawerLevel">Level 1</span>' +
          '</div>' +
          actionsHtml +
        '</div>' +
        '<div class="edit-hint" id="editHint" hidden>Drag objects to move, or drag to drawer to stash</div>' +
        '<div class="edit-drawer-filters" id="editDrawerFilters"></div>' +
        '<div class="edit-drawer-subpanel" id="editDrawerSubpanel" hidden></div>' +
        '<div class="edit-drawer-content" id="editDrawerContent" role="region" aria-label="Placeable items">' +
          '<div class="edit-drawer-strip" id="editDrawerStrip" role="list"></div>' +
        '</div>';
      document.body.appendChild(drawer);
      bindHeaderActions(drawer);
      observeDrawerHidden(drawer);
      applyCollapsedState(drawer);

      if (!drawer._dragBound) {
        drawer.addEventListener('pointerdown', onPointerDown);
        drawer._dragBound = true;
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
          if (window.bridge && typeof window.bridge.send === 'function') {
            window.bridge.send({
              type: 'room_flip',
              place: curScene,
              uid: _selectedUid
            });
          }
          const inst = (window.CanvasPig && window.CanvasPig.instance) || (window.PigCanvas && window.PigCanvas.instance);
          const things = (inst && inst.things) || [];
          const thing = things.find(function (t) { return (t.id === _selectedUid || t.uid === _selectedUid); });
          if (thing) {
            thing.flip = !thing.flip;
          }
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
            return;
          }
          const curScene = (window.CuyPlaces && typeof window.CuyPlaces.getCurrentPlace === 'function')
            ? window.CuyPlaces.getCurrentPlace()
            : _currentSceneId;
          const uid = _selectedUid;
          setSelection(null);
          sendBridge({
            type: 'room_remove',
            place: curScene,
            uid: uid
          });
        });
      }
    }
  }

  function renderStripItems(strip, allItems) {
    if (!strip) return;
    if (!allItems || allItems.length === 0) {
      strip.innerHTML = '<div class="edit-drawer-empty">Nothing to place yet</div>';
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
      const dimmedClass = owned === 0 ? ' is-dimmed' : '';
      return (
        '<div class="edit-card ui-panel-wood' + dimmedClass + '" data-id="' + esc(item.id) + '" data-owned="' + owned + '" role="listitem" tabindex="0">' +
          '<div class="edit-card-icon-wrap">' +
            '<img class="edit-card-icon" src="' + esc(iconUrl) + '" alt="' + esc(item.name || item.id) + '" draggable="false">' +
          '</div>' +
          '<div class="edit-card-name" title="' + esc(item.name || item.id) + '">' + esc(item.name || item.id) + '</div>' +
          '<div class="edit-card-owned">' + owned + ' owned</div>' +
        '</div>'
      );
    }).join('');

    strip.innerHTML = html;
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

  function render(state) {
    if (state) _lastState = state;
    else state = _lastState;

    if (typeof document === 'undefined') return;

    ensureElements();
    ensurePointerListeners();
    attachCanvasPigSelection();
    ensureSelectionLayer();

    const curScene = (state && state.places && state.places.current)
      || (window.CuyPlaces && typeof window.CuyPlaces.getCurrentPlace === 'function' ? window.CuyPlaces.getCurrentPlace() : 'salon');
    _currentSceneId = curScene;

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

    if (_isOpen) {
      if (lockInfo.locked) {
        const strip = document.getElementById('editDrawerStrip');
        if (strip) {
          strip.innerHTML = '<div class="edit-drawer-empty">Unlock scene to place items</div>';
        }
      } else {
        renderDrawerContent(state, curScene);
      }
      renderSubpanel(state, curScene);
      positionDrawer();
      updateToolbar();
    } else {
      renderSubpanel(state, curScene);
      updateToolbar();
    }
  }

  function toggle() {
    _isOpen = !_isOpen;
    if (!_isOpen) {
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

    ensureElements();
    ensurePointerListeners();
    attachCanvasPigSelection();
    ensureSelectionLayer();

    // Keydown listener for Escape, Delete, Backspace
    document.addEventListener('keydown', function (e) {
      if (!_isOpen) return;

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
            return;
          }
          const curScene = (window.CuyPlaces && typeof window.CuyPlaces.getCurrentPlace === 'function')
            ? window.CuyPlaces.getCurrentPlace()
            : _currentSceneId;
          const uid = _selectedUid;
          setSelection(null);
          sendBridge({
            type: 'room_remove',
            place: curScene,
            uid: uid
          });
        }
      }
    });

    // Bridge onState listener
    if (window.bridge && typeof window.bridge.onState === 'function') {
      window.bridge.onState(function (st) {
        render(st);
      });
    }

    // Wrap CuyPlaces.openPlace if already defined
    if (window.CuyPlaces && typeof window.CuyPlaces.openPlace === 'function') {
      const origOpen = window.CuyPlaces.openPlace;
      window.CuyPlaces.openPlace = function (id) {
        setSelection(null);
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
      if (e.target && (e.target.id === 'placesPrevBtn' || e.target.id === 'placesNextBtn')) {
        setSelection(null);
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
    isOpen: isOpen,
    render: render,
    itemsFor: itemsFor,
    loadAtlas: loadAtlas,
    loadWorldItems: loadWorldItems,
    loadPlacesData: loadPlacesData,
    getPlaceInfo: getPlaceInfo,
    setSelection: setSelection,
    getSelectedUid: getSelectedUid
  };

  if (typeof window !== 'undefined') {
    window.CuyEdit = CuyEdit;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CuyEdit;
  }
})();
