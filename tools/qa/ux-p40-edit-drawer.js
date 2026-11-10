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
      delete st.emptyEdit;
      delete st.items;
      window.bridge.broadcastState();
      window.CuyPlaces.openPlace(place);
      if (window.CuyEdit) {
        if (window.CuyEdit.isOpen()) window.CuyEdit.toggle();
        window.CuyEdit.render(st);
      }
    }, initialPlace);
    await page.waitForTimeout(100);
  }

  // E1 button-toggles: Edit shows/hides the drawer, aria-pressed
  await testScenario('E1 button-toggles', async () => {
    await resetMockSeven('salon');

    const editBtn = page.locator('#placesEditBtn');
    await editBtn.waitFor({ state: 'visible', timeout: 3000 });

    let pressed = await editBtn.getAttribute('aria-pressed');
    assert.strictEqual(pressed, 'false', 'Initial aria-pressed must be false');
    let drawerHidden = await page.evaluate(() => {
      const d = document.getElementById('editDrawer');
      return !d || d.hidden || window.getComputedStyle(d).display === 'none';
    });
    assert.strictEqual(drawerHidden, true, 'Drawer must initially be hidden');
    let isOpen = await page.evaluate(() => window.CuyEdit.isOpen());
    assert.strictEqual(isOpen, false, 'CuyEdit.isOpen() must initially be false');

    // Click to open
    await editBtn.click();
    await page.waitForTimeout(50);

    pressed = await editBtn.getAttribute('aria-pressed');
    assert.strictEqual(pressed, 'true', 'aria-pressed must be true after clicking');
    drawerHidden = await page.evaluate(() => {
      const d = document.getElementById('editDrawer');
      return !d || d.hidden || window.getComputedStyle(d).display === 'none';
    });
    assert.strictEqual(drawerHidden, false, 'Drawer must be visible after clicking');
    isOpen = await page.evaluate(() => window.CuyEdit.isOpen());
    assert.strictEqual(isOpen, true, 'CuyEdit.isOpen() must be true after clicking');

    // Click to close
    await editBtn.click();
    await page.waitForTimeout(50);

    pressed = await editBtn.getAttribute('aria-pressed');
    assert.strictEqual(pressed, 'false', 'aria-pressed must be false after closing');
    drawerHidden = await page.evaluate(() => {
      const d = document.getElementById('editDrawer');
      return !d || d.hidden || window.getComputedStyle(d).display === 'none';
    });
    assert.strictEqual(drawerHidden, true, 'Drawer must be hidden after closing');
    isOpen = await page.evaluate(() => window.CuyEdit.isOpen());
    assert.strictEqual(isOpen, false, 'CuyEdit.isOpen() must be false after closing');
  });

  // E2 indoor-only-in-room and outdoor-only-in-garden: item lists differ, no id appears in both
  await testScenario('E2 indoor-only-in-room and outdoor-only-in-garden', async () => {
    await resetMockSeven('salon');

    const editBtn = page.locator('#placesEditBtn');
    if (!(await page.evaluate(() => window.CuyEdit.isOpen()))) {
      await editBtn.click();
      await page.waitForTimeout(50);
    }

    const salonCards = page.locator('#editDrawer .edit-card');
    const salonCount = await salonCards.count();
    assert(salonCount > 0, `Expected salon cards in drawer, got ${salonCount}`);
    const salonCardIds = await page.$$eval('#editDrawer .edit-card', cards => cards.map(c => c.getAttribute('data-id')));
    const salonApiItems = await page.evaluate(() => window.CuyEdit.itemsFor(window.bridge.getState(), 'salon'));
    assert(salonApiItems.length > 0, 'salon itemsFor must be non-empty');
    for (const it of salonApiItems) {
      assert.strictEqual(it.kind, 'indoor', `Item ${it.id} in salon must be indoor, got ${it.kind}`);
    }

    // Switch to garden
    await page.evaluate(() => {
      window.CuyPlaces.openPlace('garden');
    });
    await page.waitForTimeout(100);

    const gardenCards = page.locator('#editDrawer .edit-card');
    const gardenCount = await gardenCards.count();
    assert(gardenCount > 0, `Expected garden cards in drawer, got ${gardenCount}`);
    const gardenCardIds = await page.$$eval('#editDrawer .edit-card', cards => cards.map(c => c.getAttribute('data-id')));
    const gardenApiItems = await page.evaluate(() => window.CuyEdit.itemsFor(window.bridge.getState(), 'garden'));
    assert(gardenApiItems.length > 0, 'garden itemsFor must be non-empty');
    for (const it of gardenApiItems) {
      assert.strictEqual(it.kind, 'outdoor', `Item ${it.id} in garden must be outdoor, got ${it.kind}`);
    }

    // Item lists differ
    assert.notDeepStrictEqual(salonCardIds, gardenCardIds, 'Salon and garden card lists must differ');

    // No id appears in both
    const salonSet = new Set(salonCardIds);
    const overlap = gardenCardIds.filter(id => salonSet.has(id));
    assert.strictEqual(overlap.length, 0, `No id should appear in both indoor and outdoor lists, overlap: ${overlap.join(', ')}`);
  });

  // E3 empty-state
  await testScenario('E3 empty-state', async () => {
    await resetMockSeven('salon');

    if (!(await page.evaluate(() => window.CuyEdit.isOpen()))) {
      await page.locator('#placesEditBtn').click();
      await page.waitForTimeout(50);
    }

    // Simulate empty state
    await page.evaluate(() => {
      const st = window.bridge.currentState || window.bridge.getState();
      st.emptyEdit = true;
      window.CuyEdit.render(st);
    });
    await page.waitForTimeout(50);

    const emptyText = await page.evaluate(() => {
      const emptyEl = document.querySelector('#editDrawer .edit-drawer-empty');
      return emptyEl ? emptyEl.textContent.trim() : '';
    });
    assert.strictEqual(emptyText, 'Nothing to place yet', `Expected "Nothing to place yet", got: "${emptyText}"`);

    const cardCount = await page.locator('#editDrawer .edit-card').count();
    assert.strictEqual(cardCount, 0, 'No cards should be visible in empty state');

    // Restore state
    await page.evaluate(() => {
      const st = window.bridge.currentState || window.bridge.getState();
      delete st.emptyEdit;
      window.CuyEdit.render(st);
    });
    await page.waitForTimeout(50);
  });

  // E4 esc-closes
  await testScenario('E4 esc-closes', async () => {
    await resetMockSeven('salon');

    if (!(await page.evaluate(() => window.CuyEdit.isOpen()))) {
      await page.locator('#placesEditBtn').click();
      await page.waitForTimeout(50);
    }
    assert.strictEqual(await page.evaluate(() => window.CuyEdit.isOpen()), true);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(50);

    const isOpen = await page.evaluate(() => window.CuyEdit.isOpen());
    assert.strictEqual(isOpen, false, 'CuyEdit.isOpen() must be false after Escape');

    const drawerHidden = await page.evaluate(() => {
      const d = document.getElementById('editDrawer');
      return !d || d.hidden || window.getComputedStyle(d).display === 'none';
    });
    assert.strictEqual(drawerHidden, true, 'Drawer must be hidden after Escape');

    const pressed = await page.locator('#placesEditBtn').getAttribute('aria-pressed');
    assert.strictEqual(pressed, 'false', 'aria-pressed must be false after Escape');
  });

  // E5 no-modal: opening the drawer creates no modal/overlay
  await testScenario('E5 no-modal', async () => {
    await resetMockSeven('salon');

    if (!(await page.evaluate(() => window.CuyEdit.isOpen()))) {
      await page.locator('#placesEditBtn').click();
      await page.waitForTimeout(50);
    }

    const isBackdropActive = await page.isVisible('#modalBackdrop.active');
    assert.strictEqual(isBackdropActive, false, 'Modal backdrop must not be active when drawer opens');

    const backdropDisplay = await page.evaluate(() => {
      const mb = document.getElementById('modalBackdrop');
      return mb ? window.getComputedStyle(mb).display : 'none';
    });
    assert.strictEqual(backdropDisplay, 'none', 'Modal backdrop display must be none when drawer opens');

    const activeModals = await page.$$('.modal.active, .modal-backdrop.active');
    assert.strictEqual(activeModals.length, 0, 'No modal dialog should be active when drawer opens');

    const canvasVisible = await page.isVisible('#pigCanvas');
    assert.strictEqual(canvasVisible, true, 'Pig canvas must remain visible when drawer opens');
  });

  // E6 library-icons: every card icon is an img with a src that returns 200, none a text glyph
  await testScenario('E6 library-icons', async () => {
    await resetMockSeven('salon');

    if (!(await page.evaluate(() => window.CuyEdit.isOpen()))) {
      await page.locator('#placesEditBtn').click();
      await page.waitForTimeout(50);
    }

    const cards = page.locator('#editDrawer .edit-card');
    const totalCards = await cards.count();
    assert(totalCards > 0, `Expected item cards in drawer, got ${totalCards}`);

    for (let i = 0; i < totalCards; i++) {
      const card = cards.nth(i);
      const img = card.locator('img.edit-card-icon');
      const imgCount = await img.count();
      assert.strictEqual(imgCount, 1, `Card #${i} must have exactly one img.edit-card-icon`);

      const rawSrc = await img.getAttribute('src');
      assert(rawSrc && rawSrc.length > 0, `Card #${i} icon missing src`);

      const fullUrl = await img.evaluate(el => el.src);
      assert(fullUrl && fullUrl.startsWith('http'), `Card #${i} fullUrl must be HTTP URL, got: "${fullUrl}"`);

      // Verify no text glyph in icon wrap
      const wrapText = await card.locator('.edit-card-icon-wrap').innerText();
      assert.strictEqual(wrapText.trim(), '', `Card #${i} icon wrap must not contain text glyphs, got "${wrapText}"`);

      // Check request returns 200
      const resp = await page.request.get(fullUrl);
      assert.strictEqual(resp.status(), 200, `Card #${i} icon URL "${fullUrl}" returned HTTP ${resp.status()}`);
    }
  });

  await browser.close();
  if (server && typeof server.kill === 'function') {
    server.kill();
  }

  if (hasFailures) {
    process.exit(1);
  } else {
    console.log('ALL UX-P40-EDIT-DRAWER TESTS PASSED');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Fatal error in ux-p40-edit-drawer:', err);
  process.exit(1);
});
