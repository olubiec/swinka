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
      try {
        if (await page.isVisible('#modalBackdrop.active')) {
          await ux.closeModal(page);
        }
      } catch (e) {}
    }
  };

  // Setup helper: unlock salon..market, 1 pig at salon
  async function resetMockState(pigLocs = [{ pigId: 'pig_1', scene: 'salon', pinned: false }]) {
    await page.evaluate((locs) => {
      const st = window.bridge.currentState || window.bridge.getState();
      const m = window.CuyScenesMock.state('all_unlocked');
      st.places = m.places;
      st.places.pigLocations = JSON.parse(JSON.stringify(locs));
      window.bridge.broadcastState();
      window.CuyPlaces.openPlace('salon');
    }, pigLocs);
    await page.waitForTimeout(100);
  }

  // Pr1 chip-elsewhere: go to garden: chip "Cuy is in" + Go there visible, no pig drawn; Go there returns to the pig's scene and the chip is gone.
  await testScenario('Pr1 chip-elsewhere', async () => {
    await resetMockState([{ pigId: 'pig_1', scene: 'salon', pinned: false }]);

    // Go to garden
    await page.evaluate(() => window.CuyPlaces.openPlace('garden'));
    await page.waitForTimeout(100);

    // Chip must be visible
    const chipText = await page.evaluate(() => {
      const el = document.getElementById('placesPresenceChips');
      return el && !el.hidden ? el.textContent.trim() : '';
    });
    assert(chipText.includes('Cuy is in') || chipText.includes('in Salon'), `Expected presence chip text mentioning Cuy is in Salon, got: "${chipText}"`);

    const goBtn = await page.$('.places-presence-chip .chip-go-btn, #placesPresenceChips button');
    assert(goBtn, 'Expected "Go there" button inside presence chip');
    const isGoVisible = await goBtn.isVisible();
    assert(isGoVisible, '"Go there" button should be visible');

    // Pig not drawn in garden
    const dbg = await page.evaluate(() => window.CanvasPig.debug());
    assert.strictEqual(dbg.pigVisible, false, 'Expected pigVisible === false when viewing empty garden');

    // Click Go there
    await goBtn.click();
    await page.waitForTimeout(100);

    // Current scene should now be salon
    const currentPlace = await page.evaluate(() => window.CuyPlaces.getCurrentPlace());
    assert.strictEqual(currentPlace, 'salon', `Expected to return to salon, got: ${currentPlace}`);

    // Chip should be gone (hidden or empty)
    const isChipHidden = await page.evaluate(() => {
      const el = document.getElementById('placesPresenceChips');
      return !el || el.hidden || el.children.length === 0 || el.style.display === 'none';
    });
    assert(isChipHidden, 'Presence chip should be hidden/removed in pig\'s own scene');

    // Pig should be visible in salon
    const dbgSalon = await page.evaluate(() => window.CanvasPig.debug());
    assert.strictEqual(dbgSalon.pigVisible, true, 'Pig should be visible in its own scene (salon)');
  });

  // Pr2 exit-moves-pig: force onPigExit({to:'right'}) at the last room: the mock location becomes garden, the chip in the room scene reads garden, exactly one places.pigMove was sent.
  await testScenario('Pr2 exit-moves-pig', async () => {
    // Rooms: salon, pig:pig_1, pig:pig_2, pig:pig_3, dorm, garden, park, farm, market
    // Let's set pig at the last room before garden: 'dorm' (or let's see which room is right before garden)
    await page.evaluate(() => {
      const st = window.bridge.currentState || window.bridge.getState();
      const m = window.CuyScenesMock.state('all_unlocked');
      st.places = m.places;
      st.places.pigLocations = [{ pigId: 'pig_1', scene: 'dorm', pinned: false }];
      window.__sentMoves = [];
      const origSend = window.bridge.send.bind(window.bridge);
      window.bridge.send = function (action) {
        if (action && (action.type === 'places.pigMove' || action.type === 'places_pig_move')) {
          window.__sentMoves.push(action);
        }
        return origSend(action);
      };
      window.bridge.broadcastState();
      window.CuyPlaces.openPlace('dorm');
    });
    await page.waitForTimeout(100);

    // Force onPigExit({to:'right'})
    await page.evaluate(() => {
      const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;
      if (inst && typeof inst.callPigExit === 'function') {
        inst.callPigExit('right');
      } else if (window.CanvasPig.onPigExit) {
        window.CanvasPig.onPigExit({ to: 'right' });
      }
    });
    await page.waitForTimeout(150);

    // Check sent moves
    const sentMoves = await page.evaluate(() => window.__sentMoves || []);
    assert.strictEqual(sentMoves.length, 1, `Expected exactly 1 pigMove sent, got ${sentMoves.length}`);
    assert.strictEqual(sentMoves[0].to, 'garden', `Expected move to 'garden', got ${sentMoves[0].to}`);

    // Mock state pigLocation should become garden
    const pigLoc = await page.evaluate(() => {
      const st = window.bridge.currentState || window.bridge.getState();
      return st.places.pigLocations.find(p => p.pigId === 'pig_1');
    });
    assert.strictEqual(pigLoc.scene, 'garden', `Expected pig scene to be garden, got ${pigLoc ? pigLoc.scene : null}`);

    // Since we are still viewing 'dorm', chip in dorm should read garden
    const chipText = await page.evaluate(() => {
      const el = document.getElementById('placesPresenceChips');
      return el && !el.hidden ? el.textContent.trim() : '';
    });
    assert(chipText.includes('Garden'), `Expected chip in dorm to mention Garden, got: "${chipText}"`);
  });

  // Pr3 enter-visible: viewing the garden when the pig arrives: the pig appears at the left edge (debug().pig.x within 6 px of it) and walks in.
  await testScenario('Pr3 enter-visible', async () => {
    await resetMockState([{ pigId: 'pig_1', scene: 'dorm', pinned: false }]);

    // User views garden
    await page.evaluate(() => window.CuyPlaces.openPlace('garden'));
    await page.waitForTimeout(100);

    // Now pig arrives at garden (moving from dorm via exit to 'right', entering garden from opposite side = 'left')
    // We send places.pigMove { pigId: 'pig_1', to: 'garden' } through bridge.send
    // And directly check the arrival position before the 60fps raf loop walks further
    const dbg = await page.evaluate(() => {
      window.bridge.send({ type: 'places.pigMove', pigId: 'pig_1', to: 'garden' });
      return window.CanvasPig.debug();
    });

    assert.strictEqual(dbg.pigVisible, true, 'Pig should be visible in garden after entering');

    const sceneDef = await page.evaluate(() => window.CuyScenes.def('garden'));
    const leftEdge = (sceneDef.exits && sceneDef.exits.left && typeof sceneDef.exits.left.x === 'number')
      ? sceneDef.exits.left.x
      : sceneDef.walk[0];

    assert(Math.abs(dbg.pig.x - leftEdge) <= 6,
      `Pig feet X (${dbg.pig.x}) must be within 6 px of left edge (${leftEdge})`);
  });

  // Pr4 locked-blocks-exit: with the garden locked a forced exit at the last room sends no message and the pig stays.
  await testScenario('Pr4 locked-blocks-exit', async () => {
    // Setup state where garden is locked
    await page.evaluate(() => {
      const st = window.bridge.currentState || window.bridge.getState();
      const m = window.CuyScenesMock.state('seven'); // in 'seven', garden is unlocked, but let's explicitly lock garden
      st.places = m.places;
      const g = st.places.order.find(s => s.id === 'garden');
      if (g) g.locked = true;
      st.places.pigLocations = [{ pigId: 'pig_1', scene: 'dorm', pinned: false }];
      window.__sentMoves = [];
      const origSend = window.bridge.send.bind(window.bridge);
      window.bridge.send = function (action) {
        if (action && (action.type === 'places.pigMove' || action.type === 'places_pig_move')) {
          window.__sentMoves.push(action);
        }
        return origSend(action);
      };
      window.bridge.broadcastState();
      window.CuyPlaces.openPlace('dorm');
    });
    await page.waitForTimeout(100);

    // Force exit to right (towards garden)
    await page.evaluate(() => {
      const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;
      if (inst && typeof inst.callPigExit === 'function') {
        inst.callPigExit('right');
      } else if (window.CanvasPig.onPigExit) {
        window.CanvasPig.onPigExit({ to: 'right' });
      }
    });
    await page.waitForTimeout(100);

    // Check no message sent and pig stays in dorm
    const sentMoves = await page.evaluate(() => window.__sentMoves || []);
    assert.strictEqual(sentMoves.length, 0, `Expected 0 pigMove sent when garden locked, got ${sentMoves.length}`);

    const pigLoc = await page.evaluate(() => {
      const st = window.bridge.currentState || window.bridge.getState();
      return st.places.pigLocations.find(p => p.pigId === 'pig_1');
    });
    assert.strictEqual(pigLoc.scene, 'dorm', `Pig should remain in dorm, got: ${pigLoc.scene}`);
  });

  // Pr5 pinned-never-exits: with pinned:true setExitsEnabled is false and 20 s of play gives no exit.
  await testScenario('Pr5 pinned-never-exits', async () => {
    await resetMockState([{ pigId: 'pig_1', scene: 'salon', pinned: true }]);

    // Exits must be disabled
    const exitsEnabled = await page.evaluate(() => {
      const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;
      return inst ? inst.exitsEnabled : null;
    });
    assert.strictEqual(exitsEnabled, false, 'Expected exitsEnabled to be false when pig is pinned');

    // Simulate 20 seconds of play
    await page.evaluate(() => {
      window.__exitEvents = [];
      const inst = window.CuyPig.mainInstance || window.CanvasPig.instance;
      const origExit = inst.onPigExit;
      inst.onPigExit = (ev) => {
        window.__exitEvents.push(ev);
        if (typeof origExit === 'function') origExit(ev);
      };
      // Simulate 20s
      let rem = 20000;
      while (rem > 0) {
        inst.update(100);
        rem -= 100;
      }
    });

    const exitEvents = await page.evaluate(() => window.__exitEvents || []);
    assert.strictEqual(exitEvents.length, 0, `Expected 0 exit events in 20s when pinned, got ${exitEvents.length}`);

    const dbg = await page.evaluate(() => window.CanvasPig.debug());
    assert.strictEqual(dbg.pigVisible, true, 'Pig should remain visible in salon');
  });

  // Pr6 two-pigs: two pigs in two scenes: two chips when elsewhere, one when in either pig's scene.
  await testScenario('Pr6 two-pigs', async () => {
    await resetMockState([
      { pigId: 'pig_1', scene: 'salon', pinned: false },
      { pigId: 'pig_2', scene: 'garden', pinned: false }
    ]);

    // View park (neither pig is here) -> 2 chips
    await page.evaluate(() => window.CuyPlaces.openPlace('park'));
    await page.waitForTimeout(100);

    let chipCount = await page.evaluate(() => {
      const el = document.getElementById('placesPresenceChips');
      if (!el || el.hidden) return 0;
      return el.querySelectorAll('.places-presence-chip').length;
    });
    assert.strictEqual(chipCount, 2, `Expected 2 chips when viewing park, got ${chipCount}`);

    // View salon (pig_1 is here, pig_2 is in garden) -> 1 chip for pig_2
    await page.evaluate(() => window.CuyPlaces.openPlace('salon'));
    await page.waitForTimeout(100);

    chipCount = await page.evaluate(() => {
      const el = document.getElementById('placesPresenceChips');
      if (!el || el.hidden) return 0;
      return el.querySelectorAll('.places-presence-chip').length;
    });
    assert.strictEqual(chipCount, 1, `Expected 1 chip when viewing salon, got ${chipCount}`);

    const chipText = await page.evaluate(() => {
      const el = document.getElementById('placesPresenceChips');
      return el.textContent.trim();
    });
    assert(chipText.includes('Garden'), `Chip in salon should mention Garden (pig_2 location), got "${chipText}"`);

    // View garden (pig_2 is here, pig_1 is in salon) -> 1 chip for pig_1
    await page.evaluate(() => window.CuyPlaces.openPlace('garden'));
    await page.waitForTimeout(100);

    chipCount = await page.evaluate(() => {
      const el = document.getElementById('placesPresenceChips');
      if (!el || el.hidden) return 0;
      return el.querySelectorAll('.places-presence-chip').length;
    });
    assert.strictEqual(chipCount, 1, `Expected 1 chip when viewing garden, got ${chipCount}`);
  });

  // Pr7 no-window: nothing here opens a modal.
  await testScenario('Pr7 no-window', async () => {
    const isModalActive = await page.evaluate(() => {
      const m = document.getElementById('modalBackdrop');
      return m && m.classList.contains('active');
    });
    assert.strictEqual(isModalActive, false, 'No modal should be active');
  });

  await browser.close();
  if (server && typeof server.kill === 'function') {
    server.kill();
  }

  if (hasFailures) {
    process.exit(1);
  } else {
    console.log('ALL UX-P38-PRESENCE TESTS PASSED');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Fatal error in ux-p38-presence:', err);
  process.exit(1);
});
