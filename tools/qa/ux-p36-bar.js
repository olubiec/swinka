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

  // Helper to setup mock state
  async function setAllUnlocked() {
    await page.evaluate(() => {
      const st = window.bridge.currentState || window.bridge.getState();
      const m = window.CuyScenesMock.state('all_unlocked');
      st.places = m.places;
      st.places.pigLocations = [{ pigId: 'pig_1', scene: 'salon' }];
      window.bridge.broadcastState();
      window.CuyPlaces.openPlace('salon');
    });
    await page.waitForTimeout(100);
  }

  // M1: bar-style
  // bar and arrows have a background-image from assets/ui/ (not a flat color),
  // computed font-family contains Pixelify, the bar height equals the header close button height,
  // text has no ‹ › ← → glyphs.
  await testScenario('M1 bar-style', async () => {
    await setAllUnlocked();

    const barBg = await page.evaluate(() => window.getComputedStyle(document.querySelector('.places-bar')).backgroundImage);
    assert(barBg && barBg !== 'none' && (barBg.includes('assets/ui/') || barBg.includes('.png')),
      `Expected .places-bar to have background-image from assets/ui/, got: ${barBg}`);

    const arrowLeftBg = await page.evaluate(() => window.getComputedStyle(document.querySelector('.ui-arrow-left')).backgroundImage);
    assert(arrowLeftBg && arrowLeftBg !== 'none' && (arrowLeftBg.includes('assets/ui/') || arrowLeftBg.includes('.png')),
      `Expected .ui-arrow-left to have background-image from assets/ui/, got: ${arrowLeftBg}`);

    const arrowRightBg = await page.evaluate(() => window.getComputedStyle(document.querySelector('.ui-arrow-right')).backgroundImage);
    assert(arrowRightBg && arrowRightBg !== 'none' && (arrowRightBg.includes('assets/ui/') || arrowRightBg.includes('.png')),
      `Expected .ui-arrow-right to have background-image from assets/ui/, got: ${arrowRightBg}`);

    const barFont = await page.evaluate(() => window.getComputedStyle(document.querySelector('.places-bar')).fontFamily);
    assert(barFont && barFont.includes('Pixelify'),
      `Expected font-family to contain Pixelify, got: ${barFont}`);

    const closeH = await page.evaluate(() => document.querySelector('#btnClose').offsetHeight);
    const barH = await page.evaluate(() => document.querySelector('.places-bar').offsetHeight);
    assert.strictEqual(barH, closeH, `Bar height (${barH}) must equal #btnClose height (${closeH})`);

    const barText = await page.evaluate(() => document.querySelector('.places-bar').textContent);
    assert(!/[‹›←→]/.test(barText), `Bar text must not contain arrow glyphs ‹ › ← →, found in: "${barText}"`);
  });

  // M2: full-cycle
  // clicking right 8 times visits salon, 2 more pig rooms, dorm, garden, park, farm, market in order
  // and returns to the start on the 9th; left reverses; ArrowRight key does the same.
  // M3: scene-changes-no-window
  // every step changes the canvas scene (CanvasPig.debug().sceneId) and no overlay/modal element appears.
  await testScenario('M2 full-cycle & M3 scene-changes-no-window', async () => {
    await setAllUnlocked();

    const expectedOrder = [
      'salon',
      'pig:pig_1',
      'pig:pig_2',
      'pig:pig_3',
      'dorm',
      'garden',
      'park',
      'farm',
      'market'
    ];

    // Verify initial start at salon
    let dbg = await page.evaluate(() => window.CanvasPig.debug());
    assert.strictEqual(dbg.sceneId, 'salon');

    // Clicking right 8 times visits next 8 scenes, 9th returns to start
    for (let i = 1; i < expectedOrder.length; i++) {
      await page.click('.ui-arrow-right');
      await page.waitForTimeout(50);
      dbg = await page.evaluate(() => window.CanvasPig.debug());
      assert.strictEqual(dbg.sceneId, expectedOrder[i], `Step ${i} expected scene ${expectedOrder[i]}, got ${dbg.sceneId}`);

      const modalActive = await page.$('#modalBackdrop.active');
      assert(!modalActive, `Modal backdrop must not appear on step ${i}`);
    }

    // 9th click returns to salon
    await page.click('.ui-arrow-right');
    await page.waitForTimeout(50);
    dbg = await page.evaluate(() => window.CanvasPig.debug());
    assert.strictEqual(dbg.sceneId, 'salon', `9th click expected salon, got ${dbg.sceneId}`);
    assert(!await page.$('#modalBackdrop.active'), 'Modal backdrop must not appear on 9th step');

    // Left reverses
    for (let i = expectedOrder.length - 1; i >= 0; i--) {
      await page.click('.ui-arrow-left');
      await page.waitForTimeout(50);
      dbg = await page.evaluate(() => window.CanvasPig.debug());
      const expected = (i === 0) ? 'salon' : expectedOrder[i];
      assert.strictEqual(dbg.sceneId, expected, `Left step expected ${expected}, got ${dbg.sceneId}`);
      assert(!await page.$('#modalBackdrop.active'), 'Modal backdrop must not appear on reverse step');
    }

    // ArrowRight key does the same
    for (let i = 1; i < expectedOrder.length; i++) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(50);
      dbg = await page.evaluate(() => window.CanvasPig.debug());
      assert.strictEqual(dbg.sceneId, expectedOrder[i], `ArrowRight key step ${i} expected ${expectedOrder[i]}, got ${dbg.sceneId}`);
      assert(!await page.$('#modalBackdrop.active'), 'Modal backdrop must not appear on ArrowRight key step');
    }

    // 9th key press returns to salon
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(50);
    dbg = await page.evaluate(() => window.CanvasPig.debug());
    assert.strictEqual(dbg.sceneId, 'salon', `ArrowRight key 9th step expected salon, got ${dbg.sceneId}`);
  });

  // M4: one-row
  // with 6 rooms the bar stays one row (height unchanged) and the page has no horizontal overflow at 420 px width.
  await testScenario('M4 one-row', async () => {
    await page.evaluate(() => {
      const st = window.bridge.currentState || window.bridge.getState();
      st.places.order = [
        { id: 'salon', title: 'Salon Living Room Long', locked: false, unlockHint: '' },
        { id: 'pig:p1', title: 'Pip Cozy First Bedroom Long Name', locked: false, unlockHint: '' },
        { id: 'pig:p2', title: 'Pop Second Pig Room Long Name', locked: false, unlockHint: '' },
        { id: 'pig:p3', title: 'Pua Third Playroom Long Name', locked: false, unlockHint: '' },
        { id: 'pig:p4', title: 'Pea Fourth Sunroom Long Name', locked: false, unlockHint: '' },
        { id: 'pig:p5', title: 'Poe Fifth Attic Room Long Name', locked: false, unlockHint: '' },
        { id: 'pig:p6', title: 'Pxy Sixth Basement Room Long Name', locked: false, unlockHint: '' },
        { id: 'dorm', title: 'Dormitory Shared Bedroom', locked: false, unlockHint: '' },
        { id: 'garden', title: 'Garden', locked: false, unlockHint: '' },
        { id: 'park', title: 'Park', locked: false, unlockHint: '' },
        { id: 'farm', title: 'Farm', locked: false, unlockHint: '' },
        { id: 'market', title: 'Market', locked: false, unlockHint: '' }
      ];
      window.bridge.broadcastState();
      window.CuyPlaces.openPlace('pig:p1');
    });

    await page.setViewportSize({ width: 420, height: 600 });
    await page.waitForTimeout(100);

    const closeH = await page.evaluate(() => document.querySelector('#btnClose').offsetHeight);
    const barH = await page.evaluate(() => document.querySelector('.places-bar').offsetHeight);
    assert.strictEqual(barH, closeH, `Bar height (${barH}) must remain unchanged and equal close button (${closeH})`);

    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    assert(!hasOverflow, 'Page must have no horizontal overflow at 420px width');
  });

  // M5: locked
  // locked farm shows the hint text and the padlock, pigVisible false, arrows still pass over it.
  await testScenario('M5 locked', async () => {
    await page.evaluate(() => {
      const st = window.bridge.currentState || window.bridge.getState();
      const m = window.CuyScenesMock.state(); // farm and market locked by default
      st.places = m.places;
      window.bridge.broadcastState();
      window.CuyPlaces.openPlace('farm');
    });
    await page.waitForTimeout(100);

    const hintVisible = await page.isVisible('#placesLockedHint:not([hidden])');
    assert(hintVisible, 'Locked hint bar must be visible for locked farm');

    const hintText = await page.evaluate(() => document.getElementById('placesHintText').textContent.trim());
    assert(hintText.length > 0, `Locked hint text must not be empty, got: "${hintText}"`);

    const padlockVisible = await page.isVisible('#placesLockedHint .icon-padlock');
    assert(padlockVisible, 'Padlock icon must be visible in locked hint');

    const dbg = await page.evaluate(() => window.CanvasPig.debug());
    assert.strictEqual(dbg.sceneId, 'farm');
    assert.strictEqual(dbg.pigVisible, false, 'pigVisible must be false in locked farm');

    // Arrows still pass over it: right moves to market
    await page.click('.ui-arrow-right');
    await page.waitForTimeout(50);
    const sceneRight = await page.evaluate(() => window.CanvasPig.debug().sceneId);
    assert.strictEqual(sceneRight, 'market', `Arrow right from locked farm should move to market, got ${sceneRight}`);

    // Left moves back to farm then to park
    await page.click('.ui-arrow-left');
    await page.waitForTimeout(50);
    await page.click('.ui-arrow-left');
    await page.waitForTimeout(50);
    const sceneLeft = await page.evaluate(() => window.CanvasPig.debug().sceneId);
    assert.strictEqual(sceneLeft, 'park', `Arrow left passing over locked farm should reach park, got ${sceneLeft}`);
  });

  // M6: pig-only-in-its-scene
  // the pig is drawn in its scene and not in garden.
  await testScenario('M6 pig-only-in-its-scene', async () => {
    await setAllUnlocked();

    // Pig is located in salon
    let dbg = await page.evaluate(() => window.CanvasPig.debug());
    assert.strictEqual(dbg.sceneId, 'salon');
    assert.strictEqual(dbg.pigVisible, true, 'Pig must be visible in its scene (salon)');

    // Switch to garden
    await page.evaluate(() => window.CuyPlaces.openPlace('garden'));
    await page.waitForTimeout(50);
    dbg = await page.evaluate(() => window.CanvasPig.debug());
    assert.strictEqual(dbg.sceneId, 'garden');
    assert.strictEqual(dbg.pigVisible, false, 'Pig must NOT be visible in garden');

    // Switch back to salon
    await page.evaluate(() => window.CuyPlaces.openPlace('salon'));
    await page.waitForTimeout(50);
    dbg = await page.evaluate(() => window.CanvasPig.debug());
    assert.strictEqual(dbg.sceneId, 'salon');
    assert.strictEqual(dbg.pigVisible, true, 'Pig must be visible when returning to salon');
  });

  // M7: scene-matches-bar
  // the title always equals the scene shown.
  await testScenario('M7 scene-matches-bar', async () => {
    await setAllUnlocked();

    const scenesOrder = await page.evaluate(() => window.CuyScenes.order(window.bridge.getState()));
    for (const s of scenesOrder) {
      await page.evaluate((id) => window.CuyPlaces.openPlace(id), s.id);
      await page.waitForTimeout(50);
      const title = await page.evaluate(() => document.getElementById('placesBarTitle').textContent.trim());
      assert.strictEqual(title, s.title, `Scene ${s.id}: bar title "${title}" did not match scene title "${s.title}"`);
    }
  });

  await browser.close();
  if (server && typeof server.kill === 'function') {
    server.kill();
  }

  if (hasFailures) {
    process.exit(1);
  } else {
    console.log('ALL UX-P36-BAR TESTS PASSED');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Fatal error in ux-p36-bar:', err);
  process.exit(1);
});
