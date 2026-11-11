'use strict';
const path = require('path');
const fs = require('fs');
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
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const executablePath = process.env.CHROMIUM_PATH || (fs.existsSync(edgePath) ? edgePath : undefined);
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
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
  await page.waitForFunction(() => window.CuyEdit, { timeout: 2000 }).catch(async () => {
    await page.addStyleTag({ url: 'features/places/edit-panel.css' });
    await page.addScriptTag({ url: 'features/places/edit-panel.js' });
  });

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

  // Set up message interception
  await page.evaluate(() => {
    window.__sentPlaceMessages = [];
    const origSend = window.bridge.send;
    window.bridge.send = function (msg) {
      if (msg && msg.type === 'room_place') {
        window.__sentPlaceMessages.push(msg);
      }
      return origSend.apply(this, arguments);
    };
  });

  // P1: drop-valid-sends (exactly one room_place with right place/itemId/x/y snapped to 4)
  await testScenario('P1 drop-valid-sends', async () => {
    await resetMockSeven('salon');

    await page.evaluate(() => { window.__sentPlaceMessages = []; });

    const card = page.locator('#editDrawer .edit-card:not(.is-dimmed)').first();
    await card.waitFor({ state: 'visible', timeout: 3000 });
    const itemId = await card.getAttribute('data-id');
    const box = await card.boundingBox();
    assert(box, 'Item card must have bounding box');

    const target = await page.evaluate(() => window.CanvasPig.toClient(80, 100));

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(target.clientX, target.clientY, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(100);

    const sent = await page.evaluate(() => window.__sentPlaceMessages);
    assert.strictEqual(sent.length, 1, `Expected exactly 1 room_place message, got ${sent.length}`);
    assert.strictEqual(sent[0].type, 'room_place');
    assert.strictEqual(sent[0].place, 'salon');
    assert.strictEqual(sent[0].itemId, itemId);
    assert.strictEqual(sent[0].x, 80);
    assert.strictEqual(sent[0].y, 100);
    assert.strictEqual(sent[0].x % 4, 0, 'x must be snapped to 4');
    assert.strictEqual(sent[0].y % 4, 0, 'y must be snapped to 4');
  });

  // P2: drop-on-blocker-cancels (garden fountain: nothing sent)
  await testScenario('P2 drop-on-blocker-cancels', async () => {
    await resetMockSeven('garden');

    await page.evaluate(() => { window.__sentPlaceMessages = []; });

    const card = page.locator('#editDrawer .edit-card:not(.is-dimmed)').first();
    await card.waitFor({ state: 'visible', timeout: 3000 });
    const box = await card.boundingBox();
    assert(box, 'Garden item card must have bounding box');

    // Garden fountain blocker is [62, 126, 76, 132]
    const target = await page.evaluate(() => window.CanvasPig.toClient(68, 128));

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(target.clientX, target.clientY, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(100);

    const sent = await page.evaluate(() => window.__sentPlaceMessages);
    assert.strictEqual(sent.length, 0, `Expected 0 messages dropped on garden fountain blocker, got ${sent.length}`);
  });

  // P3: drop-outside-cancels
  await testScenario('P3 drop-outside-cancels', async () => {
    await resetMockSeven('salon');

    await page.evaluate(() => { window.__sentPlaceMessages = []; });

    const card = page.locator('#editDrawer .edit-card:not(.is-dimmed)').first();
    await card.waitFor({ state: 'visible', timeout: 3000 });
    const box = await card.boundingBox();
    assert(box, 'Card must have bounding box');

    // Drag and drop onto upper left screen, outside canvas
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(20, 20, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(100);

    const sent = await page.evaluate(() => window.__sentPlaceMessages);
    assert.strictEqual(sent.length, 0, `Expected 0 messages dropped outside canvas, got ${sent.length}`);
  });

  // P4: ghost-shown-and-cleared (debug().ghost set during drag, null after)
  await testScenario('P4 ghost-shown-and-cleared', async () => {
    await resetMockSeven('salon');

    await page.evaluate(() => { window.__sentPlaceMessages = []; });

    const card = page.locator('#editDrawer .edit-card:not(.is-dimmed)').first();
    await card.waitFor({ state: 'visible', timeout: 3000 });
    const itemId = await card.getAttribute('data-id');
    const box = await card.boundingBox();

    const target = await page.evaluate(() => window.CanvasPig.toClient(80, 100));

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(target.clientX, target.clientY, { steps: 5 });
    await page.waitForTimeout(50);

    const ghostDuring = await page.evaluate(() => window.CanvasPig.debug().ghost);
    assert(ghostDuring !== null, 'CanvasPig.debug().ghost must be set during drag');
    assert.strictEqual(ghostDuring.itemId, itemId);
    assert.strictEqual(ghostDuring.x, 80);
    assert.strictEqual(ghostDuring.y, 100);
    assert.strictEqual(ghostDuring.valid, true);

    await page.mouse.up();
    await page.waitForTimeout(50);

    const ghostAfter = await page.evaluate(() => window.CanvasPig.debug().ghost);
    assert.strictEqual(ghostAfter, null, 'CanvasPig.debug().ghost must be null after drag ends');
  });

  // P5: zero-owned-not-draggable
  await testScenario('P5 zero-owned-not-draggable', async () => {
    await resetMockSeven('salon');

    // Force an item to 0 owned
    await page.evaluate(() => {
      const st = window.bridge.getState();
      const items = window.CuyEdit.itemsFor(st, 'salon');
      if (items.length > 0) {
        const id = items[0].id;
        if (!st.inventory) st.inventory = {};
        st.inventory[id] = 0;
        if (st.rooms && st.rooms.owned) st.rooms.owned[id] = 0;
        if (st.world && st.world.owned) st.world.owned[id] = 0;
        if (st.world && st.world.ownedItems) st.world.ownedItems[id] = 0;
        if (st.rooms && Array.isArray(st.rooms.catalog)) {
          const c = st.rooms.catalog.find(x => x.id === id);
          if (c) c.owned = 0;
        }
      }
      window.bridge.broadcastState();
      window.CuyEdit.render(st);
      window.__sentPlaceMessages = [];
    });
    await page.waitForTimeout(50);

    const dimmedCard = page.locator('#editDrawer .edit-card.is-dimmed').first();
    await dimmedCard.waitFor({ state: 'visible', timeout: 3000 });
    const box = await dimmedCard.boundingBox();
    assert(box, 'Dimmed card must have bounding box');

    const target = await page.evaluate(() => window.CanvasPig.toClient(80, 100));

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(target.clientX, target.clientY, { steps: 5 });
    await page.waitForTimeout(50);

    const ghost = await page.evaluate(() => window.CanvasPig.debug().ghost);
    assert.strictEqual(ghost, null, 'Ghost must not appear when dragging 0-owned item');

    await page.mouse.up();
    await page.waitForTimeout(50);

    const sent = await page.evaluate(() => window.__sentPlaceMessages);
    assert.strictEqual(sent.length, 0, 'No room_place message should be sent for 0-owned item');
  });

  // P6: placed-item-appears-and-blocks-pig
  await testScenario('P6 placed-item-appears-and-blocks-pig', async () => {
    await resetMockSeven('salon');

    // Register mock handler to apply room_place to state
    await page.evaluate(() => {
      const handler = function (st, msg) {
        const action = (msg && msg.type === 'room_place') ? msg : (st && st.type === 'room_place' ? st : (msg || st));
        const state = (st && st.rooms !== undefined) ? st : window.bridge.getState();
        if (!state.rooms) state.rooms = {};
        if (!state.rooms.layouts) state.rooms.layouts = {};
        const sceneId = action.place || 'salon';
        if (!state.rooms.layouts[sceneId]) state.rooms.layouts[sceneId] = { items: [] };
        if (!Array.isArray(state.rooms.layouts[sceneId].items)) state.rooms.layouts[sceneId].items = [];
        state.rooms.layouts[sceneId].items.push({
          id: 'placed_' + Date.now(),
          itemId: action.itemId,
          x: action.x,
          y: action.y,
          isPixel: true
        });
        if (typeof window !== 'undefined' && window.CuyScenes && typeof window.CuyScenes.placedThings === 'function' && window.CanvasPig) {
          window.CanvasPig.setThings(window.CuyScenes.placedThings(state, sceneId), true);
        }
        window.bridge.broadcastState();
      };
      if (window.bridge.mockHandlers) {
        window.bridge.mockHandlers.set('room_place', handler);
      } else {
        window.bridge.registerMockHandler('room_place', handler);
      }
    });

    const initialCount = await page.evaluate(() => {
      return window.CuyScenes.placedThings(window.bridge.getState(), 'salon').length;
    });

    const isFreeBefore = await page.evaluate(() => window.CanvasPig.isFree(80, 100));
    assert.strictEqual(isFreeBefore, true, 'Cell (80, 100) must initially be free');

    const card = page.locator('#editDrawer .edit-card:not(.is-dimmed)').first();
    const box = await card.boundingBox();
    const target = await page.evaluate(() => window.CanvasPig.toClient(80, 100));

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(target.clientX, target.clientY, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(100);

    const newCount = await page.evaluate(() => {
      return window.CuyScenes.placedThings(window.bridge.getState(), 'salon').length;
    });
    assert.strictEqual(newCount, initialCount + 1, 'placedThings count must grow by 1');

    const isFreeAfter = await page.evaluate(() => window.CanvasPig.isFree(80, 100));
    assert.strictEqual(isFreeAfter, false, 'CanvasPig.isFree at placed item footprint must be false');

    // Also verify pickAt returns this item at body center and returns null on empty spot
    const picked = await page.evaluate(() => window.CanvasPig.pickAt(80, 84));
    assert(picked !== null, 'CanvasPig.pickAt must return placed item');
    assert.strictEqual(picked.itemId, 'sofa_cosy');

    const pickedEmpty = await page.evaluate(() => window.CanvasPig.pickAt(20, 20));
    assert.strictEqual(pickedEmpty, null, 'CanvasPig.pickAt on empty cell must return null');
  });

  // P7: scene-kinds (indoor item cannot be dropped in the garden)
  await testScenario('P7 scene-kinds', async () => {
    await resetMockSeven('garden');

    // sofa_cosy is an indoor item
    const indoorValid = await page.evaluate(() => window.CanvasPig.cellValid('sofa_cosy', 120, 100));
    assert.strictEqual(indoorValid, false, 'Indoor item (sofa_cosy) must not be valid in garden');

    // bench_wood is an outdoor item
    const outdoorValid = await page.evaluate(() => window.CanvasPig.cellValid('bench_wood', 120, 100));
    assert.strictEqual(outdoorValid, true, 'Outdoor item (bench_wood) must be valid in garden at free spot');

    // When an invalid item ghost is set, valid is false
    await page.evaluate(() => {
      window.CanvasPig.setGhost({
        itemId: 'sofa_cosy',
        x: 120,
        y: 100,
        valid: window.CanvasPig.cellValid('sofa_cosy', 120, 100)
      });
    });

    const ghost = await page.evaluate(() => window.CanvasPig.debug().ghost);
    assert(ghost, 'Ghost must exist');
    assert.strictEqual(ghost.valid, false, 'Ghost for indoor item in garden must have valid: false');

    await page.evaluate(() => window.CanvasPig.setGhost(null));
  });

  // P8: drop-gramophone-in-pig-room
  await testScenario('P8 drop-gramophone-in-pig-room', async () => {
    await page.evaluate(() => {
      const st = window.bridge.currentState || window.bridge.getState();
      const m = window.CuyScenesMock.state('seven');
      st.places = m.places;
      if (!st.places.order) st.places.order = [];
      const cuyPlace = { id: 'pig:cuy', title: "Gryzli's Room", kind: 'indoor', locked: false };
      const idx = st.places.order.findIndex(p => p.id === 'pig:cuy');
      if (idx >= 0) st.places.order[idx] = cuyPlace;
      else st.places.order.push(cuyPlace);

      if (!st.rooms) st.rooms = {};
      if (!st.rooms.layouts) st.rooms.layouts = {};
      st.rooms.layouts['pig:cuy'] = { cols: 10, rows: 6, wallRows: 2, items: [] };

      if (!st.world) st.world = {};
      st.world.ownedItems = { gramophone: 1 };

      if (!st.rooms.owned) st.rooms.owned = {};
      st.rooms.owned = { gramophone: 1 };

      delete st.emptyEdit;
      delete st.items;

      window.bridge.broadcastState();
      window.CuyPlaces.openPlace('pig:cuy');
      if (window.CuyEdit) {
        if (!window.CuyEdit.isOpen()) window.CuyEdit.toggle();
        window.CuyEdit.render(st);
      }
      window.__sentPlaceMessages = [];
    });
    await page.waitForTimeout(100);

    const card = page.locator('#editDrawer .edit-card[data-id="gramophone"]:not(.is-dimmed)');
    await card.waitFor({ state: 'visible', timeout: 3000 });
    await card.scrollIntoViewIfNeeded();
    const box = await card.boundingBox();
    assert(box, 'Gramophone item card must have bounding box');

    const target = await page.evaluate(() => window.CanvasPig.toClient(80, 64));

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(target.clientX, target.clientY, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(100);

    const sent = await page.evaluate(() => window.__sentPlaceMessages);
    assert.strictEqual(sent.length, 1, `Expected exactly 1 room_place message, got ${sent.length}`);
    assert.strictEqual(sent[0].type, 'room_place');
    assert.strictEqual(sent[0].place, 'pig:cuy');
    assert.strictEqual(sent[0].itemId, 'gramophone');
    assert.strictEqual(sent[0].x, 80);
    assert.strictEqual(sent[0].y, 64);
  });

  await browser.close();
  if (server && typeof server.kill === 'function') {
    server.kill();
  }

  if (hasFailures) {
    process.exit(1);
  } else {
    console.log('ALL UX-P40-EDIT-PLACE TESTS PASSED');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Fatal error in ux-p40-edit-place:', err);
  process.exit(1);
});
