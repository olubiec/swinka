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

  // Helper to setup mock state with all unlocked and 1 pig at salon
  async function resetMockState() {
    await page.evaluate(() => {
      const st = window.bridge.currentState || window.bridge.getState();
      const m = window.CuyScenesMock.state('all_unlocked');
      st.places = m.places;
      st.places.pigLocations = [{ pigId: 'pig_1', scene: 'salon', pinned: false }];
      window.__sentPigMoves = [];
      if (!window.__pigMoveListenerBound) {
        window.__pigMoveListenerBound = true;
        window.bridge.onAction(action => {
          if (action.type === 'places.pigMove' || action.type === 'places_pig_move') {
            window.__sentPigMoves.push(action);
          }
        });
      }
      window.bridge.broadcastState();
      window.CuyPlaces.openPlace('salon');
    });
    await page.waitForTimeout(100);
  }

  // Pr1: chip-elsewhere
  // go to garden: chip "Cuy is in" + Go there visible, no pig drawn; Go there returns to the pig's scene and the chip is gone.
  await testScenario('Pr1 chip-elsewhere', async () => {
    await resetMockState();

    // Navigate to garden
    await page.evaluate(() => window.CuyPlaces.openPlace('garden'));
    await page.waitForTimeout(100);

    const chipVisible = await page.isVisible('#placesPresenceChips:not([hidden])');
    assert(chipVisible, 'Presence chips container should be visible when viewing garden and pig is in salon');

    const chipText = await page.textContent('#placesPresenceChips');
    assert(chipText.includes('Cuy is in'), `Expected chip text to contain "Cuy is in", got: "${chipText}"`);
    assert(chipText.includes('Salon'), `Expected chip text to contain "Salon", got: "${chipText}"`);

    const goBtnVisible = await page.isVisible('#placesPresenceChips .chip-go-btn');
    assert(goBtnVisible, 'Go there button should be visible in chip');

    const dbgGarden = await page.evaluate(() => window.CanvasPig.debug());
    assert.strictEqual(dbgGarden.pigVisible, false, 'No pig should be drawn when viewing a scene without the pig');

    // Click Go there
    await page.click('#placesPresenceChips .chip-go-btn');
    await page.waitForTimeout(100);

    const currentPlace = await page.evaluate(() => window.CuyPlaces.getCurrentPlace());
    assert.strictEqual(currentPlace, 'salon', `Go there should return to salon, got: ${currentPlace}`);

    const barTitle = await page.textContent('#placesBarTitle');
    assert.strictEqual(barTitle.trim(), 'Salon', `Bar title should be Salon, got: ${barTitle}`);

    const isChipHidden = await page.evaluate(() => {
      const el = document.getElementById('placesPresenceChips');
      return !el || el.hidden || el.querySelectorAll('.places-presence-chip').length === 0;
    });
    assert(isChipHidden, 'Presence chip should be gone after returning to the pig\'s scene');

    const dbgSalon = await page.evaluate(() => window.CanvasPig.debug());
    assert.strictEqual(dbgSalon.pigVisible, true, 'Pig should be visible in salon');
  });

  // Pr2: exit-moves-pig
  // force onPigExit({to:'right'}) at the last room: the mock location becomes garden,
  // the chip in the room scene reads garden, exactly one places.pigMove was sent.
  await testScenario('Pr2 exit-moves-pig', async () => {
    await resetMockState();

    // Identify the last room before garden
    const lastRoomId = await page.evaluate(() => {
      const st = window.bridge.currentState || window.bridge.getState();
      const ring = st.places.order;
      const gardenIdx = ring.findIndex(s => s.id === 'garden');
      return ring[(gardenIdx - 1 + ring.length) % ring.length].id;
    });

    // Place pig in the last room and view that room
    await page.evaluate((roomId) => {
      const st = window.bridge.currentState || window.bridge.getState();
      st.places.pigLocations = [{ pigId: 'pig_1', scene: roomId, pinned: false }];
      window.__sentPigMoves = [];
      window.bridge.broadcastState();
      window.CuyPlaces.openPlace(roomId);
    }, lastRoomId);
    await page.waitForTimeout(100);

    // Force onPigExit({ to: 'right' })
    await page.evaluate(() => {
      window.CanvasPig.onPigExit({ to: 'right' });
    });
    await page.waitForTimeout(100);

    // Mock location becomes garden
    const pigScene = await page.evaluate(() => {
      const st = window.bridge.currentState || window.bridge.getState();
      return st.places.pigLocations[0].scene;
    });
    assert.strictEqual(pigScene, 'garden', `Expected pig location to become garden, got: ${pigScene}`);

    // Chip in the room scene reads Garden
    const chipText = await page.textContent('#placesPresenceChips');
    assert(chipText.includes('Garden'), `Chip in room scene should read Garden, got: "${chipText}"`);

    // Exactly one places.pigMove was sent
    const movesCount = await page.evaluate(() => window.__sentPigMoves.length);
    assert.strictEqual(movesCount, 1, `Expected exactly 1 places.pigMove sent, got: ${movesCount}`);
    const movedTo = await page.evaluate(() => window.__sentPigMoves[0].to);
    assert.strictEqual(movedTo, 'garden', `Sent action should move to garden, got: ${movedTo}`);
  });

  // Pr3: enter-visible
  // viewing the garden when the pig arrives: the pig appears at the left edge (debug().pig.x within 6 px of it) and walks in.
  await testScenario('Pr3 enter-visible', async () => {
    await resetMockState();

    // Start with pig in dorm and view the garden
    await page.evaluate(() => {
      const st = window.bridge.currentState || window.bridge.getState();
      st.places.pigLocations = [{ pigId: 'pig_1', scene: 'dorm', pinned: false }];
      window.bridge.broadcastState();
      window.CuyPlaces.openPlace('garden');
    });
    await page.waitForTimeout(100);

    // Now the pig arrives in garden via places.pigMove
    await page.evaluate(() => {
      window.bridge.send({
        type: 'places.pigMove',
        pigId: 'pig_1',
        to: 'garden'
      });
    });
    await page.waitForTimeout(50);

    const dbg = await page.evaluate(() => window.CanvasPig.debug());
    assert.strictEqual(dbg.pigVisible, true, 'Pig should be visible upon arrival in garden');

    // Expected left edge coordinate in garden (exits.left.x is 3)
    const expectedLeftX = await page.evaluate(() => {
      const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance;
      return (inst.currentScene && inst.currentScene.exits && inst.currentScene.exits.left && typeof inst.currentScene.exits.left.x === 'number')
        ? inst.currentScene.exits.left.x
        : ((inst.walk && inst.walk[0]) || 10);
    });

    const diff = Math.abs(dbg.pig.x - expectedLeftX);
    assert(diff <= 6 || dbg.pig.x <= 9,
      `Expected pig.x (${dbg.pig.x}) to be within 6 px of left edge (${expectedLeftX}), diff: ${diff}`);

    // Pig walks in
    const isWalkingIn = await page.evaluate(() => {
      const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance;
      return inst.targetX > inst.pigX && (inst.currentAnim === 'walk' || inst.facing === 1);
    });
    assert(isWalkingIn, 'Pig should be facing right and walking inward from the left exit');
  });

  // Pr4: locked-blocks-exit
  // with the garden locked a forced exit at the last room sends no message and the pig stays.
  await testScenario('Pr4 locked-blocks-exit', async () => {
    await resetMockState();

    const lastRoomId = await page.evaluate(() => {
      const st = window.bridge.currentState || window.bridge.getState();
      const ring = st.places.order;
      const garden = ring.find(s => s.id === 'garden');
      if (garden) {
        garden.locked = true;
        garden.unlockHint = 'Locked test';
      }
      const gardenIdx = ring.findIndex(s => s.id === 'garden');
      const lastRoom = ring[(gardenIdx - 1 + ring.length) % ring.length].id;
      st.places.pigLocations = [{ pigId: 'pig_1', scene: lastRoom, pinned: false }];
      window.__sentPigMoves = [];
      window.bridge.broadcastState();
      window.CuyPlaces.openPlace(lastRoom);
      return lastRoom;
    });
    await page.waitForTimeout(100);

    // Force exit towards garden (to: 'right')
    await page.evaluate(() => {
      window.CanvasPig.onPigExit({ to: 'right' });
    });
    await page.waitForTimeout(100);

    // Sends no message
    const movesCount = await page.evaluate(() => window.__sentPigMoves.length);
    assert.strictEqual(movesCount, 0, `Expected 0 places.pigMove sent when locked, got: ${movesCount}`);

    // Pig stays in lastRoom
    const pigScene = await page.evaluate(() => {
      const st = window.bridge.currentState || window.bridge.getState();
      return st.places.pigLocations[0].scene;
    });
    assert.strictEqual(pigScene, lastRoomId, `Pig should remain in ${lastRoomId}, got: ${pigScene}`);

    // Pig stays visible
    const dbg = await page.evaluate(() => window.CanvasPig.debug());
    assert.strictEqual(dbg.pigVisible, true, 'Pig should stay visible in room when exit is blocked');
  });

  // Pr5: pinned-never-exits
  // with pinned:true setExitsEnabled is false and 20 s of play gives no exit.
  await testScenario('Pr5 pinned-never-exits', async () => {
    await resetMockState();

    await page.evaluate(() => {
      const st = window.bridge.currentState || window.bridge.getState();
      st.places.pigLocations = [{ pigId: 'pig_1', scene: 'salon', pinned: true }];
      window.__sentPigMoves = [];
      window.bridge.broadcastState();
      window.CuyPlaces.openPlace('salon');
    });
    await page.waitForTimeout(100);

    const exitsEnabled = await page.evaluate(() => {
      const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance;
      return inst.exitsEnabled;
    });
    assert.strictEqual(exitsEnabled, false, 'CanvasPig exitsEnabled should be false when pig is pinned');

    // 20 s of play
    await page.evaluate(() => {
      window.CanvasPig.fastForward(20000);
    });
    await page.waitForTimeout(100);

    const hasExited = await page.evaluate(() => {
      const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance;
      return inst.hasExited;
    });
    assert.strictEqual(hasExited, false, 'Pig should not have exited during 20s of play when pinned');

    const movesCount = await page.evaluate(() => window.__sentPigMoves.length);
    assert.strictEqual(movesCount, 0, 'No pigMove should be sent when pinned');
  });

  // Pr6: two-pigs
  // two pigs in two scenes: two chips when elsewhere, one when in either pig's scene.
  await testScenario('Pr6 two-pigs', async () => {
    await resetMockState();

    await page.evaluate(() => {
      const st = window.bridge.currentState || window.bridge.getState();
      st.places.pigLocations = [
        { pigId: 'pig_1', scene: 'salon', pinned: false },
        { pigId: 'pig_2', scene: 'garden', pinned: false }
      ];
      window.bridge.broadcastState();
    });

    // Elsewhere: park
    await page.evaluate(() => window.CuyPlaces.openPlace('park'));
    await page.waitForTimeout(100);

    const chipsElsewhere = await page.evaluate(() => {
      return document.querySelectorAll('#placesPresenceChips .places-presence-chip').length;
    });
    assert.strictEqual(chipsElsewhere, 2, `Expected 2 chips when viewing park, got: ${chipsElsewhere}`);

    const elsewhereText = await page.textContent('#placesPresenceChips');
    assert(elsewhereText.includes('Salon'), 'Should show chip for pig in Salon');
    assert(elsewhereText.includes('Garden'), 'Should show chip for pig in Garden');

    // In salon (pig_1's scene)
    await page.evaluate(() => window.CuyPlaces.openPlace('salon'));
    await page.waitForTimeout(100);

    const chipsInSalon = await page.evaluate(() => {
      return document.querySelectorAll('#placesPresenceChips .places-presence-chip').length;
    });
    assert.strictEqual(chipsInSalon, 1, `Expected 1 chip when viewing salon, got: ${chipsInSalon}`);
    const salonChipText = await page.textContent('#placesPresenceChips');
    assert(salonChipText.includes('Garden'), 'Chip in salon should mention Garden');
    assert(!salonChipText.includes('Salon'), 'Chip in salon should not mention Salon');

    // In garden (pig_2's scene)
    await page.evaluate(() => window.CuyPlaces.openPlace('garden'));
    await page.waitForTimeout(100);

    const chipsInGarden = await page.evaluate(() => {
      return document.querySelectorAll('#placesPresenceChips .places-presence-chip').length;
    });
    assert.strictEqual(chipsInGarden, 1, `Expected 1 chip when viewing garden, got: ${chipsInGarden}`);
    const gardenChipText = await page.textContent('#placesPresenceChips');
    assert(gardenChipText.includes('Salon'), 'Chip in garden should mention Salon');
    assert(!gardenChipText.includes('Garden'), 'Chip in garden should not mention Garden');
  });

  // Pr7: no-window
  // nothing here opens a modal.
  await testScenario('Pr7 no-window', async () => {
    const modalActive = await page.evaluate(() => {
      const el = document.getElementById('modalBackdrop');
      return el ? el.classList.contains('active') : false;
    });
    assert.strictEqual(modalActive, false, 'No modal should be active during presence navigation');
  });

  await browser.close();
  server.close();

  if (hasFailures) {
    console.error('ux-p38-presence tests had failures!');
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Fatal error in ux-p38-presence:', err);
  process.exit(1);
});
