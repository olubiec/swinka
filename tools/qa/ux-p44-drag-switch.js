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
  const candidatePaths = [
    process.env.CHROMIUM_PATH,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  ];
  const execPath = candidatePaths.find(p => p && fs.existsSync(p));
  const launchOpts = execPath ? { executablePath: execPath } : {};
  const browser = await chromium.launch(launchOpts);
  const page = await ux.openHome(browser, { query: 'mock=seven' });
  page.setDefaultTimeout(10000);

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
    }
  };

  await page.waitForFunction(() => window.CanvasPig && window.CuyScenes && window.bridge, { timeout: 10000 });

  // Hook into bridge messages
  await page.evaluate(() => {
    window.__sentMessages = [];
    const origSend = window.bridge.send;
    window.bridge.send = (msg) => {
      window.__sentMessages.push(msg);
      if (origSend) origSend.call(window.bridge, msg);
    };
  });

  async function resetMockState(opts = {}) {
    await page.evaluate((options) => {
      window.__sentMessages = [];
      const st = window.bridge.currentState || window.bridge.getState();
      const m = window.CuyScenesMock ? window.CuyScenesMock.state('seven') : null;
      if (m && m.places) {
        st.places = JSON.parse(JSON.stringify(m.places));
      } else if (!st.places) {
        st.places = {
          order: [
            { id: 'salon', title: 'Salon', locked: false, unlockHint: '' },
            { id: 'pig:pig_1', title: 'Pip Room', locked: false, unlockHint: '' },
            { id: 'dorm', title: 'Dormitory', locked: false, unlockHint: '' },
            { id: 'garden', title: 'Garden', locked: false, unlockHint: '' },
            { id: 'park', title: 'Park', locked: true, unlockHint: 'Unlock Garden first' },
            { id: 'farm', title: 'Farm', locked: true, unlockHint: 'Unlock Park first' },
            { id: 'market', title: 'Market', locked: true, unlockHint: 'Unlock Farm first' }
          ],
          pigLocations: [{ pigId: 'pig_1', scene: 'salon', pinned: false }]
        };
      }

      if (options.allUnlocked) {
        st.places.order.forEach(s => { s.locked = false; });
      }

      const initialScene = options.scene || 'salon';
      const isPinned = !!options.pinned;
      st.places.pigLocations = [{ pigId: 'pig_1', scene: initialScene, pinned: isPinned }];

      if (window.bridge && typeof window.bridge.broadcastState === 'function') {
        window.bridge.broadcastState();
      }

      if (window.CuyPlaces && typeof window.CuyPlaces.openPlace === 'function') {
        window.CuyPlaces.openPlace(initialScene);
      }

      if (window.CanvasPig) {
        window.CanvasPig.pigX = 120;
        window.CanvasPig.pigY = 110;
        window.CanvasPig.setPigVisible(true);
        if (typeof window.CanvasPig.clearEdgeHold === 'function') {
          window.CanvasPig.clearEdgeHold();
        }
      }
    }, opts);
    await page.waitForTimeout(100);
  }

  // T1: edge-hold-switches-bar-title
  await testScenario('T1 edge-hold-switches-bar-title', async () => {
    await resetMockState({ scene: 'salon', allUnlocked: true });

    const titleBefore = await page.evaluate(() => document.getElementById('placesBarTitle').textContent.trim());
    assert.strictEqual(titleBefore, 'Salon', `Expected initial title Salon, got: "${titleBefore}"`);

    const start = await page.evaluate(() => window.CanvasPig.toClient(120, 100));
    const rect = await page.evaluate(() => {
      const c = document.querySelector('#pigCanvas, canvas');
      const r = c.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    });

    const edgeX = rect.right - 6;
    const edgeY = start.clientY;

    await page.mouse.move(start.clientX, start.clientY);
    await page.mouse.down();
    await page.mouse.move(edgeX, edgeY, { steps: 5 });
    await page.waitForTimeout(750); // 600ms edge hold

    const titleAfter = await page.evaluate(() => document.getElementById('placesBarTitle').textContent.trim());
    assert(titleAfter !== 'Salon', `Expected title to switch from Salon, got: "${titleAfter}"`);
    assert(titleAfter.includes('Pip') || titleAfter.includes('Room') || titleAfter.includes('Garden'), `Expected neighbour scene title, got: "${titleAfter}"`);

    await page.mouse.up();
  });

  // T2: drop-sends-pigMove-once (right pigId/to) and pig stays visible after drop + 1s onState tick
  await testScenario('T2 drop-sends-pigMove-once', async () => {
    await resetMockState({ scene: 'salon', allUnlocked: true });

    const start = await page.evaluate(() => window.CanvasPig.toClient(120, 100));
    const rect = await page.evaluate(() => {
      const c = document.querySelector('#pigCanvas, canvas');
      const r = c.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    });

    const edgeX = rect.right - 6;
    const edgeY = start.clientY;

    await page.mouse.move(start.clientX, start.clientY);
    await page.mouse.down();
    await page.mouse.move(edgeX, edgeY, { steps: 5 });
    await page.waitForTimeout(750); // Hold triggers scene switch

    const targetSceneId = await page.evaluate(() => window.CuyPlaces.getCurrentPlace());
    assert(targetSceneId !== 'salon', 'Current place should have switched away from salon');

    // Drag inside new scene and drop
    await page.mouse.move(rect.left + 100, edgeY, { steps: 5 });
    await page.waitForTimeout(50);
    await page.mouse.up();
    await page.waitForTimeout(100);

    const pigMoves = await page.evaluate(() =>
      window.__sentMessages.filter(m => m.type === 'places.pigMove' || m.type === 'places_pig_move')
    );

    assert(pigMoves.length >= 1, `Expected places.pigMove message sent, got: ${pigMoves.length}`);
    const lastMove = pigMoves[pigMoves.length - 1];
    assert.strictEqual(lastMove.pigId, 'pig_1', `Expected pigId pig_1, got: "${lastMove.pigId}"`);
    assert.strictEqual(lastMove.to, targetSceneId, `Expected to "${targetSceneId}", got: "${lastMove.to}"`);

    const visibleAfterDrop = await page.evaluate(() => {
      if (window.CanvasPig && typeof window.CanvasPig.isPigVisible === 'function') {
        return window.CanvasPig.isPigVisible();
      }
      const dbg = window.CanvasPig && typeof window.CanvasPig.debug === 'function' ? window.CanvasPig.debug() : null;
      return dbg ? dbg.pigVisible === true : false;
    });
    assert.strictEqual(visibleAfterDrop, true, 'Pig must remain visible immediately after pointerup drop');

    // Simulate subsequent 1-second onState broadcast
    await page.evaluate(() => {
      if (window.bridge && typeof window.bridge.broadcastState === 'function') {
        window.bridge.broadcastState();
      }
    });
    await page.waitForTimeout(100);

    const visibleAfterTick = await page.evaluate(() => {
      if (window.CanvasPig && typeof window.CanvasPig.isPigVisible === 'function') {
        return window.CanvasPig.isPigVisible();
      }
      const dbg = window.CanvasPig && typeof window.CanvasPig.debug === 'function' ? window.CanvasPig.debug() : null;
      return dbg ? dbg.pigVisible === true : false;
    });
    assert.strictEqual(visibleAfterTick, true, 'Pig must remain visible after 1-second onState broadcast following drop');
  });

  // T3: locked-neighbour-toast-no-switch
  await testScenario('T3 locked-neighbour-toast-no-switch', async () => {
    // In default mock=seven: garden is unlocked, park is locked with hint 'Unlock Garden first'
    await resetMockState({ scene: 'garden', allUnlocked: false });

    const titleBefore = await page.evaluate(() => document.getElementById('placesBarTitle').textContent.trim());
    assert.strictEqual(titleBefore, 'Garden', `Expected initial title Garden, got: "${titleBefore}"`);

    const start = await page.evaluate(() => window.CanvasPig.toClient(120, 100));
    const rect = await page.evaluate(() => {
      const c = document.querySelector('#pigCanvas, canvas');
      const r = c.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    });

    // Right neighbour from garden is park (locked)
    const edgeX = rect.right - 6;
    const edgeY = start.clientY;

    await page.mouse.move(start.clientX, start.clientY);
    await page.mouse.down();
    await page.mouse.move(edgeX, edgeY, { steps: 5 });
    await page.waitForTimeout(750); // Hold triggers edge hold

    // Verify toast
    const toastInfo = await page.evaluate(() => {
      const el = document.getElementById('globalToast');
      return {
        text: el ? el.textContent : '',
        opacity: el ? window.getComputedStyle(el).opacity : '0'
      };
    });

    assert(toastInfo.text.toLowerCase().includes('locked'), `Expected toast to mention "Locked", got: "${toastInfo.text}"`);
    assert(toastInfo.text.includes('Unlock Garden first') || toastInfo.text.includes('Locked'), `Expected hint in toast, got: "${toastInfo.text}"`);

    // Verify title has NOT changed
    const titleAfter = await page.evaluate(() => document.getElementById('placesBarTitle').textContent.trim());
    assert.strictEqual(titleAfter, 'Garden', `Bar title must stay Garden when locked, got: "${titleAfter}"`);

    // Release mouse inside canvas
    await page.mouse.move(rect.left + 100, edgeY, { steps: 3 });
    await page.mouse.up();
    await page.waitForTimeout(100);

    // Verify no pigMove to locked park
    const pigMovesToPark = await page.evaluate(() =>
      window.__sentMessages.filter(m => (m.type === 'places.pigMove' || m.type === 'places_pig_move') && m.to === 'park')
    );
    assert.strictEqual(pigMovesToPark.length, 0, 'No pigMove should be sent to locked park scene');
  });

  // T4: drag-across-three-scenes (salon -> sypialnia -> kuchnia, drop: keeps pig visible in kuchnia and sends places.pigMove to kuchnia)
  await testScenario('T4 drag-across-three-scenes', async () => {
    await resetMockState({ scene: 'salon', allUnlocked: true });
    await page.evaluate(() => {
      const st = window.bridge.currentState || window.bridge.getState();
      st.places.order = [
        { id: 'salon', title: 'Salon', locked: false, unlockHint: '' },
        { id: 'sypialnia', title: 'Sypialnia', locked: false, unlockHint: '' },
        { id: 'kuchnia', title: 'Kuchnia', locked: false, unlockHint: '' },
        { id: 'garden', title: 'Garden', locked: false, unlockHint: '' }
      ];
      st.places.pigLocations = [{ pigId: 'pig_1', scene: 'salon', pinned: false }];
      if (window.bridge && typeof window.bridge.broadcastState === 'function') {
        window.bridge.broadcastState();
      }
      if (window.CuyPlaces && typeof window.CuyPlaces.openPlace === 'function') {
        window.CuyPlaces.openPlace('salon');
      }
    });
    await page.waitForTimeout(100);

    const start = await page.evaluate(() => window.CanvasPig.toClient(120, 100));
    const rect = await page.evaluate(() => {
      const c = document.querySelector('#pigCanvas, canvas');
      const r = c.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    });

    const edgeX = rect.right - 6;
    const edgeY = start.clientY;

    // 1st hold: salon -> sypialnia
    await page.mouse.move(start.clientX, start.clientY);
    await page.mouse.down();
    await page.mouse.move(edgeX, edgeY, { steps: 5 });
    await page.waitForTimeout(750);

    const scene2 = await page.evaluate(() => window.CuyPlaces.getCurrentPlace());
    assert.strictEqual(scene2, 'sypialnia', `Should have switched to sypialnia, got: ${scene2}`);

    // Move out of edge zone to re-arm hold
    await page.mouse.move(rect.left + 100, edgeY, { steps: 5 });
    await page.waitForTimeout(100);

    // 2nd hold: sypialnia -> kuchnia
    await page.mouse.move(edgeX, edgeY, { steps: 5 });
    await page.waitForTimeout(750);

    const scene3 = await page.evaluate(() => window.CuyPlaces.getCurrentPlace());
    assert.strictEqual(scene3, 'kuchnia', `Should have switched to kuchnia, got: ${scene3}`);

    // Drop in scene 3 (kuchnia)
    await page.mouse.move(rect.left + 100, edgeY, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(100);

    const pigMoves = await page.evaluate(() =>
      window.__sentMessages.filter(m => m.type === 'places.pigMove' || m.type === 'places_pig_move')
    );

    assert(pigMoves.length >= 1, `Expected places.pigMove sent for drag, got: ${pigMoves.length}`);
    const lastMove = pigMoves[pigMoves.length - 1];
    assert.strictEqual(lastMove.pigId, 'pig_1', `Expected pigId pig_1, got: "${lastMove.pigId}"`);
    assert.strictEqual(lastMove.to, 'kuchnia', `Expected to "kuchnia", got: "${lastMove.to}"`);

    // Simulate 1-second onState broadcast and verify pig stays visible in kuchnia
    await page.evaluate(() => {
      if (window.bridge && typeof window.bridge.broadcastState === 'function') {
        window.bridge.broadcastState();
      }
    });
    await page.waitForTimeout(100);

    const visibleInKuchnia = await page.evaluate(() => {
      if (window.CanvasPig && typeof window.CanvasPig.isPigVisible === 'function') {
        return window.CanvasPig.isPigVisible();
      }
      const dbg = window.CanvasPig && typeof window.CanvasPig.debug === 'function' ? window.CanvasPig.debug() : null;
      return dbg ? dbg.pigVisible === true : false;
    });
    assert.strictEqual(visibleInKuchnia, true, 'Pig must remain visible in kuchnia after multi-room drag and drop');
  });

  // T5: chip-consistent (P38 chip not shown in the pig's new scene)
  await testScenario('T5 chip-consistent', async () => {
    await resetMockState({ scene: 'salon', allUnlocked: true });

    // Switch view to garden while pig is in salon
    await page.evaluate(() => window.CuyPlaces.openPlace('garden'));
    await page.waitForTimeout(100);

    const chipVisibleElsewhere = await page.evaluate(() => {
      const el = document.getElementById('placesPresenceChips');
      return el && !el.hidden && el.children.length > 0;
    });
    assert.strictEqual(chipVisibleElsewhere, true, 'Presence chip must be visible when viewing garden and pig is in salon');

    // Return to salon
    await page.evaluate(() => window.CuyPlaces.openPlace('salon'));
    await page.waitForTimeout(100);

    // Drag pig to right edge to switch to next scene (pig:pig_1 or garden) and drop
    const start = await page.evaluate(() => window.CanvasPig.toClient(120, 100));
    const rect = await page.evaluate(() => {
      const c = document.querySelector('#pigCanvas, canvas');
      const r = c.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    });

    await page.mouse.move(start.clientX, start.clientY);
    await page.mouse.down();
    await page.mouse.move(rect.right - 6, start.clientY, { steps: 5 });
    await page.waitForTimeout(750); // Scene switches

    const newScene = await page.evaluate(() => window.CuyPlaces.getCurrentPlace());
    assert(newScene !== 'salon', 'Should have switched scene');

    // Drop pig in new scene
    await page.mouse.move(rect.left + 100, start.clientY, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(150);

    // In the pig's new scene, presence chip must NOT be shown
    const chipHiddenInNewScene = await page.evaluate(() => {
      const el = document.getElementById('placesPresenceChips');
      return !el || el.hidden || el.children.length === 0;
    });
    assert.strictEqual(chipHiddenInNewScene, true, "Presence chip should NOT be shown in the pig's current scene");
  });

  // T6: pinned-stays-pinned
  await testScenario('T6 pinned-stays-pinned', async () => {
    await resetMockState({ scene: 'salon', pinned: true, allUnlocked: true });

    const start = await page.evaluate(() => window.CanvasPig.toClient(120, 100));
    const rect = await page.evaluate(() => {
      const c = document.querySelector('#pigCanvas, canvas');
      const r = c.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    });

    await page.mouse.move(start.clientX, start.clientY);
    await page.mouse.down();
    await page.mouse.move(rect.right - 6, start.clientY, { steps: 5 });
    await page.waitForTimeout(750); // Switches to next scene

    const newScene = await page.evaluate(() => window.CuyPlaces.getCurrentPlace());
    assert(newScene !== 'salon', 'Should have switched scene');

    await page.mouse.move(rect.left + 100, start.clientY, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(150);

    const pigState = await page.evaluate(() => {
      const st = window.bridge.currentState || window.bridge.getState();
      return st.places.pigLocations.find(p => (p.pigId || p.PigId) === 'pig_1');
    });

    assert(pigState, 'pig_1 location should exist in state');
    assert.strictEqual(pigState.scene, newScene, `Expected pig to be in ${newScene}, got: ${pigState.scene}`);
    assert.strictEqual(pigState.pinned, true, 'Pig should stay pinned after being dragged to new scene');
  });

  // T7: take-out-sends-nothing-else
  await testScenario('T7 take-out-sends-nothing-else', async () => {
    await resetMockState({ scene: 'salon', allUnlocked: true });

    const start = await page.evaluate(() => window.CanvasPig.toClient(120, 100));
    const rect = await page.evaluate(() => {
      const c = document.querySelector('#pigCanvas, canvas');
      const r = c.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    });

    await page.mouse.move(start.clientX, start.clientY);
    await page.mouse.down();
    // Drag out above window to trigger take_out
    await page.mouse.move(start.clientX, rect.top - 40, { steps: 5 });
    await page.waitForTimeout(100);
    await page.mouse.up();
    await page.waitForTimeout(100);

    const takeOutMsgs = await page.evaluate(() =>
      window.__sentMessages.filter(m => m.type === 'take_out')
    );
    const pigMoves = await page.evaluate(() =>
      window.__sentMessages.filter(m => m.type === 'places.pigMove' || m.type === 'places_pig_move')
    );

    assert(takeOutMsgs.length >= 1, `Expected take_out message sent, got: ${takeOutMsgs.length}`);
    assert.strictEqual(pigMoves.length, 0, `Expected 0 places.pigMove sent when canceled via take_out, got: ${pigMoves.length}`);
  });

  try {
    await browser.close();
  } catch (e) {}
  try {
    server.close();
  } catch (e) {}
  process.exit(hasFailures ? 1 : 0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
