'use strict';
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

  // C1: no-arrows-in-windows
  // Open Rooms, Garden, Farm, Market, Album, Shop from More:
  // none contains .places-arrow or any element with class matching arrow that switches places.
  // C5: no-console-errors is checked across all window openings.
  await testScenario('C1 no-arrows-in-windows', async () => {
    const windows = [
      { title: 'Rooms', expectedSelector: '.room-panel' },
      { title: 'Garden', expectedSelector: '.garden-panel' },
      { title: 'Farm', expectedSelector: '.farm-panel' },
      { title: 'Market', expectedSelector: '.market-panel' },
      { title: 'Album', expectedSelector: '.album-modal, .album-panel, [data-feature="album"]' },
      { title: 'Shop', expectedSelector: '.shop-panel, .shop-modal, [data-feature="shop"]' }
    ];

    for (const w of windows) {
      page.__errors = [];
      await ux.openMore(page);
      await ux.openFromMore(page, w.title);
      await page.waitForTimeout(300);

      // Check that .places-arrow or .place-arrow does not exist
      const placeArrows = await page.$$eval(
        '#modalBody .places-arrow, #modalBody .place-arrow, #modalBody [class*="place-arrow"], #modalBody [class*="places-arrow"]',
        els => els.length
      );
      if (placeArrows > 0) {
        throw new Error(`Window ${w.title} contains ${placeArrows} place-arrow elements`);
      }

      // Check all elements with class matching 'arrow'
      const arrowClasses = await page.$$eval('#modalBody [class*="arrow"]', els =>
        els.map(el => el.className).filter(cls => /\barrow\b|place-arrow|places-arrow/.test(cls))
      );
      if (arrowClasses.length > 0) {
        throw new Error(`Window ${w.title} contains elements matching arrow switcher: ${arrowClasses.join(', ')}`);
      }

      if (page.__errors.length > 0) {
        throw new Error(`Console errors while opening ${w.title}: ${page.__errors.join('; ')}`);
      }

      await ux.closeModal(page);
      await page.waitForTimeout(200);
    }
  });

  // C2: no-plan
  // No element or script for the house plan exists (#roomPlanBtn, plan.js not loaded)
  await testScenario('C2 no-plan', async () => {
    page.__errors = [];
    await ux.openMore(page);
    await ux.openFromMore(page, 'Rooms');
    await page.waitForSelector('.room-panel', { timeout: 3000 });

    const planBtn = await page.$('#roomPlanBtn');
    if (planBtn) {
      throw new Error('House plan button #roomPlanBtn still exists');
    }

    const planScript = await page.$('script[src*="plan.js"]');
    if (planScript) {
      throw new Error('plan.js script tag found in DOM');
    }

    const planCss = await page.$('link[href*="plan.css"]');
    if (planCss) {
      throw new Error('plan.css link tag found in DOM');
    }

    const hasHousePlan = await page.evaluate(() => typeof window.HousePlan !== 'undefined');
    if (hasHousePlan) {
      throw new Error('window.HousePlan is defined');
    }

    await ux.closeModal(page);
  });

  // C3: rooms-tabs-still-work
  // In the Rooms window clicking a room tab changes the shown room name.
  await testScenario('C3 rooms-tabs-still-work', async () => {
    page.__errors = [];
    await ux.openMore(page);
    await ux.openFromMore(page, 'Rooms');
    await page.waitForSelector('.room-panel', { timeout: 3000 });
    await page.waitForTimeout(400);

    const count = await page.$$eval('.room-tabs .room-tab', els => els.length);
    if (count < 2) {
      throw new Error(`Expected at least 2 room tabs, found ${count}`);
    }

    // Get current room name
    const initialName = await page.$eval('.room-title.room-name-btn', el => el.textContent.trim());

    // Click the second tab by selector
    await page.click('.room-tabs .room-tab:nth-child(2)');
    await page.waitForTimeout(300);

    const newName = await page.$eval('.room-title.room-name-btn', el => el.textContent.trim());
    if (newName === initialName) {
      throw new Error(`Room name did not change after tab click. Was "${initialName}", still "${newName}"`);
    }

    // Click back to first tab
    await page.click('.room-tabs .room-tab:nth-child(1)');
    await page.waitForTimeout(300);

    const revertedName = await page.$eval('.room-title.room-name-btn', el => el.textContent.trim());
    if (revertedName !== initialName) {
      throw new Error(`Reverting to first tab failed. Expected "${initialName}", got "${revertedName}"`);
    }

    await ux.closeModal(page);
  });

  // C4: decorate-still-works
  // Verify opening Decorate window works without error
  await testScenario('C4 decorate-still-works', async () => {
    page.__errors = [];
    await ux.openMore(page);
    await ux.openFromMore(page, 'Decorate');
    await page.waitForSelector('#modalBody [data-feature="decor"], #modalBody .decor-panel, #modalBody .decor-list', { timeout: 3000 });
    await ux.closeModal(page);
  });

  // C5: no-console-errors
  await testScenario('C5 no-console-errors', async () => {
    if (page.__errors.length > 0) {
      throw new Error('Leftover page errors: ' + page.__errors.join('; '));
    }
  });

  await browser.close();
  server.close();

  if (hasFailures) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal test error: ' + err.message);
  process.exit(1);
});
