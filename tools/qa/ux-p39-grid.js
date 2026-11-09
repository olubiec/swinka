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
    }
  };

  await page.waitForFunction(() => window.CanvasPig && window.CuyScenes && window.CuyScenesMock, { timeout: 10000 });

  // Setup mock seven with all scenes unlocked
  await page.evaluate(() => {
    const st = window.bridge.currentState || window.bridge.getState();
    const m = window.CuyScenesMock.state('seven');
    st.places = m.places;
    for (const p of st.places.order) {
      p.locked = false;
    }
    st.places.pigLocations = [{ pigId: 'pig_1', scene: 'salon' }];
    window.bridge.broadcastState();
  });
  await page.waitForTimeout(100);

  // W1 never-in-blocker: for each scene fastForward 60 s in 0.5 s steps with random targets:
  // feet never inside a blocker rect or standing-item footprint (assert on every step via debug().pig).
  await testScenario('W1 never-in-blocker', async () => {
    await page.evaluate(() => {
      const sceneIds = ['salon', 'garden', 'park', 'farm', 'market'];
      for (const sceneId of sceneIds) {
        const def = window.CuyScenes.def(sceneId);
        window.CanvasPig.setScene(def);
        window.CanvasPig.setPigVisible(true);
        window.CanvasPig.setExitsEnabled(false);

        // In salon, also test with a placed standing item
        if (sceneId === 'salon') {
          window.CanvasPig.setThings([
            { id: 'standing_box', x: 120, y: 110, width: 24, height: 32, flat: false }
          ]);
        } else {
          window.CanvasPig.setThings([]);
        }

        const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;
        const blockers = inst.blockerRects || [];
        const footprints = inst.standingFootprints || [];

        // 60 s in 0.5 s steps = 120 steps
        for (let step = 0; step < 120; step++) {
          window.CanvasPig.fastForward(500);
          const dbg = window.CanvasPig.debug();
          const { x, y } = dbg.pig;

          // Check feet not inside any blocker
          for (let bi = 0; bi < blockers.length; bi++) {
            const b = blockers[bi];
            if (x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3]) {
              throw new Error(`[${sceneId}] Feet (${x}, ${y}) inside blocker rect [${b}] at step ${step}`);
            }
          }

          // Check feet not inside any standing item footprint
          for (let fi = 0; fi < footprints.length; fi++) {
            const f = footprints[fi];
            if (x >= f[0] && x <= f[2] && y >= f[1] && y <= f[3]) {
              throw new Error(`[${sceneId}] Feet (${x}, ${y}) inside standing footprint [${f}] at step ${step}`);
            }
          }
        }
      }
    });
  });

  // W2 path-around: target directly behind a blocker: reached (distance < 4 px) within 25 s, the path never enters it.
  await testScenario('W2 path-around', async () => {
    await page.evaluate(() => {
      const def = window.CuyScenes.def('garden');
      window.CanvasPig.setScene(def);
      window.CanvasPig.setPigVisible(true);
      window.CanvasPig.setExitsEnabled(false);
      window.CanvasPig.setThings([]);

      const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;
      // Garden fountain blocker: [62, 126, 76, 132]
      const fountain = [62, 126, 76, 132];

      // Place pig to the left of fountain
      inst.pigX = 50;
      inst.pigY = 129;
      if (!window.CanvasPig.isFree(50, 129)) {
        throw new Error('Start position (50, 129) must be free');
      }

      // Target to the right of fountain
      const targetX = 90;
      const targetY = 129;
      if (!window.CanvasPig.isFree(targetX, targetY)) {
        throw new Error('Target position (90, 129) must be free');
      }

      const accepted = window.CanvasPig.setTarget(targetX, targetY);
      if (!accepted) {
        throw new Error('setTarget(90, 129) should be accepted');
      }

      let reached = false;
      const maxSteps = 250; // 250 * 100ms = 25s
      for (let s = 0; s < maxSteps; s++) {
        window.CanvasPig.fastForward(100);
        const { x, y } = window.CanvasPig.debug().pig;

        // Verify feet never entered fountain
        if (x >= fountain[0] && x <= fountain[2] && y >= fountain[1] && y <= fountain[3]) {
          throw new Error(`Pig feet (${x}, ${y}) entered fountain rect [${fountain}] at step ${s}`);
        }

        const dist = Math.hypot(x - targetX, y - targetY);
        if (dist < 4) {
          reached = true;
          break;
        }
      }

      if (!reached) {
        const { x, y } = window.CanvasPig.debug().pig;
        throw new Error(`Target (90, 129) was not reached within 25s, current pig pos: (${x}, ${y})`);
      }
    });
  });

  // W3 unreachable-target-rejected: a target inside a blocker is never chosen.
  await testScenario('W3 unreachable-target-rejected', async () => {
    await page.evaluate(() => {
      const def = window.CuyScenes.def('garden');
      window.CanvasPig.setScene(def);
      window.CanvasPig.setThings([]);

      // Point (68, 129) is inside fountain [62, 126, 76, 132]
      const insideBlocker = window.CanvasPig.setTarget(68, 129);
      if (insideBlocker) {
        throw new Error('Target inside blocker (68, 129) must be rejected by setTarget');
      }

      const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;
      const blockers = inst.blockerRects || [];

      // Test autonomous picker over 100 picks
      for (let i = 0; i < 100; i++) {
        inst.targetX = null;
        inst.targetY = null;
        inst.pickRandomWalkTarget();
        if (inst.targetX !== null && inst.targetY !== null) {
          for (let bi = 0; bi < blockers.length; bi++) {
            const b = blockers[bi];
            if (inst.targetX >= b[0] && inst.targetX <= b[2] && inst.targetY >= b[1] && inst.targetY <= b[3]) {
              throw new Error(`Autonomous target (${inst.targetX}, ${inst.targetY}) chose blocker [${b}]`);
            }
          }
        }
      }
    });
  });

  // W4 drop-snaps: drop on a blocker -> free cell within 12 px.
  await testScenario('W4 drop-snaps', async () => {
    await page.evaluate(() => {
      const def = window.CuyScenes.def('garden');
      window.CanvasPig.setScene(def);
      window.CanvasPig.setThings([]);
      const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;

      // Drop on fountain center: (69, 129)
      inst.pigX = 69;
      inst.pigY = 129;
      inst.drag = { startX: 100, startY: 100, moved: true };

      // Dispatch pointerup to end drag
      inst.canvas.dispatchEvent(new Event('pointerup'));

      const dbg = window.CanvasPig.debug().pig;
      const dist = Math.hypot(dbg.x - 69, dbg.y - 129);

      if (!window.CanvasPig.isFree(dbg.x, dbg.y)) {
        throw new Error(`Dropped pig at (${dbg.x}, ${dbg.y}) is not on a free cell`);
      }
      if (dist > 12) {
        throw new Error(`Dropped pig snapped to (${dbg.x}, ${dbg.y}), distance ${dist} > 12 px`);
      }
      const [x0, y0, x1, y1] = def.walk;
      if (dbg.x < x0 || dbg.x > x1 || dbg.y < y0 || dbg.y > y1) {
        throw new Error(`Dropped pig snapped to (${dbg.x}, ${dbg.y}) outside walk band [${def.walk}]`);
      }
    });
  });

  // W5 placed-item-blocks: after setThings adds a tall standing item the pig avoids its footprint; removing it frees the cells.
  await testScenario('W5 placed-item-blocks', async () => {
    await page.evaluate(() => {
      const def = window.CuyScenes.def('salon');
      window.CanvasPig.setScene(def);
      window.CanvasPig.setThings([]);

      const testX = 100;
      const testY = 108;
      if (!window.CanvasPig.isFree(testX, testY)) {
        throw new Error(`Point (${testX}, ${testY}) should be free initially`);
      }

      // Add a tall standing closet
      window.CanvasPig.setThings([
        { id: 'tall_closet', x: 100, y: 110, width: 32, height: 48, flat: false }
      ]);

      if (window.CanvasPig.isFree(testX, testY)) {
        throw new Error(`Point (${testX}, ${testY}) should be blocked by tall_closet footprint`);
      }

      // Setting target inside the footprint should be rejected
      const rejected = window.CanvasPig.setTarget(testX, testY);
      if (rejected) {
        throw new Error('Target inside placed item footprint must be rejected');
      }

      // Remove the item
      window.CanvasPig.setThings([]);
      if (!window.CanvasPig.isFree(testX, testY)) {
        throw new Error(`Point (${testX}, ${testY}) should be freed after removing item`);
      }
    });
  });

  // W6 perf: the grid build for the 384x192 park plus 30 things takes < 20 ms, a frame with the pig walking < 4 ms (performance.now).
  await testScenario('W6 perf', async () => {
    await page.evaluate(() => {
      const def = window.CuyScenes.def('park');
      window.CanvasPig.setScene(def);
      const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;

      const thirtyThings = [];
      for (let i = 0; i < 30; i++) {
        thirtyThings.push({
          id: 'prop_' + i,
          x: 30 + (i % 10) * 30,
          y: 120 + Math.floor(i / 10) * 15,
          width: 24,
          height: 32,
          flat: false
        });
      }

      const t0 = performance.now();
      window.CanvasPig.setThings(thirtyThings);
      const buildTime = performance.now() - t0;

      if (buildTime >= 20) {
        throw new Error(`Grid build took ${buildTime.toFixed(2)} ms (expected < 20 ms)`);
      }

      // Set pig walking and measure single frame time
      inst.pigX = 20;
      inst.pigY = 130;
      window.CanvasPig.setTarget(350, 160);

      const f0 = performance.now();
      inst.update(16);
      const frameTime = performance.now() - f0;

      if (frameTime >= 4) {
        throw new Error(`Walking frame update took ${frameTime.toFixed(2)} ms (expected < 4 ms)`);
      }
    });
  });

  await browser.close();
  await server.close();

  if (hasFailures) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
