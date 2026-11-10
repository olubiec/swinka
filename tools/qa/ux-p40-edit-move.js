'use strict';
const path = require('path');
const assert = require('assert');

// Ensure module resolution finds node_modules under tools/qa
if (!process.env.NODE_PATH) {
  process.env.NODE_PATH = path.join(__dirname, 'node_modules');
  require('module').Module._initPaths();
}

const { chromium } = require('playwright');
const ux = require('./lib/ux.js');

async function run() {
  const server = await ux.startServer();
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await ux.openHome(browser);
  page.setDefaultTimeout(5000);

  let hasFailures = false;

  const testScenario = async (name, fn) => {
    try {
      await fn();
      if (page.__errors && page.__errors.length > 0) {
        throw new Error('page errors: ' + page.__errors.join('; '));
      }
      console.log('PASS ' + name);
    } catch (err) {
      hasFailures = true;
      console.log('FAIL ' + name + ': ' + err.message);
    } finally {
      try { await page.mouse.up(); } catch (e) {}
      try {
        if (await page.isVisible('#modalBackdrop.active')) {
          await ux.closeModal(page);
        }
      } catch (e) {}
    }
  };

  // Ensure edit-panel script and styles are loaded
  const hasEdit = await page.evaluate(() => !!window.CuyEdit);
  if (!hasEdit) {
    await page.addStyleTag({ url: 'features/places/edit-panel.css' });
    await page.addScriptTag({ url: 'features/places/edit-panel.js' });
    await page.waitForFunction(() => !!window.CuyEdit, { timeout: 3000 });
  }

  async function resetMockSeven(initialPlace = 'salon') {
    await page.evaluate((place) => {
      const st = window.bridge.currentState || window.bridge.getState();
      const m = window.CuyScenesMock.state('seven');
      st.places = m.places;
      if (!st.rooms) st.rooms = {};
      if (!st.rooms.owned) st.rooms.owned = {};
      st.rooms.layouts = { salon: { items: [] }, garden: { items: [] } };
      st.rooms.owned.sofa_cosy = 2;
      st.rooms.owned.armchair = 1;
      st.rooms.owned.bench_wood = 2;
      delete st.emptyEdit;
      delete st.items;
      window.bridge.broadcastState();
      window.CuyPlaces.openPlace(place);
      if (window.CuyEdit) {
        if (!window.CuyEdit.isOpen()) window.CuyEdit.toggle();
        window.CuyEdit.render(st);
      }
    }, initialPlace);
    await page.waitForTimeout(100);
  }

  async function placeItemOnScene(place, { uid, itemId, x, y, flip }) {
    await page.evaluate(({ place, uid, itemId, x, y, flip }) => {
      const st = window.bridge.currentState || window.bridge.getState();
      if (!st.rooms) st.rooms = {};
      if (!st.rooms.layouts) st.rooms.layouts = {};
      if (!st.rooms.layouts[place]) st.rooms.layouts[place] = { items: [] };
      st.rooms.layouts[place].items = [{
        uid: uid,
        itemId: itemId,
        x: x,
        y: y,
        isPixel: true,
        flip: !!flip
      }];
      if (window.CuyScenes && typeof window.CuyScenes.placedThings === 'function' && window.CanvasPig) {
        window.CanvasPig.setThings(window.CuyScenes.placedThings(st, place), true);
      }
      window.bridge.broadcastState();
    }, { place, uid, itemId, x, y, flip });
    await page.waitForTimeout(50);
  }

  // Intercept bridge messages
  await page.evaluate(() => {
    window.__sentMessages = [];
    const origSend = window.bridge.send;
    window.bridge.send = function (msg) {
      if (msg) {
        window.__sentMessages.push(msg);
      }
      return origSend.apply(this, arguments);
    };
  });

  // M1: select-shows-toolbar
  await testScenario('M1 select-shows-toolbar', async () => {
    await resetMockSeven('salon');
    await placeItemOnScene('salon', { uid: 'u1', itemId: 'sofa_cosy', x: 80, y: 100 });
    await page.evaluate(() => { window.__sentMessages = []; });

    const target = await page.evaluate(() => window.CanvasPig.toClient(80, 84));
    await page.mouse.click(target.clientX, target.clientY);
    await page.waitForTimeout(100);

    const sel = await page.evaluate(() => {
      return (window.CuyEdit && typeof window.CuyEdit.getSelectedUid === 'function' ? window.CuyEdit.getSelectedUid() : null)
        || (window.CanvasPig && window.CanvasPig.debug && window.CanvasPig.debug() ? (window.CanvasPig.debug().selected || window.CanvasPig.debug().selectedUid) : null);
    });
    assert.strictEqual(sel, 'u1', 'Selected item uid should be u1');

    const toolbarVisible = await page.isVisible('#editItemToolbar');
    assert.strictEqual(toolbarVisible, true, 'Floating toolbar #editItemToolbar should be visible');

    const flipBtn = page.locator('#editItemToolbar button[data-action="flip"], #editItemFlipBtn').first();
    assert.strictEqual(await flipBtn.isVisible(), true, 'Flip button should be visible');

    const removeBtn = page.locator('#editItemToolbar button[data-action="remove"], #editItemRemoveBtn').first();
    assert.strictEqual(await removeBtn.isVisible(), true, 'Remove button should be visible');
  });

  // M2: move-valid-sends-move
  await testScenario('M2 move-valid-sends-move', async () => {
    await resetMockSeven('salon');
    await placeItemOnScene('salon', { uid: 'u1', itemId: 'sofa_cosy', x: 80, y: 100 });
    await page.evaluate(() => { window.__sentMessages = []; });

    const start = await page.evaluate(() => window.CanvasPig.toClient(80, 84));
    const dest = await page.evaluate(() => window.CanvasPig.toClient(120, 108));

    await page.mouse.move(start.clientX, start.clientY);
    await page.mouse.down();
    await page.mouse.move(dest.clientX, dest.clientY, { steps: 5 });
    await page.waitForTimeout(50);

    const ghost = await page.evaluate(() => window.CanvasPig.debug().ghost);
    assert(ghost !== null, 'CanvasPig.debug().ghost should be active during drag');
    assert.strictEqual(ghost.itemId, 'sofa_cosy');
    assert.strictEqual(ghost.x, 120);
    assert.strictEqual(ghost.y, 108);
    assert.strictEqual(ghost.valid, true);

    await page.mouse.up();
    await page.waitForTimeout(100);

    const moves = await page.evaluate(() => window.__sentMessages.filter(m => m.type === 'room_move'));
    assert.strictEqual(moves.length, 1, `Expected 1 room_move message, got ${moves.length}`);
    assert.strictEqual(moves[0].place, 'salon');
    assert.strictEqual(moves[0].uid, 'u1');
    assert.strictEqual(moves[0].x, 120);
    assert.strictEqual(moves[0].y, 108);
    assert.strictEqual(moves[0].x % 4, 0, 'x must be snapped to 4');
    assert.strictEqual(moves[0].y % 4, 0, 'y must be snapped to 4');

    const ghostAfter = await page.evaluate(() => window.CanvasPig.debug().ghost);
    assert.strictEqual(ghostAfter, null, 'Ghost should be null after drop');
  });

  // M3: move-invalid-returns (no message, position unchanged)
  await testScenario('M3 move-invalid-returns', async () => {
    await resetMockSeven('garden');
    await placeItemOnScene('garden', { uid: 'u1', itemId: 'bench_wood', x: 120, y: 100 });
    await page.evaluate(() => { window.__sentMessages = []; });

    const start = await page.evaluate(() => window.CanvasPig.toClient(120, 92));
    // Garden fountain blocker is [62, 126, 76, 132]
    const dest = await page.evaluate(() => window.CanvasPig.toClient(68, 128));

    await page.mouse.move(start.clientX, start.clientY);
    await page.mouse.down();
    await page.mouse.move(dest.clientX, dest.clientY, { steps: 5 });
    await page.waitForTimeout(50);

    const ghost = await page.evaluate(() => window.CanvasPig.debug().ghost);
    assert(ghost !== null, 'Ghost should be shown during drag');
    assert.strictEqual(ghost.valid, false, 'Ghost should be invalid when dragged onto blocker');

    await page.mouse.up();
    await page.waitForTimeout(100);

    const moves = await page.evaluate(() => window.__sentMessages.filter(m => m.type === 'room_move'));
    assert.strictEqual(moves.length, 0, 'No room_move message should be sent on invalid placement');

    const pos = await page.evaluate(() => {
      const inst = window.CanvasPig && window.CanvasPig.instance;
      const t = inst && inst.things && inst.things.find(x => x.id === 'u1' || x.uid === 'u1');
      return t ? { x: t.x, y: t.y } : null;
    });
    assert(pos !== null, 'Item should still exist on scene');
    assert.strictEqual(pos.x, 120, 'Item x should return to original position');
    assert.strictEqual(pos.y, 100, 'Item y should return to original position');

    const ghostAfter = await page.evaluate(() => window.CanvasPig.debug().ghost);
    assert.strictEqual(ghostAfter, null, 'Ghost should be null after release');
  });

  // M4: drag-to-drawer-removes
  await testScenario('M4 drag-to-drawer-removes', async () => {
    await resetMockSeven('salon');
    await placeItemOnScene('salon', { uid: 'u1', itemId: 'sofa_cosy', x: 80, y: 100 });
    await page.evaluate(() => { window.__sentMessages = []; });

    const start = await page.evaluate(() => window.CanvasPig.toClient(80, 84));
    const drawer = page.locator('#editDrawer');
    const drawerBox = await drawer.boundingBox();
    assert(drawerBox, 'Drawer must have bounding box');

    await page.mouse.move(start.clientX, start.clientY);
    await page.mouse.down();
    await page.mouse.move(drawerBox.x + drawerBox.width / 2, drawerBox.y + drawerBox.height / 2, { steps: 5 });
    await page.waitForTimeout(50);
    await page.mouse.up();
    await page.waitForTimeout(100);

    const removes = await page.evaluate(() => window.__sentMessages.filter(m => m.type === 'room_remove'));
    assert.strictEqual(removes.length, 1, `Expected 1 room_remove message, got ${removes.length}`);
    assert.strictEqual(removes[0].place, 'salon');
    assert.strictEqual(removes[0].uid, 'u1');

    const toolbarVisible = await page.isVisible('#editItemToolbar');
    assert.strictEqual(toolbarVisible, false, 'Toolbar should be hidden after removal');

    const ghostAfter = await page.evaluate(() => window.CanvasPig.debug().ghost);
    assert.strictEqual(ghostAfter, null, 'Ghost should be null after removal');
  });

  // M5: flip-sends
  await testScenario('M5 flip-sends', async () => {
    await resetMockSeven('salon');
    await placeItemOnScene('salon', { uid: 'u1', itemId: 'sofa_cosy', x: 80, y: 100 });
    await page.evaluate(() => { window.__sentMessages = []; });

    const target = await page.evaluate(() => window.CanvasPig.toClient(80, 84));
    await page.mouse.click(target.clientX, target.clientY);
    await page.waitForTimeout(100);

    const flipBtn = page.locator('#editItemToolbar button[data-action="flip"], #editItemFlipBtn').first();
    await flipBtn.click();
    await page.waitForTimeout(100);

    const flips = await page.evaluate(() => window.__sentMessages.filter(m => m.type === 'room_flip'));
    assert.strictEqual(flips.length, 1, `Expected 1 room_flip message, got ${flips.length}`);
    assert.strictEqual(flips[0].place, 'salon');
    assert.strictEqual(flips[0].uid, 'u1');
  });

  // M6: delete-key-removes
  await testScenario('M6 delete-key-removes', async () => {
    await resetMockSeven('salon');
    await placeItemOnScene('salon', { uid: 'u1', itemId: 'sofa_cosy', x: 80, y: 100 });
    await page.evaluate(() => { window.__sentMessages = []; });

    const target = await page.evaluate(() => window.CanvasPig.toClient(80, 84));
    await page.mouse.click(target.clientX, target.clientY);
    await page.waitForTimeout(100);

    await page.keyboard.press('Delete');
    await page.waitForTimeout(100);

    const removes = await page.evaluate(() => window.__sentMessages.filter(m => m.type === 'room_remove'));
    assert.strictEqual(removes.length, 1, `Expected 1 room_remove message, got ${removes.length}`);
    assert.strictEqual(removes[0].place, 'salon');
    assert.strictEqual(removes[0].uid, 'u1');

    const toolbarVisible = await page.isVisible('#editItemToolbar');
    assert.strictEqual(toolbarVisible, false, 'Toolbar should be hidden after delete key');
  });

  // M7: esc-deselects
  await testScenario('M7 esc-deselects', async () => {
    await resetMockSeven('salon');
    await placeItemOnScene('salon', { uid: 'u1', itemId: 'sofa_cosy', x: 80, y: 100 });
    await page.evaluate(() => { window.__sentMessages = []; });

    const target = await page.evaluate(() => window.CanvasPig.toClient(80, 84));
    await page.mouse.click(target.clientX, target.clientY);
    await page.waitForTimeout(100);

    assert.strictEqual(await page.isVisible('#editItemToolbar'), true, 'Toolbar should be visible before Esc');

    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);

    const sel = await page.evaluate(() => {
      return window.CuyEdit && typeof window.CuyEdit.getSelectedUid === 'function' ? window.CuyEdit.getSelectedUid() : null;
    });
    assert.strictEqual(sel, null, 'Selected uid should be null after Esc');
    assert.strictEqual(await page.isVisible('#editItemToolbar'), false, 'Toolbar should be hidden after Esc');

    // Drawer should still remain open
    const isOpen = await page.evaluate(() => window.CuyEdit.isOpen());
    assert.strictEqual(isOpen, true, 'Edit mode drawer should remain open after deselecting via Esc');
  });

  // M8: only-in-edit-mode (outside edit mode clicking an item does not select it)
  await testScenario('M8 only-in-edit-mode', async () => {
    await resetMockSeven('salon');
    await placeItemOnScene('salon', { uid: 'u1', itemId: 'sofa_cosy', x: 80, y: 100 });

    // Close edit mode
    await page.evaluate(() => {
      if (window.CuyEdit && window.CuyEdit.isOpen()) {
        window.CuyEdit.toggle();
      }
    });
    await page.waitForTimeout(100);

    const isOpen = await page.evaluate(() => window.CuyEdit.isOpen());
    assert.strictEqual(isOpen, false, 'Edit mode should be closed');

    const target = await page.evaluate(() => window.CanvasPig.toClient(80, 84));
    await page.mouse.click(target.clientX, target.clientY);
    await page.waitForTimeout(100);

    assert.strictEqual(await page.isVisible('#editItemToolbar'), false, 'Toolbar should not appear outside edit mode');

    const sel = await page.evaluate(() => {
      return (window.CuyEdit && typeof window.CuyEdit.getSelectedUid === 'function' ? window.CuyEdit.getSelectedUid() : null)
        || (window.CanvasPig && window.CanvasPig.debug && window.CanvasPig.debug() ? (window.CanvasPig.debug().selected || null) : null);
    });
    assert.strictEqual(sel, null, 'No item should be selected outside edit mode');
  });

  await browser.close();
  if (server && typeof server.kill === 'function') {
    server.kill();
  }

  if (hasFailures) {
    process.exit(1);
  } else {
    console.log('ALL UX-P40-EDIT-MOVE TESTS PASSED');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Fatal error in ux-p40-edit-move:', err);
  process.exit(1);
});
