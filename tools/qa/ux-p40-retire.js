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

  // Set up mock seven
  await page.evaluate(() => {
    if (window.CuyScenesMock && typeof window.CuyScenesMock.state === 'function') {
      const st = (window.bridge && (window.bridge.currentState || window.bridge.getState())) || {};
      const m = window.CuyScenesMock.state('seven');
      st.places = m.places;
      if (window.bridge && typeof window.bridge.broadcastState === 'function') {
        window.bridge.broadcastState();
      }
    }
  });
  await page.waitForTimeout(200);

  // R1: no-more-tile-for-rooms-garden
  await testScenario('R1 no-more-tile-for-rooms-garden', async () => {
    await ux.openMore(page);
    await page.waitForSelector('#modalBody button[data-open-feature]', { timeout: 3000 });

    const tiles = await page.$$eval('#modalBody button[data-open-feature]', btns =>
      btns.map(b => ({
        id: b.dataset.openFeature,
        text: (b.textContent || '').trim().toLowerCase()
      }))
    );

    const roomsTile = tiles.find(t => t.id === 'rooms' || t.text.includes('rooms') || t.text.includes('pokoje'));
    const gardenTile = tiles.find(t => t.id === 'garden' || t.text.includes('garden') || t.text.includes('ogród') || t.text.includes('ogrod'));

    assert(!roomsTile, 'More menu should not have a Rooms tile');
    assert(!gardenTile, 'More menu should not have a Garden tile');

    await ux.closeModal(page);
  });

  // R2: openPlace-switches-scene (no modal)
  await testScenario('R2 openPlace-switches-scene', async () => {
    // Open a modal first (More modal) to verify openPlace closes any open window
    await ux.openMore(page);
    assert(await page.isVisible('#modalBackdrop.active'), 'Modal should be active before openPlace');

    await page.evaluate(() => {
      window.CuyPlaces.openPlace('garden');
    });
    await page.waitForTimeout(300);

    const currentPlace = await page.evaluate(() => {
      return (window.CuyPlaces && typeof window.CuyPlaces.getCurrentPlace === 'function')
        ? window.CuyPlaces.getCurrentPlace()
        : null;
    });
    assert.strictEqual(currentPlace, 'garden', 'Scene should have switched to garden');

    const modalActive = await page.evaluate(() => {
      const mb = document.getElementById('modalBackdrop');
      return mb ? mb.classList.contains('active') : false;
    });
    assert.strictEqual(modalActive, false, 'No modal should be active after openPlace');

    // Switch back to salon
    await page.evaluate(() => {
      window.CuyPlaces.openPlace('salon');
    });
    await page.waitForTimeout(300);

    const placeAfterSalon = await page.evaluate(() => {
      return (window.CuyPlaces && typeof window.CuyPlaces.getCurrentPlace === 'function')
        ? window.CuyPlaces.getCurrentPlace()
        : null;
    });
    assert.strictEqual(placeAfterSalon, 'salon', 'Scene should have switched to salon');

    const modalActiveSalon = await page.evaluate(() => {
      const mb = document.getElementById('modalBackdrop');
      return mb ? mb.classList.contains('active') : false;
    });
    assert.strictEqual(modalActiveSalon, false, 'No modal should be active after switching back to salon');
  });

  // R3: no-feature-rooms-or-garden-modal anywhere (walk all More tiles)
  await testScenario('R3 no-feature-rooms-or-garden-modal', async () => {
    await ux.openMore(page);
    await page.waitForSelector('#modalBody button[data-open-feature]', { timeout: 3000 });

    const featureIds = await page.$$eval('#modalBody button[data-open-feature]', btns =>
      btns.map(b => b.dataset.openFeature)
    );

    await ux.closeModal(page);

    for (const featId of featureIds) {
      await ux.openMore(page);
      await page.waitForSelector('#modalBody button[data-open-feature]', { timeout: 3000 });
      const tile = page.locator(`#modalBody button[data-open-feature="${featId}"]`);
      await tile.click();
      await page.waitForTimeout(150);

      const modalInfo = await page.evaluate(() => {
        const titleEl = document.getElementById('modalTitle');
        const bodyEl = document.getElementById('modalBody');
        const backdropEl = document.getElementById('modalBackdrop');
        return {
          title: titleEl ? (titleEl.textContent || '').trim().toLowerCase() : '',
          bodyClasses: bodyEl ? bodyEl.className : '',
          active: backdropEl ? backdropEl.classList.contains('active') : false
        };
      });

      if (modalInfo.active) {
        assert.notStrictEqual(modalInfo.title, 'rooms', `Feature ${featId} opened Rooms modal`);
        assert.notStrictEqual(modalInfo.title, 'garden', `Feature ${featId} opened Garden modal`);
        assert(!modalInfo.bodyClasses.includes('feature-rooms'), `Modal has feature-rooms class for ${featId}`);
        assert(!modalInfo.bodyClasses.includes('feature-garden'), `Modal has feature-garden class for ${featId}`);
        await ux.closeModal(page);
      }
    }

    // Direct openFeature calls must also not open a modal
    await page.evaluate(() => {
      if (window.CuyHome && typeof window.CuyHome.openFeature === 'function') {
        window.CuyHome.openFeature('rooms');
      }
    });
    await page.waitForTimeout(150);
    let active = await page.evaluate(() => document.getElementById('modalBackdrop')?.classList.contains('active'));
    assert.strictEqual(active, false, 'openFeature("rooms") should not open a modal');

    await page.evaluate(() => {
      if (window.CuyHome && typeof window.CuyHome.openFeature === 'function') {
        window.CuyHome.openFeature('garden');
      }
    });
    await page.waitForTimeout(150);
    active = await page.evaluate(() => document.getElementById('modalBackdrop')?.classList.contains('active'));
    assert.strictEqual(active, false, 'openFeature("garden") should not open a modal');
  });

  // R4: upgrade-unlock-api
  await testScenario('R4 upgrade-unlock-api', async () => {
    const result = await page.evaluate(() => {
      const sent = [];
      const origSend = window.bridge.send;
      window.bridge.send = function (msg) {
        sent.push(msg);
        return origSend.apply(this, arguments);
      };

      if (!window.CuyPlaces || typeof window.CuyPlaces.upgrade !== 'function') {
        throw new Error('window.CuyPlaces.upgrade is not a function');
      }
      if (!window.CuyPlaces || typeof window.CuyPlaces.unlock !== 'function') {
        throw new Error('window.CuyPlaces.unlock is not a function');
      }

      window.CuyPlaces.upgrade('garden');
      window.CuyPlaces.unlock('park');

      window.bridge.send = origSend;
      return sent;
    });

    const upgradeMsg = result.find(m => m.type === 'place_upgrade');
    assert(upgradeMsg, 'place_upgrade message must be sent');
    assert.strictEqual(upgradeMsg.id, 'garden', 'place_upgrade id must be garden');

    const unlockMsg = result.find(m => m.type === 'place_unlock');
    assert(unlockMsg, 'place_unlock message must be sent');
    assert.strictEqual(unlockMsg.id, 'park', 'place_unlock id must be park');
  });

  // R5: no-console-errors
  await testScenario('R5 no-console-errors', async () => {
    const errs = page.__errors.filter(e =>
      !e.includes('favicon.ico') &&
      !e.includes('Failed to load resource')
    );
    assert.strictEqual(errs.length, 0, 'Console errors encountered: ' + errs.join('; '));
  });

  await browser.close();
  if (server && typeof server.kill === 'function') {
    server.kill();
  } else if (server && typeof server.close === 'function') {
    server.close();
  }

  if (hasFailures) {
    process.exit(1);
  } else {
    console.log('ALL UX-P40-RETIRE TESTS PASSED');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Fatal error in ux-p40-retire:', err);
  process.exit(1);
});
