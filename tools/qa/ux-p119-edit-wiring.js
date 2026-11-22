'use strict';
const path = require('path');
process.env.NODE_PATH = path.resolve(__dirname, 'node_modules');
require('module').Module._initPaths();

const { chromium } = require('playwright');
const ux = require('./lib/ux.js');

async function run() {
  const server = await ux.startServer();
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await ux.openHome(browser, { query: 'mock=seven' });
  await page.setViewportSize({ width: 420, height: 640 });
  page.setDefaultTimeout(5000);

  await page.waitForFunction(
    () => window.CuyEdit && window.EditHistory && window.CanvasPig && window.CanvasPig.instance,
    { timeout: 10000 }
  );

  let hasFailures = false;
  const failed = [];

  async function testScenario(name, fn) {
    try {
      await fn();
      console.log('PASS ' + name);
    } catch (err) {
      hasFailures = true;
      failed.push(name + ': ' + err.message);
      console.log('FAIL ' + name + ': ' + err.message);
    }
  }

  async function resetToSalonEdit() {
    await page.evaluate(() => {
      if (window.CuyPlaces && typeof window.CuyPlaces.openPlace === 'function') {
        window.CuyPlaces.openPlace('salon');
      }
      const st = window.bridge.currentState;
      st.clovers = 500;
      if (!st.rooms) st.rooms = {};
      if (!st.rooms.layouts) st.rooms.layouts = {};
      if (!st.rooms.layouts.salon) {
        st.rooms.layouts.salon = { cols: 12, rows: 7, wallRows: 2, wallpaper: 'wallpaper_cream', floor: 'floor_wood', items: [] };
      }
      st.rooms.layouts.salon.items = [];
      if (!st.rooms.owned) st.rooms.owned = {};
      st.rooms.owned.plant_pot = 20;
      st.rooms.owned.lamp_mushroom = 0;
      st.rooms.comfort = { salon: { score: 0, cap: 100, moodFactor: 1 } };
      window.bridge.broadcastState();
      if (window.CuyEdit) {
        if (!window.CuyEdit.isOpen()) window.CuyEdit.toggle();
        if (typeof window.CuyEdit.clearHistory === 'function') window.CuyEdit.clearHistory();
        window.CuyEdit.render(window.bridge.currentState);
      }
    });
    await page.waitForSelector('#editDrawer:not([hidden])', { timeout: 3000 });
    await page.waitForTimeout(120);
  }

  async function getFreeCellClientPoint(offsetPxX, offsetPxY) {
    return await page.evaluate(({ ox, oy }) => {
      const inst = window.CanvasPig.instance;
      const offX = (inst.roomOffset && inst.roomOffset.x) || 32;
      const offY = (inst.roomOffset && inst.roomOffset.y) || 16;
      const wallH = typeof inst.wallH === 'number' ? inst.wallH : 32;
      const floorY0 = offY + wallH;
      const candidates = [
        [offX + 8, floorY0 + 24],
        [offX + 40, floorY0 + 24],
        [offX + 72, floorY0 + 24],
        [offX + 104, floorY0 + 24],
        [offX + 8, floorY0 + 40],
        [offX + 40, floorY0 + 40],
        [offX + 72, floorY0 + 40]
      ];
      for (const [sx, sy] of candidates) {
        const px = sx + (ox || 0);
        const py = sy + (oy || 0);
        const cx = Math.floor(px / 16);
        const cy = Math.floor((py - floorY0) / 16);
        const snappedX = Math.round((cx + 0.5) * 16);
        const snappedY = floorY0 + (cy + 1) * 16;
        if (inst.cellValid('plant_pot', snappedX, snappedY)) {
          const pt = window.CanvasPig.toClient(px, py);
          return { clientX: pt.clientX, clientY: pt.clientY, snappedX, snappedY, floorY0 };
        }
      }
      throw new Error('No free cell found on salon floor');
    }, { ox: offsetPxX || 0, oy: offsetPxY || 0 });
  }

  async function dragCardToCanvas(itemId, offsetPxX, offsetPxY) {
    const card = page.locator(`.edit-card[data-id="${itemId}"]`).first();
    await card.waitFor({ state: 'visible', timeout: 3000 });
    await card.scrollIntoViewIfNeeded();
    const box = await card.boundingBox();
    if (!box) throw new Error(`Card ${itemId} has no bounding box`);
    const target = await getFreeCellClientPoint(offsetPxX, offsetPxY);

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(target.clientX, target.clientY, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(150);
    return target;
  }

  // P1: undo-after-place
  await testScenario('undo-after-place', async () => {
    await resetToSalonEdit();
    const before = await page.evaluate(() => window.bridge.currentState.rooms.layouts.salon.items.length);
    await dragCardToCanvas('plant_pot', 0, 0);
    const afterPlace = await page.evaluate(() => ({
      count: window.bridge.currentState.rooms.layouts.salon.items.length,
      undoDisabled: document.getElementById('editUndoBtn').disabled,
      redoDisabled: document.getElementById('editRedoBtn').disabled
    }));
    if (afterPlace.count !== before + 1) {
      throw new Error(`Expected ${before + 1} items after place, got ${afterPlace.count}`);
    }
    if (afterPlace.undoDisabled) {
      throw new Error('Expected #editUndoBtn to be enabled after place');
    }
    if (!afterPlace.redoDisabled) {
      throw new Error('Expected #editRedoBtn to remain disabled after place');
    }

    await page.click('#editUndoBtn');
    await page.waitForTimeout(150);
    const afterUndo = await page.evaluate(() => ({
      count: window.bridge.currentState.rooms.layouts.salon.items.length,
      undoDisabled: document.getElementById('editUndoBtn').disabled,
      redoDisabled: document.getElementById('editRedoBtn').disabled
    }));
    if (afterUndo.count !== before) {
      throw new Error(`Expected ${before} items after undo, got ${afterUndo.count}`);
    }
    if (!afterUndo.undoDisabled || afterUndo.redoDisabled) {
      throw new Error(`Unexpected button states after undo: ${JSON.stringify(afterUndo)}`);
    }
  });

  // P2: redo-after-undo
  await testScenario('redo-after-undo', async () => {
    const before = await page.evaluate(() => window.bridge.currentState.rooms.layouts.salon.items.length);
    await page.click('#editRedoBtn');
    await page.waitForTimeout(150);
    const afterRedo = await page.evaluate(() => ({
      count: window.bridge.currentState.rooms.layouts.salon.items.length,
      undoDisabled: document.getElementById('editUndoBtn').disabled,
      redoDisabled: document.getElementById('editRedoBtn').disabled
    }));
    if (afterRedo.count !== before + 1) {
      throw new Error(`Expected ${before + 1} items after redo, got ${afterRedo.count}`);
    }
    if (afterRedo.undoDisabled || !afterRedo.redoDisabled) {
      throw new Error(`Unexpected button states after redo: ${JSON.stringify(afterRedo)}`);
    }
  });

  // P3: ctrl-z-ctrl-y
  await testScenario('ctrl-z-ctrl-y', async () => {
    await resetToSalonEdit();
    await dragCardToCanvas('plant_pot', 0, 0);
    const afterPlace = await page.evaluate(() => window.bridge.currentState.rooms.layouts.salon.items.length);
    if (afterPlace !== 1) throw new Error(`Expected 1 item after place, got ${afterPlace}`);

    await page.keyboard.press('Control+z');
    await page.waitForTimeout(150);
    const afterCtrlZ = await page.evaluate(() => window.bridge.currentState.rooms.layouts.salon.items.length);
    if (afterCtrlZ !== 0) throw new Error(`Expected 0 items after Ctrl+Z, got ${afterCtrlZ}`);

    await page.keyboard.press('Control+y');
    await page.waitForTimeout(150);
    const afterCtrlY = await page.evaluate(() => window.bridge.currentState.rooms.layouts.salon.items.length);
    if (afterCtrlY !== 1) throw new Error(`Expected 1 item after Ctrl+Y, got ${afterCtrlY}`);
  });

  // P4: buttons-disabled-when-empty
  await testScenario('buttons-disabled-when-empty', async () => {
    await resetToSalonEdit();
    const state = await page.evaluate(() => ({
      undoDisabled: document.getElementById('editUndoBtn').disabled,
      redoDisabled: document.getElementById('editRedoBtn').disabled,
      undoAria: document.getElementById('editUndoBtn').getAttribute('aria-disabled'),
      redoAria: document.getElementById('editRedoBtn').getAttribute('aria-disabled'),
      counts: window.CuyEdit.getHistoryCounts()
    }));
    if (!state.undoDisabled || !state.redoDisabled || state.undoAria !== 'true' || state.redoAria !== 'true') {
      throw new Error(`Expected both undo/redo buttons disabled when empty, got ${JSON.stringify(state)}`);
    }
    if (state.counts.undo !== 0 || state.counts.redo !== 0) {
      throw new Error(`Expected empty counts, got ${JSON.stringify(state.counts)}`);
    }
  });

  // P5: snap-on-drop
  await testScenario('snap-on-drop', async () => {
    await resetToSalonEdit();
    await page.evaluate(() => {
      window.__capturedRoomPlace = [];
      const origSend = window.bridge.send.bind(window.bridge);
      window.__origBridgeSendP5 = origSend;
      window.bridge.send = function (msg) {
        if (msg && msg.type === 'room_place') {
          window.__capturedRoomPlace.push(msg);
        }
        return origSend(msg);
      };
    });

    try {
      await dragCardToCanvas('plant_pot', 5, 7);
      const res = await page.evaluate(() => ({
        msgs: window.__capturedRoomPlace,
        items: window.bridge.currentState.rooms.layouts.salon.items
      }));
      if (!res.msgs.length) throw new Error('No room_place message captured on drop');
      const sent = res.msgs[0];
      if ((sent.x % 16) !== 8 || (sent.y % 16) !== 0) {
        throw new Error(`Expected snapped room-local coords (x%16===8, y%16===0), got x=${sent.x}, y=${sent.y}`);
      }
      if (res.items.length !== 1) {
        throw new Error(`Expected 1 placed item, got ${res.items.length}`);
      }
    } finally {
      await page.evaluate(() => {
        if (window.__origBridgeSendP5) {
          window.bridge.send = window.__origBridgeSendP5;
          delete window.__origBridgeSendP5;
        }
      });
    }
  });

  // P6: comfort-meter-updates
  await testScenario('comfort-meter-updates', async () => {
    await resetToSalonEdit();
    const initialText = await page.$eval('#editComfortMeter', el => el.textContent.trim());
    if (!initialText.includes('Comfort 0/100')) {
      throw new Error(`Expected initial comfort text to include "Comfort 0/100", got "${initialText}"`);
    }

    await page.evaluate(() => {
      const st = window.bridge.currentState;
      st.rooms.comfort = { salon: { score: 42, cap: 100, moodFactor: 0.94 } };
      window.bridge.broadcastState();
    });
    await page.waitForTimeout(120);

    const updated = await page.evaluate(() => {
      const meter = document.getElementById('editComfortMeter');
      const fill = meter ? meter.querySelector('.edit-comfort-fill') : null;
      return {
        text: meter ? meter.textContent.trim() : '',
        fillWidth: fill ? fill.style.width : ''
      };
    });
    if (!updated.text.includes('Comfort 42/100 - mood drops 6% slower')) {
      throw new Error(`Unexpected comfort text: "${updated.text}"`);
    }
    if (updated.fillWidth !== '42%') {
      throw new Error(`Expected comfort fill width "42%", got "${updated.fillWidth}"`);
    }
  });

  // P7: scene-change-clears-history
  await testScenario('scene-change-clears-history', async () => {
    await resetToSalonEdit();
    await dragCardToCanvas('plant_pot', 0, 0);
    const beforeSwitch = await page.evaluate(() => window.CuyEdit.getHistoryCounts());
    if (beforeSwitch.undo !== 1) {
      throw new Error(`Expected undo=1 before scene switch, got ${JSON.stringify(beforeSwitch)}`);
    }

    await page.click('#placesNextBtn');
    await page.waitForTimeout(180);

    const afterSwitch = await page.evaluate(() => ({
      counts: window.CuyEdit.getHistoryCounts(),
      undoDisabled: document.getElementById('editUndoBtn').disabled,
      redoDisabled: document.getElementById('editRedoBtn').disabled
    }));
    if (afterSwitch.counts.undo !== 0 || afterSwitch.counts.redo !== 0 || !afterSwitch.undoDisabled || !afterSwitch.redoDisabled) {
      throw new Error(`Expected history cleared on scene change, got ${JSON.stringify(afterSwitch)}`);
    }
  });

  // P8: core-reject-keeps-ui-consistent
  await testScenario('core-reject-keeps-ui-consistent', async () => {
    await resetToSalonEdit();
    await dragCardToCanvas('plant_pot', 0, 0);

    await page.evaluate(() => {
      window.__origBridgeSendP8 = window.bridge.send.bind(window.bridge);
      window.bridge.send = function (msg) {
        if (msg && msg.type === 'room_remove') {
          window.bridge.dispatchMessage({ type: 'toast', text: 'Cannot remove right now' });
          window.bridge.broadcastState();
          return;
        }
        return window.__origBridgeSendP8(msg);
      };
    });

    try {
      await page.click('#editUndoBtn');
      await page.waitForTimeout(150);

      const afterReject = await page.evaluate(() => ({
        count: window.bridge.currentState.rooms.layouts.salon.items.length,
        thingsCount: window.CanvasPig.instance.things.length,
        counts: window.CuyEdit.getHistoryCounts(),
        undoDisabled: document.getElementById('editUndoBtn').disabled,
        redoDisabled: document.getElementById('editRedoBtn').disabled
      }));

      if (afterReject.count !== 1) {
        throw new Error(`Expected layout item to remain after Core reject, got count=${afterReject.count}`);
      }
      if (afterReject.thingsCount !== 1) {
        throw new Error(`Expected CanvasPig thingsCount=1 after Core reject, got ${afterReject.thingsCount}`);
      }
      if (afterReject.counts.undo !== 1 || afterReject.counts.redo !== 0 || afterReject.undoDisabled || !afterReject.redoDisabled) {
        throw new Error(`Expected history rolled back after Core reject, got ${JSON.stringify(afterReject)}`);
      }
    } finally {
      await page.evaluate(() => {
        if (window.__origBridgeSendP8) {
          window.bridge.send = window.__origBridgeSendP8;
          delete window.__origBridgeSendP8;
        }
      });
    }
  });

  // P9: drawer-fits-420x640
  await testScenario('drawer-fits-420x640', async () => {
    await resetToSalonEdit();
    const layout = await page.evaluate(() => {
      const drawer = document.getElementById('editDrawer');
      const editBtn = document.getElementById('placesEditBtn');
      const undoBtn = document.getElementById('editUndoBtn');
      const redoBtn = document.getElementById('editRedoBtn');
      const resBtn = document.getElementById('editResidentsBtn');
      const meter = document.getElementById('editComfortMeter');
      const dr = drawer.getBoundingClientRect();
      return {
        vw: window.innerWidth,
        vh: window.innerHeight,
        docScrollW: document.documentElement.scrollWidth,
        drawerRect: { left: dr.left, right: dr.right, top: dr.top, bottom: dr.bottom, width: dr.width, height: dr.height },
        drawerScrollW: drawer.scrollWidth,
        drawerClientW: drawer.clientWidth,
        editBtnText: editBtn ? editBtn.textContent.trim() : '',
        editBtnVisible: !!(editBtn && editBtn.offsetParent !== null),
        hasControls: Boolean(undoBtn && redoBtn && resBtn && meter)
      };
    });

    if (!layout.hasControls) {
      throw new Error('Missing expected edit drawer controls (#editUndoBtn, #editRedoBtn, #editResidentsBtn, #editComfortMeter)');
    }
    if (!layout.editBtnVisible || layout.editBtnText !== 'Edit') {
      throw new Error(`Expected visible #placesEditBtn with text "Edit", got "${layout.editBtnText}" visible=${layout.editBtnVisible}`);
    }
    if (layout.drawerRect.left < 0 || layout.drawerRect.right > 420 || layout.drawerRect.bottom > 640) {
      throw new Error(`Drawer exceeds 420x640 bounds: ${JSON.stringify(layout.drawerRect)}`);
    }
    if (layout.drawerScrollW > layout.drawerClientW + 1 || layout.docScrollW > 420) {
      throw new Error(`Horizontal overflow detected: drawer ${layout.drawerScrollW}/${layout.drawerClientW}, doc ${layout.docScrollW}`);
    }
  });

  // P10: no-console-errors
  await testScenario('no-console-errors', async () => {
    if (page.__errors && page.__errors.length > 0) {
      throw new Error('Console/page errors detected: ' + page.__errors.join(' | '));
    }
  });

  await browser.close();
  server.close();

  if (hasFailures) {
    console.error('FAILED scenarios:\n - ' + failed.join('\n - '));
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
