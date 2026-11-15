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

  // Setup message capturing on bridge
  await page.evaluate(() => {
    window.__sentMessages = [];
    const origSend = window.bridge.send;
    window.bridge.send = (msg) => {
      window.__sentMessages.push(msg);
      if (origSend) origSend.call(window.bridge, msg);
    };
  });

  async function resetTestState(sceneId = 'salon') {
    await page.evaluate((sId) => {
      window.__sentMessages = [];
      window.__edgeHolds = [];
      window.__drops = [];
      if (window.CanvasPig && typeof window.CanvasPig.clearEdgeHold === 'function') {
        window.CanvasPig.clearEdgeHold();
      }
      window.CanvasPig.onEdgeHold = (ev) => {
        window.__edgeHolds.push(ev);
      };
      window.CanvasPig.onDrop = (ev) => {
        window.__drops.push(ev);
      };
      window.CanvasPig.setEdgeNeighbours({ left: true, right: true });
      const def = window.CuyScenes ? window.CuyScenes.def(sId) : null;
      if (def) window.CanvasPig.setScene(def);
      window.CanvasPig.setPigVisible(true);
      window.CanvasPig.setExitsEnabled(false);
      window.CanvasPig.pigX = 120;
      window.CanvasPig.pigY = 110;
    }, sceneId);
    await page.waitForTimeout(100);
  }

  // G1 hold-fires-once (600 ms hold -> one onEdgeHold)
  await testScenario('G1 hold-fires-once', async () => {
    await resetTestState('salon');
    const start = await page.evaluate(() => window.CanvasPig.toClient(120, 100));
    const rect = await page.evaluate(() => {
      const c = document.querySelector('#pigCanvas, canvas');
      const r = c.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    });
    const edgeX = rect.left + 6;
    const edgeY = start.clientY;

    await page.mouse.move(start.clientX, start.clientY);
    await page.mouse.down();
    await page.mouse.move(edgeX, edgeY, { steps: 5 });
    await page.waitForTimeout(700);

    let holds = await page.evaluate(() => window.__edgeHolds);
    assert.strictEqual(holds.length, 1, `Expected 1 onEdgeHold, got ${holds.length}`);
    assert.strictEqual(holds[0].side, 'left');

    // Wait another 700 ms without moving pointer - must NOT fire again
    await page.waitForTimeout(700);
    holds = await page.evaluate(() => window.__edgeHolds);
    assert.strictEqual(holds.length, 1, `Expected still exactly 1 onEdgeHold (fired once), got ${holds.length}`);

    await page.mouse.up();
  });

  // G2 short-pass-no-fire
  await testScenario('G2 short-pass-no-fire', async () => {
    await resetTestState('salon');
    const start = await page.evaluate(() => window.CanvasPig.toClient(120, 100));
    const rect = await page.evaluate(() => {
      const c = document.querySelector('#pigCanvas, canvas');
      const r = c.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    });
    const edgeX = rect.left + 6;
    const edgeY = start.clientY;

    await page.mouse.move(start.clientX, start.clientY);
    await page.mouse.down();
    await page.mouse.move(edgeX, edgeY, { steps: 5 });
    await page.waitForTimeout(50);

    // Move out of edge zone back towards center
    await page.mouse.move(rect.left + 80, edgeY, { steps: 5 });
    await page.waitForTimeout(500);

    const holds = await page.evaluate(() => window.__edgeHolds);
    assert.strictEqual(holds.length, 0, `Expected 0 onEdgeHold for short pass, got ${holds.length}`);

    await page.mouse.up();
  });

  // G3 continue-keeps-drag (after continueDrag further moves still move the pig; release drops it)
  await testScenario('G3 continue-keeps-drag', async () => {
    await resetTestState('salon');
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
    await page.waitForTimeout(700);

    const holds = await page.evaluate(() => window.__edgeHolds);
    assert.strictEqual(holds.length, 1, 'Expected 1 hold on right edge');
    assert.strictEqual(holds[0].side, 'right');

    // Call continueDrag with garden scene
    await page.evaluate(() => {
      const gardenDef = window.CuyScenes ? window.CuyScenes.def('garden') : null;
      window.CanvasPig.continueDrag(gardenDef);
    });

    // Check visually moved inside by 16 px (right edge - 16)
    const { pigXAfter, expectedX } = await page.evaluate(() => {
      const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;
      const expected = (inst && inst.sceneWidth ? inst.sceneWidth : 240) - 16;
      return { pigXAfter: window.CanvasPig.pigX, expectedX: expected };
    });
    assert.strictEqual(pigXAfter, expectedX, `Expected pigX = ${expectedX} after continueDrag on right edge, got ${pigXAfter}`);

    // Drag further without releasing mouse button
    const mid = await page.evaluate(() => window.CanvasPig.toClient(100, 110));
    await page.mouse.move(mid.clientX, mid.clientY, { steps: 5 });
    await page.waitForTimeout(50);

    const pigXMove = await page.evaluate(() => window.CanvasPig.pigX);
    assert.strictEqual(pigXMove, 100, `Expected pigX = 100 after moving, got ${pigXMove}`);

    // Release mouse -> drops it
    await page.mouse.up();
    await page.waitForTimeout(50);

    const drops = await page.evaluate(() => window.__drops);
    assert.strictEqual(drops.length, 1, 'Expected 1 onDrop on release');
    assert.strictEqual(drops[0].x, 100);
  });

  // G4 no-neighbour-take-out (no neighbour: drag beyond sends take_out)
  await testScenario('G4 no-neighbour-take-out', async () => {
    await resetTestState('salon');
    // Disable left and right neighbours
    await page.evaluate(() => {
      window.CanvasPig.setEdgeNeighbours({ left: false, right: false });
    });

    const start = await page.evaluate(() => window.CanvasPig.toClient(120, 100));
    const rect = await page.evaluate(() => {
      const c = document.querySelector('#pigCanvas, canvas');
      const r = c.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    });

    await page.mouse.move(start.clientX, start.clientY);
    await page.mouse.down();
    // Drag beyond edge zone by > 40 px: rect.left - 50
    await page.mouse.move(rect.left - 50, start.clientY, { steps: 5 });
    await page.waitForTimeout(100);

    const takeOutMsgs = await page.evaluate(() => window.__sentMessages.filter(m => m.type === 'take_out'));
    assert(takeOutMsgs.length >= 1, `Expected at least 1 take_out message, got ${takeOutMsgs.length}`);

    await page.mouse.up();
  });

  // G5 indicator-visible-while-holding
  await testScenario('G5 indicator-visible-while-holding', async () => {
    await resetTestState('salon');
    const start = await page.evaluate(() => window.CanvasPig.toClient(120, 100));
    const rect = await page.evaluate(() => {
      const c = document.querySelector('#pigCanvas, canvas');
      const r = c.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    });
    const edgeX = rect.left + 6;
    const edgeY = start.clientY;

    await page.mouse.move(start.clientX, start.clientY);
    await page.mouse.down();
    await page.mouse.move(edgeX, edgeY, { steps: 5 });
    await page.waitForTimeout(100); // 100 ms holding check before 600ms hold completes

    const dbgHolding = await page.evaluate(() => window.CanvasPig.debug());
    assert(dbgHolding.edgeIndicator !== null, 'edgeIndicator should be non-null while holding');
    assert.strictEqual(dbgHolding.edgeIndicator.side, 'left');
    assert.strictEqual(dbgHolding.edgeIndicator.visible, true);
    assert(dbgHolding.edgeIndicator.progress > 0, `Expected progress > 0, got ${dbgHolding.edgeIndicator.progress}`);

    await page.mouse.up();
    await page.waitForTimeout(50);

    const dbgAfter = await page.evaluate(() => window.CanvasPig.debug());
    assert.strictEqual(dbgAfter.edgeIndicator, null, 'edgeIndicator should be null after drag ends');
  });

  // G6 rearm-after-leave
  await testScenario('G6 rearm-after-leave', async () => {
    await resetTestState('salon');
    const start = await page.evaluate(() => window.CanvasPig.toClient(120, 100));
    const rect = await page.evaluate(() => {
      const c = document.querySelector('#pigCanvas, canvas');
      const r = c.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    });
    const edgeX = rect.left + 6;
    const edgeY = start.clientY;

    await page.mouse.move(start.clientX, start.clientY);
    await page.mouse.down();
    await page.mouse.move(edgeX, edgeY, { steps: 5 });
    await page.waitForTimeout(700);

    let holds = await page.evaluate(() => window.__edgeHolds);
    assert.strictEqual(holds.length, 1, 'Expected 1 hold initially');

    // Move out of edge zone (rearm)
    await page.mouse.move(rect.left + 80, edgeY, { steps: 5 });
    await page.waitForTimeout(100);

    // Move back into edge zone
    await page.mouse.move(edgeX, edgeY, { steps: 5 });
    await page.waitForTimeout(700);

    holds = await page.evaluate(() => window.__edgeHolds);
    assert.strictEqual(holds.length, 2, `Expected 2 holds after re-arming and holding again, got ${holds.length}`);

    await page.mouse.up();
    await page.waitForTimeout(50);
  });

  // G7 drop-snaps-free-cell (uses PK-P39c snapping)
  await testScenario('G7 drop-snaps-free-cell', async () => {
    await resetTestState('garden');
    // Fountain blocker is [62, 126, 76, 132]
    // Point (68, 129) is inside the fountain blocker
    const blockerClient = await page.evaluate(() => window.CanvasPig.toClient(68, 129));
    const start = await page.evaluate(() => window.CanvasPig.toClient(window.CanvasPig.pigX, window.CanvasPig.pigY - 10));

    await page.mouse.move(start.clientX, start.clientY);
    await page.mouse.down();
    await page.mouse.move(blockerClient.clientX, blockerClient.clientY, { steps: 5 });
    await page.waitForTimeout(50);

    await page.mouse.up();
    await page.waitForTimeout(50);

    const drops = await page.evaluate(() => window.__drops);
    assert.strictEqual(drops.length, 1, 'Expected 1 drop event');
    const droppedX = drops[0].x;
    const droppedY = drops[0].y;

    const isFree = await page.evaluate(({ x, y }) => window.CanvasPig.isFree(x, y), { x: droppedX, y: droppedY });
    assert.strictEqual(isFree, true, `Dropped point (${droppedX}, ${droppedY}) must be a free cell`);

    const inBlocker = droppedX >= 62 && droppedX <= 76 && droppedY >= 126 && droppedY <= 132;
    assert.strictEqual(inBlocker, false, `Dropped point (${droppedX}, ${droppedY}) must not be inside blocker`);
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
